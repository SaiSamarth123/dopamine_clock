/**
 * Memento — background service worker
 * Syncs distractor redirect rules, extension badge, and authoritative timer completion.
 */

importScripts("shared.cjs");

const S = globalThis.MementoShared;

const CONFIG_KEY = "mementoConfig";
const MICRO_KEY = "mementoMicroTimer";
const FOCUS_STATS_KEY = "mementoFocusStats";
const FRICTION_BYPASS_KEY = "mementoFrictionBypass";
const FRICTION_RULE_IDS_KEY = "mementoFrictionRuleIds";
const KNOWLEDGE_UNLOCK_KEY = "mementoKnowledgeUnlock";

const BLOCK_RULE_ID_START = 1000;
const BLOCK_RULE_ID_MAX = 1999;
const ALLOW_RULE_ID_START = 2000;
const ALLOW_RULE_ID_MAX = 2999;
const BADGE_ALARM = "memento-badge-tick";
const BYPASS_MS = 60 * 60 * 1000;

let lastFrictionSyncError = null;

async function readStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function readBypassMap() {
  const result = await chrome.storage.local.get(FRICTION_BYPASS_KEY);
  const map = result[FRICTION_BYPASS_KEY];
  return map && typeof map === "object" ? map : {};
}

async function readRuleIdRegistry() {
  const result = await chrome.storage.local.get(FRICTION_RULE_IDS_KEY);
  const reg = result[FRICTION_RULE_IDS_KEY];
  return reg && typeof reg === "object" ? { ...reg } : {};
}

async function saveRuleIdRegistry(registry) {
  await chrome.storage.local.set({ [FRICTION_RULE_IDS_KEY]: registry });
}

async function pruneBypassMap() {
  const map = await readBypassMap();
  const now = Date.now();
  let changed = false;
  for (const host of Object.keys(map)) {
    if (map[host] <= now) {
      delete map[host];
      changed = true;
    }
  }
  if (changed) {
    await chrome.storage.local.set({ [FRICTION_BYPASS_KEY]: map });
  }
  return map;
}

async function pruneRuleIdRegistry(activeBypassHosts) {
  const registry = await readRuleIdRegistry();
  const activeSet = new Set(activeBypassHosts);
  let changed = false;
  for (const host of Object.keys(registry)) {
    if (!activeSet.has(host)) {
      delete registry[host];
      changed = true;
    }
  }
  if (changed) await saveRuleIdRegistry(registry);
  return registry;
}

/** Stable monotonic allow-rule IDs — no hash collisions. */
async function allowRuleIdForHost(host) {
  const registry = await readRuleIdRegistry();
  if (registry[host] != null) return registry[host];

  const used = new Set(Object.values(registry));
  for (let id = ALLOW_RULE_ID_START; id <= ALLOW_RULE_ID_MAX; id++) {
    if (!used.has(id)) {
      registry[host] = id;
      await saveRuleIdRegistry(registry);
      return id;
    }
  }
  throw new Error("Memento allow-rule ID pool exhausted");
}

async function upsertAllowRule(host) {
  const normalized = S.normalizeHost(host);
  if (!normalized) return false;

  const id = await allowRuleIdForHost(normalized);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.filter((r) => r.id === id).map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules: [
      {
        id,
        priority: 100,
        action: { type: "allow" },
        condition: {
          requestDomains: [normalized],
          resourceTypes: ["main_frame"],
        },
      },
    ],
  });
  return true;
}

async function handleFrictionBypass(host, tabId, targetUrl) {
  const normalized = S.normalizeHost(host);
  if (!normalized || !tabId || !targetUrl) return false;

  const map = await pruneBypassMap();
  map[normalized] = Date.now() + BYPASS_MS;
  await chrome.storage.local.set({ [FRICTION_BYPASS_KEY]: map });

  await upsertAllowRule(normalized);
  await syncDistractorRules();

  await chrome.tabs.update(tabId, { url: targetUrl });
  return true;
}

async function updateBadgeFromMicro(micro) {
  const remaining = S.getMicroRemaining(micro);
  const text = S.shouldShowBadge(micro, remaining) ? S.formatBadgeText(remaining) : "";

  await chrome.action.setBadgeText({ text });
  if (text) {
    await chrome.action.setBadgeBackgroundColor({ color: "#ff6b35" });
    if (chrome.action.setBadgeTextColor) {
      await chrome.action.setBadgeTextColor({ color: "#ffffff" });
    }
  }
}

async function scheduleBadgeAlarm() {
  await chrome.alarms.clear(BADGE_ALARM);
  await chrome.alarms.create(BADGE_ALARM, { when: Date.now() + 1000 });
}

async function clearBadgeAlarm() {
  await chrome.alarms.clear(BADGE_ALARM);
}

async function applyCompletionSideEffects(completedMicro) {
  if (!completedMicro?.completedAt) return;

  const result = await readStorage([FOCUS_STATS_KEY, CONFIG_KEY]);
  const rawStats = result[FOCUS_STATS_KEY];
  const mission = result[CONFIG_KEY]?.mission?.trim() || "";

  const stats = S.normalizeFocusStats(rawStats);
  if (!S.shouldRecordCompletion(stats, completedMicro.completedAt)) {
    return;
  }

  const next = S.applyFocusSessionComplete(stats, {
    presetSeconds: completedMicro.presetSeconds ?? S.PRESET_DEEP_WORK_SEC,
    completedAt: completedMicro.completedAt,
    mission,
  });

  await chrome.storage.local.set({ [FOCUS_STATS_KEY]: next });

  const today = S.todayISO();
  const unlock = result[KNOWLEDGE_UNLOCK_KEY];
  if (unlock !== today) {
    await chrome.storage.local.set({ [KNOWLEDGE_UNLOCK_KEY]: today });
  }
}

async function finalizeExpiredMicro(micro) {
  if (!S.isMicroExpired(micro)) return micro;

  const completed = S.buildCompletedMicro(micro);
  await chrome.storage.local.set({ [MICRO_KEY]: completed });
  await applyCompletionSideEffects(completed);
  return completed;
}

async function refreshBadge() {
  const result = await readStorage(MICRO_KEY);
  let micro = result[MICRO_KEY];
  if (micro) {
    micro = await finalizeExpiredMicro(micro);
  }

  await updateBadgeFromMicro(micro);

  const remaining = S.getMicroRemaining(micro);
  if (S.shouldShowBadge(micro, remaining)) {
    await scheduleBadgeAlarm();
  } else {
    await clearBadgeAlarm();
  }
}

async function getActiveBypassHosts() {
  const bypass = await pruneBypassMap();
  const now = Date.now();
  return Object.keys(bypass).filter((host) => bypass[host] > now);
}

async function collectFrictionSites(friction) {
  if (!friction?.enabled) return [];
  const sites = new Set();
  for (const entry of (friction.sites || []).slice(0, S.MAX_FRICTION_SITES)) {
    const host = S.normalizeHost(entry);
    if (host) sites.add(host);
  }

  const bypassed = await getActiveBypassHosts();
  const bypassSet = new Set(bypassed);
  for (const host of [...sites]) {
    if (bypassSet.has(host)) sites.delete(host);
  }

  return [...sites].sort();
}

async function syncDistractorRules() {
  lastFrictionSyncError = null;
  const result = await readStorage(CONFIG_KEY);
  const config = result[CONFIG_KEY];
  const friction = config?.distractorFriction;
  const hosts = await collectFrictionSites(friction);
  const bypassed = await getActiveBypassHosts();
  const registry = await pruneRuleIdRegistry(bypassed);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing
    .filter(
      (r) =>
        (r.id >= BLOCK_RULE_ID_START && r.id <= BLOCK_RULE_ID_MAX) ||
        (r.id >= ALLOW_RULE_ID_START && r.id <= ALLOW_RULE_ID_MAX)
    )
    .map((r) => r.id);

  const addRules = [];

  for (const host of bypassed) {
    const id = registry[host];
    if (id == null) continue;
    addRules.push({
      id,
      priority: 100,
      action: { type: "allow" },
      condition: {
        requestDomains: [host],
        resourceTypes: ["main_frame"],
      },
    });
  }

  if (hosts.length) {
    const delay = Math.min(60, Math.max(3, friction?.delaySeconds ?? 10));
    const blockBase = chrome.runtime.getURL("block.html");

    for (const [i, host] of hosts.entries()) {
      addRules.push({
        id: BLOCK_RULE_ID_START + i,
        priority: 1,
        action: {
          type: "redirect",
          redirect: {
            url: `${blockBase}?host=${encodeURIComponent(host)}&delay=${delay}`,
          },
        },
        condition: {
          requestDomains: [host],
          resourceTypes: ["main_frame"],
        },
      });
    }
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: removeIds,
    addRules,
  });
}

async function syncAll() {
  try {
    await syncDistractorRules();
  } catch (err) {
    lastFrictionSyncError = err?.message || String(err);
    console.error("Memento friction sync failed:", err);
  }
  try {
    await refreshBadge();
  } catch (err) {
    console.error("Memento badge sync failed:", err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncAll().catch((err) => console.error("Memento install sync failed:", err));
});

chrome.runtime.onStartup.addListener(() => {
  syncAll().catch((err) => console.error("Memento startup sync failed:", err));
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[CONFIG_KEY] || changes[MICRO_KEY] || changes[FRICTION_BYPASS_KEY]) {
    syncAll().catch((err) => console.error("Memento storage sync failed:", err));
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== BADGE_ALARM) return;
  refreshBadge().catch((err) => console.error("Memento badge tick failed:", err));
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "mementoSync") {
    syncAll()
      .then(() => sendResponse({ ok: true, frictionError: lastFrictionSyncError }))
      .catch((err) => {
        console.error("Memento sync message failed:", err);
        sendResponse({ ok: false, frictionError: err?.message });
      });
    return true;
  }

  if (message.type === "frictionBypass") {
    const tabId = sender.tab?.id;
    const targetUrl = message.targetUrl || S.targetUrlForHost(message.host);
    handleFrictionBypass(message.host, tabId, targetUrl)
      .then((ok) => sendResponse({ ok }))
      .catch((err) => {
        console.error("Memento friction bypass failed:", err);
        sendResponse({ ok: false });
      });
    return true;
  }

  if (message.type === "mementoRefreshBadge") {
    refreshBadge()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("Memento badge refresh failed:", err);
        sendResponse({ ok: false });
      });
    return true;
  }

  if (message.type === "mementoGetFrictionError") {
    sendResponse({ error: lastFrictionSyncError });
    return false;
  }
});

syncAll().catch((err) => console.error("Memento initial sync failed:", err));

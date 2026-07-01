/**
 * Memento — background service worker
 * Manages the extension badge and authoritative focus-timer completion.
 */

importScripts("shared.js");

const S = globalThis.MementoShared;

const CONFIG_KEY = "mementoConfig";
const MICRO_KEY = "mementoMicroTimer";
const FOCUS_STATS_KEY = "mementoFocusStats";
const KNOWLEDGE_UNLOCK_KEY = "mementoKnowledgeUnlock";
const BADGE_ALARM = "memento-badge-tick";

async function readStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function updateBadgeFromMicro(micro) {
  const remaining = S.getMicroRemaining(micro);
  const text = S.shouldShowBadge(micro, remaining)
    ? S.formatBadgeText(remaining)
    : "";

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

async function syncAll() {
  try {
    await refreshBadge();
  } catch (err) {
    console.error("Memento badge sync failed:", err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncAll().catch((err) =>
    console.error("Memento install sync failed:", err),
  );
});

chrome.runtime.onStartup.addListener(() => {
  syncAll().catch((err) =>
    console.error("Memento startup sync failed:", err),
  );
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes[MICRO_KEY]) {
    refreshBadge().catch((err) =>
      console.error("Memento storage sync failed:", err),
    );
  }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== BADGE_ALARM) return;
  refreshBadge().catch((err) =>
    console.error("Memento badge tick failed:", err),
  );
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") return;

  if (message.type === "mementoSync" || message.type === "mementoRefreshBadge") {
    syncAll()
      .then(() => sendResponse({ ok: true }))
      .catch((err) => {
        console.error("Memento badge refresh failed:", err);
        sendResponse({ ok: false });
      });
    return true;
  }
});

syncAll().catch((err) => console.error("Memento initial sync failed:", err));

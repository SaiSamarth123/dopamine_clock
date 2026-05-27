/**
 * Memento — Universal productivity gatekeeper
 * Chrome Extension New Tab override
 */

const S = globalThis.MementoShared;

/* ==========================================================================
   1. Constants & defaults
   ========================================================================== */

const CONFIG_KEY = "mementoConfig";
const LEGACY_CONFIG_KEY = "dopamineClockConfig";
const MICRO_KEY = "mementoMicroTimer";
const KNOWLEDGE_UNLOCK_KEY = "mementoKnowledgeUnlock";
const INTENTIONAL_BROWSE_KEY = "mementoIntentionalBrowseUntil";
const FRICTION_BYPASS_KEY = "mementoFrictionBypass";
const FOCUS_STATS_KEY = "mementoFocusStats";
const SEEN_LEDGER_KEY = "mementoSeenInsights";
const SIGNAL_VECTOR_KEY = "mementoSignalVector";
const LEDGER_MAX = 500;
const DEVTO_ENDPOINT = "https://dev.to/api/articles";

const MS_SECOND = 1000;
const MS_MINUTE = 60 * MS_SECOND;
const MS_HOUR = 60 * MS_MINUTE;
const MS_DAY = 24 * MS_HOUR;
const MS_YEAR = 365.25 * MS_DAY;
const MS_MONTH = MS_YEAR / 12;

const DRIFT_GRACE_MS = 45_000;
const MIN_STREAK_SESSION_SEC = S.MIN_STREAK_SESSION_SEC;
const MAX_FRICTION_SITES = S.MAX_FRICTION_SITES;
const CONFIG_VERSION = S.CONFIG_VERSION;
const TICKER_CHANNEL = "memento-ticker";
const LIFE_GRID_COLS = 40;
const LIFE_GRID_ROWS = 15;
const LIFE_GRID_DOTS = LIFE_GRID_COLS * LIFE_GRID_ROWS;

const PRESETS = {
  deepWork: 25 * 60,
  extremeFocus: 50 * 60,
  resetBreak: 5 * 60,
};

const INTENTIONAL_BROWSE_MS = PRESETS.resetBreak * MS_SECOND;

const THEME_PRESETS = {
  memento: {
    name: "Memento",
    colors: { bg: "#000000", text: "#f5f5f5", accent: "#ff6b35", accentCrimson: "#e63946" },
  },
  midnight: {
    name: "Midnight",
    colors: { bg: "#0a0e17", text: "#e8edf5", accent: "#5b9fd4", accentCrimson: "#7eb8ff" },
  },
  forest: {
    name: "Forest",
    colors: { bg: "#0d1210", text: "#e6efe8", accent: "#4ade80", accentCrimson: "#22c55e" },
  },
  ember: {
    name: "Ember",
    colors: { bg: "#14100c", text: "#f5ebe0", accent: "#f59e0b", accentCrimson: "#ef4444" },
  },
  slate: {
    name: "Slate",
    colors: { bg: "#111318", text: "#e2e4e9", accent: "#94a3b8", accentCrimson: "#cbd5e1" },
  },
  paper: {
    name: "Paper",
    colors: { bg: "#f7f5f0", text: "#1a1a1a", accent: "#c2410c", accentCrimson: "#dc2626" },
  },
};

const FONT_PRESETS = {
  system: {
    name: "System",
    font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontMono: 'ui-monospace, "SF Mono", Menlo, monospace',
  },
  serif: {
    name: "Editorial",
    font: 'Georgia, "Times New Roman", serif',
    fontMono: 'Georgia, "Times New Roman", serif',
  },
  mono: {
    name: "Terminal",
    font: 'ui-monospace, "SF Mono", Menlo, monospace',
    fontMono: 'ui-monospace, "SF Mono", Menlo, monospace',
  },
  inter: {
    name: "Inter",
    font: '"Inter", ui-sans-serif, system-ui, sans-serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
  },
  space: {
    name: "Space",
    font: '"Space Grotesk", ui-sans-serif, sans-serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
  },
};

const DEFAULT_CUSTOMIZE = {
  themeId: "memento",
  font: "system",
  colors: {
    bg: "#000000",
    text: "#f5f5f5",
    accent: "#ff6b35",
    accentCrimson: "#e63946",
  },
  sound: "chime",
  showMilliseconds: true,
  macroClockShowLabels: true,
  macroClockDecimalFormat: false,
  hourlyWorth: 50,
  ambientFocus: false,
  sections: {
    macro: true,
    micro: true,
    jolt: true,
    mission: true,
    knowledge: true,
  },
};

const DEFAULT_WORK_DAY_END = "18:00";

const DEFAULT_FRICTION_DELAY_SEC = 10;

const DISTRACTOR_PRESETS = [
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "reddit", label: "Reddit", hosts: ["reddit.com", "old.reddit.com"] },
  { id: "x", label: "X / Twitter", hosts: ["twitter.com", "x.com"] },
  { id: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { id: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com"] },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { id: "netflix", label: "Netflix", hosts: ["netflix.com"] },
  { id: "twitch", label: "Twitch", hosts: ["twitch.tv"] },
];

const DEFAULT_DISTRACTOR_FRICTION = {
  enabled: false,
  delaySeconds: DEFAULT_FRICTION_DELAY_SEC,
  sites: ["youtube.com", "reddit.com", "x.com"],
};

const DEFAULT_CONFIG = {
  configVersion: CONFIG_VERSION,
  setupComplete: false,
  birthDate: null,
  lifeExpectancy: 80,
  workDayEndTime: DEFAULT_WORK_DAY_END,
  mission: "",
  distractorFriction: { ...DEFAULT_DISTRACTOR_FRICTION, sites: [...DEFAULT_DISTRACTOR_FRICTION.sites] },
  customize: { ...DEFAULT_CUSTOMIZE, sections: { ...DEFAULT_CUSTOMIZE.sections } },
};

function normalizeConfig(cfg) {
  const merged = { ...DEFAULT_CONFIG, ...cfg };
  const life = parseFloat(merged.lifeExpectancy);
  merged.lifeExpectancy =
    Number.isFinite(life) && life > 0
      ? S.clamp(Math.floor(life), 1, 130)
      : DEFAULT_CONFIG.lifeExpectancy;
  merged.configVersion = CONFIG_VERSION;
  merged.workDayEndTime = S.parseWorkDayEndTime(merged.workDayEndTime).iso;
  merged.setupComplete = !!merged.setupComplete;
  if (merged.birthDate != null && merged.birthDate !== "") {
    merged.birthDate = String(merged.birthDate).trim().slice(0, 10);
  } else {
    merged.birthDate = null;
  }
  const c = cfg.customize || {};
  merged.customize = {
    ...DEFAULT_CUSTOMIZE,
    ...c,
    colors: { ...DEFAULT_CUSTOMIZE.colors, ...(c.colors || {}) },
    sections: { ...DEFAULT_CUSTOMIZE.sections, ...(c.sections || {}) },
    hourlyWorth:
      typeof c.hourlyWorth === "number" && c.hourlyWorth >= 0
        ? c.hourlyWorth
        : DEFAULT_CUSTOMIZE.hourlyWorth,
    ambientFocus: !!c.ambientFocus,
    macroClockShowLabels: c.macroClockShowLabels !== false,
    macroClockDecimalFormat: c.macroClockDecimalFormat === true,
    themeId:
      c.themeId === "custom" || THEME_PRESETS[c.themeId]
        ? c.themeId
        : DEFAULT_CUSTOMIZE.themeId,
    font: FONT_PRESETS[c.font] ? c.font : DEFAULT_CUSTOMIZE.font,
  };
  merged.distractorFriction = normalizeDistractorFriction(cfg.distractorFriction);
  return merged;
}

function normalizeDistractorHost(raw) {
  return S.normalizeHost(raw);
}

let frictionSitesTruncated = false;

function normalizeDistractorFriction(friction) {
  const out = S.normalizeDistractorFriction(friction, DEFAULT_DISTRACTOR_FRICTION.sites);
  frictionSitesTruncated = !!out.truncated;
  const { truncated, ...frictionOut } = out;
  return frictionOut;
}

function updateFrictionSiteWarning() {
  if (!dom.frictionSiteWarning) return;
  const truncated = frictionSitesTruncated;
  if (truncated) {
    dom.frictionSiteWarning.hidden = false;
    dom.frictionSiteWarning.textContent = `Only the first ${MAX_FRICTION_SITES} sites are used.`;
  } else {
    dom.frictionSiteWarning.hidden = true;
  }
}

function hostsForPreset(presetId) {
  const preset = DISTRACTOR_PRESETS.find((p) => p.id === presetId);
  return preset ? [...preset.hosts] : [];
}

function isPresetFullySelected(presetId, siteSet) {
  const hosts = hostsForPreset(presetId);
  return hosts.length > 0 && hosts.every((h) => siteSet.has(h));
}

const DEFAULT_MICRO = {
  status: "idle",
  presetSeconds: PRESETS.deepWork,
  remainingMs: PRESETS.deepWork * MS_SECOND,
  endTimestamp: null,
  completedAt: null,
};

const DEFAULT_FOCUS_STATS = { ...S.DEFAULT_FOCUS_STATS };

/* ==========================================================================
   2. Storage helpers
   ========================================================================== */

function hasChromeStorage() {
  return typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;
}

function storageGet(keys) {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.local.get(keys, resolve);
      return;
    }
    const out = {};
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) out[key] = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
    resolve(out);
  });
}

function storageSet(payload) {
  return new Promise((resolve, reject) => {
    if (hasChromeStorage()) {
      chrome.storage.local.set(payload, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
      return;
    }
    try {
      for (const [key, value] of Object.entries(payload)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

function storageRemove(key) {
  return new Promise((resolve) => {
    if (hasChromeStorage()) {
      chrome.storage.local.remove(key, resolve);
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    resolve();
  });
}

async function loadConfig() {
  const result = await storageGet([CONFIG_KEY, LEGACY_CONFIG_KEY]);
  if (result[CONFIG_KEY]) {
    const cfg = normalizeConfig(result[CONFIG_KEY]);
    if (result[CONFIG_KEY].configVersion !== CONFIG_VERSION) {
      await saveConfig(cfg);
    }
    return cfg;
  }
  if (result[LEGACY_CONFIG_KEY]) {
    const migrated = normalizeConfig(migrateLegacyConfig(result[LEGACY_CONFIG_KEY]));
    await saveConfig(migrated);
    await storageRemove(LEGACY_CONFIG_KEY);
    return migrated;
  }
  return normalizeConfig({ ...DEFAULT_CONFIG });
}

async function saveConfig(cfg) {
  await storageSet({ [CONFIG_KEY]: cfg });
  notifyBackground("mementoSync");
}

async function loadMicro() {
  const result = await storageGet(MICRO_KEY);
  return result[MICRO_KEY] ? { ...DEFAULT_MICRO, ...result[MICRO_KEY] } : { ...DEFAULT_MICRO };
}

function notifyBackground(type, payload = {}) {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) return;
  try {
    chrome.runtime.sendMessage({ type, ...payload }, (response) => {
      if (chrome.runtime.lastError) {
        showExtensionContextWarning();
        return;
      }
      if (response?.frictionError) {
        showFrictionSyncError(response.frictionError);
      }
    });
  } catch {
    showExtensionContextWarning();
  }
}

function showExtensionContextWarning() {
  if (!dom.extensionWarning) return;
  dom.extensionWarning.hidden = false;
  dom.extensionWarning.textContent =
    "Extension was reloaded — refresh this tab to sync timer and site rules.";
}

function showFrictionSyncError(msg) {
  if (!msg || !dom.frictionSyncError) return;
  dom.frictionSyncError.hidden = false;
  dom.frictionSyncError.textContent = `Could not update site rules: ${msg}`;
}

async function saveMicro(micro) {
  await storageSet({ [MICRO_KEY]: micro });
  notifyBackground("mementoSync");
}

/* ==========================================================================
   3. Migration
   ========================================================================== */

/** Approximate birth date from a whole calendar age (legacy migration). */
function birthDateFromAge(currentAge) {
  const now = new Date();
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - Math.floor(currentAge));
  return d;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function migrateLegacyConfig(legacy) {
  const merged = { ...DEFAULT_CONFIG, setupComplete: !!legacy.setupComplete };

  if (legacy.lifeExpectancy != null) merged.lifeExpectancy = legacy.lifeExpectancy;

  if (legacy.currentAge != null && !Number.isNaN(legacy.currentAge)) {
    merged.birthDate = toISODate(birthDateFromAge(legacy.currentAge));
  }

  return merged;
}

/* ==========================================================================
   4. Date / math utilities
   ========================================================================== */

function clamp(n, min, max) {
  return S.clamp(n, min, max);
}

function pad(n, width) {
  const s = String(Math.floor(Math.abs(n)));
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

function parseBirthDate(iso) {
  return S.parseBirthDate(iso);
}

function deathDateFromBirth(birth, lifeExpectancy) {
  return S.deathDateFromBirth(birth, lifeExpectancy);
}

function calendarAgeFromBirth(birth, now = Date.now()) {
  return S.calendarAgeFromBirth(birth, now);
}

function parseWorkDayEndTime(value) {
  return S.parseWorkDayEndTime(value);
}

function workDayEndTimestamp(now, endHours, endMinutes) {
  const end = new Date(now);
  end.setHours(endHours, endMinutes, 0, 0);
  return end.getTime();
}

/** Milliseconds until today's work-day end (0 if already past). */
function calcTodayHorizon(workDayEndTime, now = Date.now()) {
  const { hours, minutes } = parseWorkDayEndTime(workDayEndTime);
  const endMs = workDayEndTimestamp(now, hours, minutes);
  const remainingMs = Math.max(0, endMs - now);
  return { remainingMs, ended: remainingMs <= 0 };
}

function formatTodayHorizonLabel(horizon) {
  if (horizon.ended) return "0m left today";
  const ms = horizon.remainingMs;
  const h = Math.floor(ms / MS_HOUR);
  const m = Math.floor((ms % MS_HOUR) / MS_MINUTE);
  if (h > 0 && m > 0) return `${h}h ${m}m left today`;
  if (h > 0) return `${h}h left today`;
  if (m > 0) return `${m}m left today`;
  return "<1m left today";
}

function decomposeMs(ms) {
  if (ms <= 0) {
    return { years: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 };
  }
  let rest = ms;
  const years = Math.floor(rest / MS_YEAR);
  rest %= MS_YEAR;
  const days = Math.floor(rest / MS_DAY);
  rest %= MS_DAY;
  const hours = Math.floor(rest / MS_HOUR);
  rest %= MS_HOUR;
  const minutes = Math.floor(rest / MS_MINUTE);
  rest %= MS_MINUTE;
  const seconds = Math.floor(rest / MS_SECOND);
  rest %= MS_SECOND;
  return { years, days, hours, minutes, seconds, ms: rest };
}

/** Breaks milliseconds into Y/M/D/H/M/S using 365.25-day years (display only; not calendar age). */
function decomposeElapsed(ms) {
  if (ms <= 0) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 };
  }
  let rest = ms;
  const years = Math.floor(rest / MS_YEAR);
  rest %= MS_YEAR;
  const months = Math.floor(rest / MS_MONTH);
  rest %= MS_MONTH;
  const days = Math.floor(rest / MS_DAY);
  rest %= MS_DAY;
  const hours = Math.floor(rest / MS_HOUR);
  rest %= MS_HOUR;
  const minutes = Math.floor(rest / MS_MINUTE);
  rest %= MS_MINUTE;
  const seconds = Math.floor(rest / MS_SECOND);
  rest %= MS_SECOND;
  return { years, months, days, hours, minutes, seconds, ms: rest };
}

const MACRO_CLOCK_DECIMAL_PRECISION = {
  years: 6,
  months: 4,
  days: 3,
  hours: 2,
  minutes: 2,
  seconds: 2,
};

function isMacroClockLabelsShown(customize = config.customize) {
  return customize?.macroClockShowLabels !== false;
}

function isMacroClockDecimal(customize = config.customize) {
  return customize?.macroClockDecimalFormat === true;
}

function getMacroClockDecimalParts(elapsed) {
  const ms = decomposeElapsed(elapsed).ms;
  return {
    years: elapsed / MS_YEAR,
    months: elapsed / MS_MONTH,
    days: elapsed / MS_DAY,
    hours: elapsed / MS_HOUR,
    minutes: elapsed / MS_MINUTE,
    seconds: elapsed / MS_SECOND,
    ms,
  };
}

function formatMacroClockUnit(parts, key, decimal) {
  const v = parts[key];
  if (key === "ms") return pad(Math.floor(v), 3);
  if (decimal) {
    return Number(v).toFixed(MACRO_CLOCK_DECIMAL_PRECISION[key] ?? 2);
  }
  return pad(v, 2);
}

function clearMacroClockPrev() {
  for (const key of ["years", "months", "days", "hours", "minutes", "seconds", "ms"]) {
    prev[key] = null;
  }
}

function applyMacroClockPresentation() {
  document.body.classList.toggle("macro-clock-no-labels", !isMacroClockLabelsShown());
  document.body.classList.toggle("macro-clock-decimal", isMacroClockDecimal());
}

function renderMacroClock(macro) {
  const decimal = isMacroClockDecimal();
  const parts = decimal ? getMacroClockDecimalParts(macro.elapsed) : macro.ageParts;

  setText(dom.valYears, formatMacroClockUnit(parts, "years", decimal), "years");
  setText(dom.valMonths, formatMacroClockUnit(parts, "months", decimal), "months");
  setText(dom.valDays, formatMacroClockUnit(parts, "days", decimal), "days");
  setText(dom.valHours, formatMacroClockUnit(parts, "hours", decimal), "hours");
  setText(dom.valMinutes, formatMacroClockUnit(parts, "minutes", decimal), "minutes");
  setText(dom.valSeconds, formatMacroClockUnit(parts, "seconds", decimal), "seconds");

  const showMs = config.customize?.showMilliseconds !== false && !reducedMotion;
  if (showMs && dom.valMs) {
    setText(dom.valMs, formatMacroClockUnit(parts, "ms", decimal), "ms");
  }
}

function formatMicroTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / MS_SECOND));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${pad(s, 2)}`;
}

/* ==========================================================================
   5. Calculation engines
   ========================================================================== */

function calcMacro(birth, death, now = Date.now()) {
  const total = death.getTime() - birth.getTime();
  const elapsed = Math.max(0, now - birth.getTime());
  const remaining = Math.max(0, death.getTime() - now);
  const expiredPct = total > 0 ? clamp((elapsed / total) * 100, 0, 100) : 100;
  const remainingPct = 100 - expiredPct;
  return {
    elapsed,
    remaining,
    expiredPct,
    remainingPct,
    ageParts: decomposeElapsed(elapsed),
    remainingParts: decomposeElapsed(remaining),
  };
}

function getMicroRemaining(micro, now = Date.now()) {
  return S.getMicroRemaining(micro, now);
}

/* ==========================================================================
   6. Behavioral jolts
   ========================================================================== */

const JOLTS = [
  { type: "static", text: "Hyperbolic discounting is tricking your brain right now. Close this tab and build." },
  { type: "static", text: "Your future self is watching. Do not disappoint them today." },
  { type: "static", text: "Loss aversion: you feel losses twice as strongly as gains. Act before you lose the day." },
  { type: "static", text: "The planning fallacy says this will take longer than you think. Start now anyway." },
  { type: "static", text: "Present bias is stealing your decade. One meaningful hour beats ten scrolled hours." },
  { type: "static", text: "Mortality salience is not morbid — it is the most honest productivity tool you have." },
  { type: "static", text: "Every open tab is a micro-bet against your goal. Close. Execute. Repeat." },
  { type: "static", text: "Regret minimization: at 80, you will not wish you had scrolled more." },
  { type: "static", text: "The dopamine hit from distraction is borrowed against tomorrow's focus." },
  { type: "static", text: "Implementation intention beats motivation: name the next physical action and do it." },
  { type: "static", text: "Zeigarnik effect: unfinished work haunts you. Finish one thing before you browse." },
  { type: "static", text: "Parkinson's law will eat your deadline. Start the smallest possible version now." },
  { type: "static", text: "Sunk cost is irrelevant. The only question: what is the best use of the next hour?" },
  { type: "static", text: "Status quo bias is keeping you comfortable and stuck. Disrupt one habit today." },
  { type: "static", text: "Akrasia: you already decided what matters. Your body is just delaying. Move." },
  { type: "static", text: "The mere urgency of a countdown is not stress — it is clarity." },
  { type: "static", text: "Compound interest applies to skills, not just money. Today is a deposit." },
  { type: "static", text: "Second-order consequences: skipping today trains the identity of someone who skips." },
  { type: "static", text: "Temporal discounting makes distant goals feel fake. Make the next 25 minutes real." },
  { type: "static", text: "You are not tired of the work. You are tired of avoiding it." },
  { type: "dynamic", key: "yearsLeft" },
  { type: "dynamic", key: "expired" },
  { type: "dynamic", key: "mission" },
];

function pickJolt(cfg, snapshot) {
  const pool = [...JOLTS];
  for (let i = 0; i < 10; i++) {
    const j = pool[Math.floor(Math.random() * pool.length)];
    if (j.type === "static") return j.text;
    switch (j.key) {
      case "yearsLeft":
        if (snapshot.yearsLeft != null) {
          return `${snapshot.yearsLeft} years of clock remain. That is not abstract. That is now.`;
        }
        break;
      case "expired":
        if (snapshot.expiredPct != null) {
          return `${snapshot.expiredPct.toFixed(1)}% of your expected life is already gone. Spend the rest deliberately.`;
        }
        break;
      case "mission":
        if (cfg.mission) {
          return `Your mission: "${cfg.mission}". The timer is your contract. Honor it.`;
        }
        break;
      default:
        break;
    }
  }
  return JOLTS[0].text;
}

/* ==========================================================================
   6.5 Tri-Node Intelligence Core
   ========================================================================== */

const KNOWLEDGE_ITEMS = [
  {
    id: "world-time-dilation",
    type: "world",
    title: "Time dilation in the brain",
    content:
      "When you are fully absorbed in a task, the brain's anterior cingulate suppresses irrelevant sensory input — minutes feel like seconds. Boredom reverses the effect: the same clock ticks louder because prediction errors spike.",
  },
  {
    id: "world-tardigrade",
    type: "world",
    title: "The tardigrade's secret",
    content:
      "Tardigrades survive vacuum, radiation, and decades of dehydration by replacing water with trehalose sugar, which vitrifies their cells into glass-like stability. Life can pause metabolism without dying.",
  },
  {
    id: "world-quantum-tunneling",
    type: "world",
    title: "Quantum tunneling in your phone",
    content:
      "Modern transistors are so small that electrons sometimes tunnel through barriers they classically cannot cross. Chip designers now treat quantum leakage as a hard limit on how much smaller CPUs can get.",
  },
  {
    id: "world-place-cells",
    type: "world",
    title: "Place cells and memory",
    content:
      "Your hippocampus contains neurons that fire only in specific locations. London cab drivers, who memorize thousands of streets, show measurably larger hippocampi — the brain physically reshapes for navigation.",
  },
  {
    id: "world-mycorrhizal",
    type: "world",
    title: "Trees that talk underground",
    content:
      "Mycorrhizal fungal networks connect tree roots, trading carbon and warning signals about pests. A dying tree can dump nutrients into the network so neighbors survive — a slow, chemical economy beneath your feet.",
  },
  {
    id: "world-fermi",
    type: "world",
    title: "The Fermi paradox sharpened",
    content:
      "The universe is 13.8 billion years old; Earth is 4.5 billion. If intelligence were common, civilizations millions of years ahead of us should be obvious. The silence suggests either life is rare, or advanced species do not last.",
  },
  {
    id: "world-bone-ledger",
    type: "world",
    title: "Bone's living ledger",
    content:
      "Bone is not static scaffolding — it remodels continuously via osteoblasts and osteoclasts. Astronauts lose up to 1–2% bone mass per month in microgravity because the load-sensing feedback loop goes quiet.",
  },
  {
    id: "world-placebo",
    type: "world",
    title: "The placebo is biochemical",
    content:
      "Expecting relief triggers real endogenous opioids and dopamine. Placebo responses are not imagination — they are measurable neurochemistry, which is why clinical trials must blind both patients and clinicians.",
  },
  {
    id: "world-superconductors",
    type: "world",
    title: "Superconductors at room temperature",
    content:
      "For decades, superconductivity required near-absolute-zero temperatures. Recent hydrides under extreme pressure hint at ambient superconductors — if scaled, lossless power grids and MRI machines the size of phones become plausible.",
  },
  {
    id: "world-oxidation-event",
    type: "world",
    title: "The Great Oxidation Event",
    content:
      "Roughly 2.4 billion years ago, cyanobacteria poisoned their competitors by flooding the atmosphere with oxygen. The survivors built the aerobic metabolism that powers every animal on Earth today.",
  },
  {
    id: "world-circadian-drift",
    type: "world",
    title: "Circadian drift",
    content:
      "Without light cues, human sleep cycles drift to about 24.2 hours. Your 'internal clock' is a genetic feedback loop in the suprachiasmatic nucleus — sunlight is not decorative, it is a sync signal.",
  },
  {
    id: "world-ant-colonies",
    type: "world",
    title: "Ant colonies as distributed minds",
    content:
      "No single ant knows the colony's plan. Local rules — pheromone gradients, touch frequency — produce global behavior like pathfinding and climate control. Intelligence can emerge without a central processor.",
  },
  {
    id: "world-speed-of-thought",
    type: "world",
    title: "The speed of thought",
    content:
      "Action potentials travel at roughly 1–120 m/s depending on myelination. Conscious awareness lags reality by ~100–300 ms — you never experience the present instant, only a stitched prediction.",
  },
  {
    id: "world-pale-blue-dot",
    type: "world",
    title: "Voyager's pale blue dot",
    content:
      "From 6 billion kilometers away, Earth is a fraction of a pixel. Carl Sagan called it proof of our cosmic insignificance and our moral obligation to cherish the only home we have ever known.",
  },
  {
    id: "world-epigenetics",
    type: "world",
    title: "Epigenetics and inheritance",
    content:
      "Environmental stress can add chemical tags to DNA that change gene expression without altering the sequence. Some tags persist across generations in animals — experience can echo in offspring before they are born.",
  },
  {
    id: "world-double-slit",
    type: "world",
    title: "The double-slit in one sentence",
    content:
      "Single particles fired one at a time still build an interference pattern — as if each particle interferes with itself. Observation collapses the pattern, forcing physicists to treat measurement as part of reality, not a passive glance.",
  },
  {
    id: "signal-git-bisect",
    type: "signal",
    title: "git bisect run",
    content:
      "When a bug appeared dozens of commits ago, `git bisect start`, mark bad/good, then `git bisect run ./test.sh`. Git binary-searches history and prints the first broken commit — automate the hunt instead of guessing.",
  },
  {
    id: "signal-covering-indexes",
    type: "signal",
    title: "Covering indexes",
    content:
      "If every column in a SELECT lives inside a B-tree index, the database can satisfy the query from the index alone — no heap fetch. Add INCLUDE columns on PostgreSQL or covering indexes on SQL Server to kill random I/O.",
  },
  {
    id: "signal-actor-model",
    type: "signal",
    title: "The Actor Model",
    content:
      "Isolate state inside actors that communicate only via async messages. No shared mutable memory means fewer locks and clearer failure domains. Erlang, Akka, and modern event systems scale because contention stays local.",
  },
  {
    id: "signal-git-reflog",
    type: "signal",
    title: "git reflog safety net",
    content:
      "Deleted branches and hard resets are recoverable for ~90 days via `git reflog`. Find the old HEAD hash, then `git checkout -b rescue <hash>`. Reflog is local — teach your team before someone panics on a Friday.",
  },
  {
    id: "signal-explain-analyze",
    type: "signal",
    title: "EXPLAIN ANALYZE, not EXPLAIN",
    content:
      "Planner estimates lie. `EXPLAIN ANALYZE` runs the query and shows actual row counts and timings. Compare estimated vs actual rows — a 10× mismatch usually means stale statistics or a missing composite index.",
  },
  {
    id: "signal-idempotency-keys",
    type: "signal",
    title: "Idempotency keys for APIs",
    content:
      "Network retries duplicate POSTs. Clients send an `Idempotency-Key` header; the server stores the first result keyed by that token. Retries return the same response without double-charging or double-shipping.",
  },
  {
    id: "signal-structured-concurrency",
    type: "signal",
    title: "Structured concurrency",
    content:
      "Scope child tasks to a parent lifetime — when the parent cancels, all children cancel. Go's `errgroup`, Kotlin coroutine scopes, and Swift task groups prevent orphaned background work from outliving the request.",
  },
  {
    id: "signal-cache-stampede",
    type: "signal",
    title: "Cache stampede guard",
    content:
      "When a hot cache key expires, every request may hit the database at once. Use probabilistic early expiration, request coalescing (singleflight), or a short-lived mutex per key so only one worker rebuilds.",
  },
  {
    id: "signal-git-worktree",
    type: "signal",
    title: "git worktree for parallel work",
    content:
      "`git worktree add ../hotfix main` checks out another branch in a separate folder sharing the same object database. Review a PR while your feature branch stays dirty — no stash dance, no clone overhead.",
  },
  {
    id: "signal-write-skew",
    type: "signal",
    title: "Write skew in transactions",
    content:
      "Two transactions read the same rows, each updates different columns, both commit — invariants break even under READ COMMITTED. Fix with serializable isolation, row locks, or a version column checked on UPDATE.",
  },
  {
    id: "signal-backpressure",
    type: "signal",
    title: "Backpressure with bounded queues",
    content:
      "Unbounded in-memory queues hide overload until the process OOMs. Bound channel depth and propagate `full` signals upstream — slow consumers should slow producers, not crash the JVM.",
  },
  {
    id: "signal-feature-flags",
    type: "signal",
    title: "Feature flags vs branches",
    content:
      "Long-lived branches rot. Ship dark code behind flags, enable for internal users, then ramp percentages. Trunk-based development plus flags beats merge hell and lets you kill features without revert commits.",
  },
  {
    id: "signal-http-caching",
    type: "signal",
    title: "HTTP caching semantics",
    content:
      "`Cache-Control: private, max-age=0` forces revalidation; `stale-while-revalidate` serves stale content while refreshing in the background. Misconfigured ETags cause subtle bugs — validate with curl `-I` before blaming the CDN.",
  },
  {
    id: "signal-observability",
    type: "signal",
    title: "Observability triad",
    content:
      "Metrics tell you that latency spiked; logs tell you which request failed; traces show which span ate 800 ms. Instrument all three with shared trace IDs — debugging production without correlation is archaeology.",
  },
  {
    id: "signal-immutability",
    type: "signal",
    title: "Immutability at boundaries",
    content:
      "Deep-freeze config objects at startup, return copies from getters, and treat API responses as read-only. Bugs from accidental mutation are silent and expensive — enforce immutability where data crosses module lines.",
  },
  {
    id: "signal-keyset-pagination",
    type: "signal",
    title: "Pagination cursors over OFFSET",
    content:
      "`OFFSET 100000` scans and discards rows — cost grows with page depth. Keyset pagination (`WHERE id > $cursor ORDER BY id LIMIT 50`) stays O(page size) and stays stable when rows are inserted mid-scroll.",
  },
  {
    id: "life-implementation-intention",
    type: "life",
    title: "Implementation intentions beat willpower",
    content:
      "Pair a cue with a micro-action: \"When I open my laptop, I write one sentence on the mission.\" Gollwitzer's studies show this if-then format doubles follow-through versus vague goals because the brain pre-loads the next move.",
  },
  {
    id: "life-two-minute-rule",
    type: "life",
    title: "The two-minute cold start",
    content:
      "Commit only to two minutes of the hard task. Activation energy is the bottleneck — once motion exists, the brain's task-positive network sustains effort. You are not tricking yourself; you are lowering the entry fee to flow.",
  },
  {
    id: "life-ultradian-rhythm",
    type: "life",
    title: "Ultradian performance peaks",
    content:
      "Alertness oscillates in ~90-minute cycles. Schedule deep work in the first peak after waking, not after email. A 15-minute offline break between cycles restores prefrontal glucose efficiency better than grinding through the trough.",
  },
  {
    id: "life-precommitment",
    type: "life",
    title: "Pre-commitment contracts",
    content:
      "Decide the default before temptation arrives: block sites, delete apps, or tell someone your deadline. Ulysses tied himself to the mast — environmental design beats late-stage discipline because the future self is a different negotiator.",
  },
  {
    id: "life-active-recall",
    type: "life",
    title: "Active recall over re-reading",
    content:
      "Testing yourself on material — even guessing wrong — strengthens retrieval pathways more than passive review. Close the tab, write three bullets from memory, then check. The discomfort is the signal that memory is forming.",
  },
  {
    id: "life-friction-design",
    type: "life",
    title: "Friction as a design lever",
    content:
      "Add steps between you and the bad habit (log out, unplug, grayscale phone). Remove steps from the good habit (book on pillow, gym bag by door). Behavior change is architecture, not character — make the right path the lazy path.",
  },
  {
    id: "life-light-anchor",
    type: "life",
    title: "Light-anchored circadian reset",
    content:
      "Morning bright light within 30 minutes of waking advances melatonin onset that night. Evening screens without dim mode delay sleep onset by 30–90 minutes. Treat photons as a schedule input, not ambiance — your cortex reads lux as clock data.",
  },
];

function todayISO() {
  return S.todayISO();
}

let seenLedger = [];
let seenSet = new Set();
let signalVector = "";
let activeTriNode = "world";
let knowledgeUnlockDate = null;
let intentionalBrowseUntil = null;
const sessionTriNodeItem = {};
const signalSessionCache = { vector: null, items: [] };
let vectorDebounceTimer = null;
let trinodeRendering = false;

function hashInsight(text) {
  let hash = 5381;
  const s = String(text || "");
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 33) ^ s.charCodeAt(i);
  }
  return `hash-${(hash >>> 0).toString(36)}`;
}

function isSeen(id) {
  return id != null && seenSet.has(id);
}

async function loadSeenLedger() {
  const result = await storageGet(SEEN_LEDGER_KEY);
  seenLedger = Array.isArray(result[SEEN_LEDGER_KEY])
    ? result[SEEN_LEDGER_KEY].slice(-LEDGER_MAX)
    : [];
  seenSet = new Set(seenLedger);
}

async function markSeen(id) {
  if (!id || seenSet.has(id)) return;
  seenLedger.push(id);
  seenSet.add(id);
  while (seenLedger.length > LEDGER_MAX) {
    const evicted = seenLedger.shift();
    seenSet.delete(evicted);
  }
  try {
    await storageSet({ [SEEN_LEDGER_KEY]: seenLedger });
  } catch {
    /* storage full or unavailable — render still succeeds */
  }
}

function fisherYates(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function evictTypeFromLedger(type) {
  const pool = KNOWLEDGE_ITEMS.filter((k) => k.type === type);
  const poolIds = new Set(pool.map((p) => p.id));
  for (const id of poolIds) seenSet.delete(id);
  seenLedger = seenLedger.filter((id) => !poolIds.has(id));
}

function pickLocalUnique(type) {
  const pool = KNOWLEDGE_ITEMS.filter((k) => k.type === type);
  if (!pool.length) return null;

  for (const item of fisherYates(pool)) {
    if (!isSeen(item.id)) return item;
  }

  evictTypeFromLedger(type);
  return pool[Math.floor(Math.random() * pool.length)];
}

function clearSignalCache() {
  signalSessionCache.vector = null;
  signalSessionCache.items = [];
}

async function fetchSignalVector(vector) {
  const page = Math.floor(Math.random() * 5) + 1;
  const sorts = [
    `top=${[7, 30, 365][Math.floor(Math.random() * 3)]}`,
    "state=rising",
    "",
  ];
  const sort = sorts[Math.floor(Math.random() * sorts.length)];
  const tag = encodeURIComponent(vector.trim().toLowerCase());
  const url = `${DEVTO_ENDPOINT}?tag=${tag}&per_page=30&page=${page}${sort ? `&${sort}` : ""}`;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Dev.to ${res.status}`);

  const json = await res.json();
  if (!Array.isArray(json) || !json.length) throw new Error("Dev.to empty");

  return json.map((a) => ({
    id: `signal-net-${a.id}`,
    type: "signal",
    title: a.title || "Untitled",
    content: (a.description || "").trim() || a.title || "No summary available.",
    url: a.url || null,
  }));
}

function pickUnseenFromList(items) {
  for (const item of fisherYates(items)) {
    if (!isSeen(item.id)) return item;
  }
  return null;
}

async function getSignalItem(vector, { force = false } = {}) {
  const key = vector.trim().toLowerCase();
  if (!key) return pickLocalUnique("signal");

  if (force || signalSessionCache.vector !== key) {
    clearSignalCache();
    signalSessionCache.vector = key;
  }

  const tryFetch = async () => {
    const batch = await fetchSignalVector(key);
    signalSessionCache.items.push(...batch);
    return pickUnseenFromList(batch);
  };

  if (!signalSessionCache.items.length) {
    try {
      const fresh = await tryFetch();
      if (fresh) return fresh;
    } catch {
      return pickLocalUnique("signal");
    }
  }

  let item = pickUnseenFromList(signalSessionCache.items);
  if (item) return item;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      item = await tryFetch();
      if (item) return item;
    } catch {
      break;
    }
  }

  const pool = KNOWLEDGE_ITEMS.filter((k) => k.type === "signal");
  for (const local of pool) seenSet.delete(local.id);
  seenLedger = seenLedger.filter((id) => !pool.some((p) => p.id === id));
  return pickLocalUnique("signal");
}

async function loadKnowledgeUnlockDate() {
  const result = await storageGet(KNOWLEDGE_UNLOCK_KEY);
  const val = result[KNOWLEDGE_UNLOCK_KEY];
  return typeof val === "string" ? val : null;
}

function isKnowledgeUnlocked(unlockDate) {
  return unlockDate === todayISO();
}

async function recordKnowledgeUnlock() {
  const today = todayISO();
  if (knowledgeUnlockDate === today) return;
  if ((await loadKnowledgeUnlockDate()) === today) {
    knowledgeUnlockDate = today;
    updateMissionGateUI();
    renderTriNode();
    return;
  }
  knowledgeUnlockDate = today;
  await storageSet({ [KNOWLEDGE_UNLOCK_KEY]: today });
  updateMissionGateUI();
  renderTriNode();
}

async function onFocusSessionStarted() {
  await recordKnowledgeUnlock();
}

/* ==========================================================================
   8b. Daily focus stats & streaks
   ========================================================================== */

let focusStats = { ...DEFAULT_FOCUS_STATS };
let lastFocusStatsText = "";

function normalizeFocusStats(raw) {
  return S.normalizeFocusStats(raw);
}

function yesterdayISO(fromDate = new Date()) {
  return S.yesterdayISO(fromDate);
}

function rollFocusStatsToToday(stats) {
  return S.rollFocusStatsToToday(stats);
}

async function loadFocusStats() {
  const result = await storageGet(FOCUS_STATS_KEY);
  focusStats = rollFocusStatsToToday(normalizeFocusStats(result[FOCUS_STATS_KEY]));
  return focusStats;
}

async function saveFocusStats() {
  await storageSet({ [FOCUS_STATS_KEY]: focusStats });
}

async function recordFocusSessionComplete(presetSeconds, completedAt) {
  const at = completedAt ?? micro.completedAt ?? Date.now();
  if (!S.shouldRecordCompletion(focusStats, at)) return;

  const mission = config.mission?.trim() || dom.missionInput?.value?.trim() || "";
  focusStats = S.applyFocusSessionComplete(focusStats, {
    presetSeconds,
    completedAt: at,
    mission,
  });
  await saveFocusStats();
  renderFocusStats();
}

async function handleMicroCompletion(completedMicro) {
  if (!completedMicro?.completedAt) return;
  if (!S.shouldRecordCompletion(focusStats, completedMicro.completedAt)) return;

  await recordFocusSessionComplete(
    completedMicro.presetSeconds ?? micro.presetSeconds,
    completedMicro.completedAt
  );
  await recordKnowledgeUnlock();
}

function formatFocusStatsLine(stats = focusStats) {
  const parts = [];
  if (stats.sessionsToday > 0) {
    const n = stats.sessionsToday;
    parts.push(`${n} focus ${n === 1 ? "block" : "blocks"} today`);
  }
  if (stats.minutesToday > 0) {
    parts.push(`${stats.minutesToday} min focused`);
  }
  if (stats.streakDays > 0) {
    parts.push(`${stats.streakDays}-day streak`);
  }
  if (parts.length === 0) return "No focus blocks completed today yet.";
  return parts.join(" · ");
}

function renderFocusStats() {
  if (!dom.focusStats) return;
  const rolled = rollFocusStatsToToday(focusStats);
  if (rolled.todayISO !== focusStats.todayISO) {
    focusStats = rolled;
    saveFocusStats().catch(() => {});
  } else {
    focusStats = rolled;
  }
  const text = formatFocusStatsLine(focusStats);
  if (text === lastFocusStatsText) return;
  lastFocusStatsText = text;
  dom.focusStats.textContent = text;
}

const TRINODE_TAB_IDS = {
  world: "trinode-tab-world",
  signal: "trinode-tab-signal",
  life: "trinode-tab-life",
};

function selectTriNodeTab(type) {
  if (!["world", "signal", "life"].includes(type)) return;
  activeTriNode = type;

  for (const t of ["world", "signal", "life"]) {
    const tab = document.getElementById(TRINODE_TAB_IDS[t]);
    const active = t === type;
    tab?.classList.toggle("is-active", active);
    tab?.setAttribute("aria-selected", active ? "true" : "false");
  }

  dom.trinodePanel?.setAttribute("aria-labelledby", TRINODE_TAB_IDS[type]);

  if (dom.trinodeVectorRow) {
    if (type === "signal") {
      dom.trinodeVectorRow.removeAttribute("hidden");
    } else {
      dom.trinodeVectorRow.setAttribute("hidden", "");
    }
  }

  renderTriNode();
}

function updateTriNodeLockUI(unlocked) {
  if (!dom.trinodePanel || !dom.trinodeLock) return;
  dom.trinodePanel.classList.toggle("is-locked", !unlocked);

  const disabled = !unlocked;
  if (dom.trinodeVectorInput) dom.trinodeVectorInput.disabled = disabled;
  if (dom.trinodeReshuffle) dom.trinodeReshuffle.disabled = disabled;
}

function spinReshuffleIcon() {
  if (!dom.trinodeReshuffle) return;
  dom.trinodeReshuffle.classList.add("is-spinning");
  window.setTimeout(() => dom.trinodeReshuffle?.classList.remove("is-spinning"), 500);
}

async function resolveTriNodeItem(type, { force = false } = {}) {
  if (type === "signal") {
    const v = (signalVector || "").trim();
    if (v) {
      try {
        return await getSignalItem(v, { force });
      } catch {
        return pickLocalUnique("signal");
      }
    }
    return pickLocalUnique("signal");
  }

  if (force) sessionTriNodeItem[type] = null;
  if (!sessionTriNodeItem[type]) {
    sessionTriNodeItem[type] = pickLocalUnique(type);
  }
  return sessionTriNodeItem[type];
}

async function renderTriNode({ force = false } = {}) {
  if (!dom.trinodeTitle || !dom.trinodeContent || trinodeRendering) return;

  trinodeRendering = true;
  if (force) spinReshuffleIcon();

  try {
    const type = activeTriNode;
    let item = await resolveTriNodeItem(type, { force });

    if (item && isSeen(item.id)) {
      if (type === "signal") {
        item = await getSignalItem((signalVector || "").trim(), { force: true });
      } else {
        sessionTriNodeItem[type] = null;
        item = pickLocalUnique(type);
        sessionTriNodeItem[type] = item;
      }
    }

    if (!item) return;

    dom.trinodeTitle.textContent = item.title;
    dom.trinodeContent.textContent = item.content;

    const safeUrl = S.sanitizeExternalUrl(item.url);
    if (safeUrl && dom.trinodeSource) {
      dom.trinodeSource.hidden = false;
      dom.trinodeSource.href = safeUrl;
      dom.trinodeSource.textContent = "Read source →";
    } else if (dom.trinodeSource) {
      dom.trinodeSource.hidden = true;
      dom.trinodeSource.removeAttribute("href");
      dom.trinodeSource.textContent = "";
    }

    await markSeen(item.id);
    updateTriNodeLockUI(isKnowledgeUnlocked(knowledgeUnlockDate));
  } finally {
    trinodeRendering = false;
  }
}

/* ==========================================================================
   7. Theme & visibility
   ========================================================================== */

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function blendHex(a, b, t) {
  const c1 = hexToRgb(a);
  const c2 = hexToRgb(b);
  if (!c1 || !c2) return a;
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const bl = Math.round(c1.b + (c2.b - c1.b) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function applyTheme(customize) {
  const colors = { ...DEFAULT_CUSTOMIZE.colors, ...customize.colors };
  const root = document.documentElement;
  root.style.setProperty("--bg", colors.bg);
  root.style.setProperty("--text", colors.text);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-crimson", colors.accentCrimson);
  root.style.setProperty("--muted", blendHex(colors.text, colors.bg, 0.55));
  root.style.setProperty("--surface", blendHex(colors.bg, colors.text, 0.07));
  root.style.setProperty("--border", blendHex(colors.bg, colors.text, 0.12));
  root.style.setProperty("--accent-dim", blendHex(colors.accent, colors.bg, 0.35));
  const glowRgb = hexToRgb(colors.accentCrimson) || { r: 255, g: 78, b: 78 };
  root.style.setProperty("--tick-glow", `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, 0.2)`);

  const fontKey = FONT_PRESETS[customize.font] ? customize.font : DEFAULT_CUSTOMIZE.font;
  const fontPreset = FONT_PRESETS[fontKey];
  root.style.setProperty("--font", fontPreset.font);
  root.style.setProperty("--font-mono", fontPreset.fontMono);

  document.body.classList.toggle("hide-ms", !customize.showMilliseconds);
  document.body.classList.toggle("show-ms-override", customize.showMilliseconds);
  document.body.classList.toggle("theme-light", colors.bg === THEME_PRESETS.paper.colors.bg);
}

function applySectionVisibility(customize) {
  const s = customize.sections;
  const map = {
    macro: dom.blockMacro,
    micro: dom.blockMicro,
    jolt: dom.jolt,
    mission: dom.missionGate || dom.missionBar,
    knowledge: dom.blockKnowledge,
  };

  for (const [key, el] of Object.entries(map)) {
    if (!el) continue;
    el.classList.toggle("section-hidden", !s[key]);
  }

  const visibleCount = Object.values(s).filter(Boolean).length;
  dom.dashboard.classList.toggle("layout-minimal", visibleCount <= 2);
  updateMissionGateUI();
}

function applyCustomize() {
  if (!config.customize) config.customize = { ...DEFAULT_CUSTOMIZE, sections: { ...DEFAULT_CUSTOMIZE.sections } };
  applyTheme(config.customize);
  applySectionVisibility(config.customize);
  applyMacroClockPresentation();
  clearMacroClockPrev();
}

/* ==========================================================================
   8. Audio
   ========================================================================== */

let audioCtx = null;

const SOUND_PROFILES = {
  chime: { type: "sine", start: 880, end: 1320, duration: 0.4, volume: 0.25 },
  bell: { type: "triangle", start: 520, end: 780, duration: 0.55, volume: 0.2 },
  ping: { type: "sine", start: 1200, end: 1600, duration: 0.18, volume: 0.22 },
  soft: { type: "sine", start: 440, end: 550, duration: 0.6, volume: 0.12 },
};

function playCompletionChime(force = false) {
  const sound = config.customize?.sound ?? "chime";
  if (sound === "none") return;
  if (!force && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const profile = SOUND_PROFILES[sound] || SOUND_PROFILES.chime;

  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = profile.type;
    osc.frequency.setValueAtTime(profile.start, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(profile.end, ctx.currentTime + profile.duration * 0.2);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(profile.volume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + profile.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + profile.duration + 0.05);
  } catch {
    /* audio unavailable */
  }
}

function maybePlayChime(completedAt) {
  if (!completedAt) return;
  if (config.customize?.sound === "none") return;
  const key = `chime-${completedAt}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
  playCompletionChime();
}

/* ==========================================================================
   8b. Ambient focus audio
   ========================================================================== */

let ambientIntervalId = null;
let ambientTimeoutId = null;

function ensureAudioCtx() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function playAmbientTick() {
  const ctx = ensureAudioCtx();
  if (!ctx) return;

  const t = ctx.currentTime;
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(95 + Math.random() * 25, t);
  thumpGain.gain.setValueAtTime(0.0001, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.055, t + 0.008);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(t);
  thump.stop(t + 0.05);

  const bufferSize = ctx.sampleRate * 0.02;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const click = ctx.createBufferSource();
  const clickFilter = ctx.createBiquadFilter();
  const clickGain = ctx.createGain();
  click.buffer = buffer;
  clickFilter.type = "bandpass";
  clickFilter.frequency.setValueAtTime(2800, t);
  clickFilter.Q.setValueAtTime(0.8, t);
  clickGain.gain.setValueAtTime(0.018, t);
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  click.connect(clickFilter);
  clickFilter.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.start(t);
  click.stop(t + 0.03);
}

function stopAmbientTick() {
  if (ambientTimeoutId != null) {
    clearTimeout(ambientTimeoutId);
    ambientTimeoutId = null;
  }
  if (ambientIntervalId != null) {
    clearInterval(ambientIntervalId);
    ambientIntervalId = null;
  }
}

function scheduleAmbientPulse() {
  if (ambientIntervalId != null) return;
  const pulse = () => {
    if (!shouldPlayAmbient()) {
      stopAmbientTick();
      return;
    }
    playAmbientTick();
    const jitter = 900 + Math.random() * 200;
    ambientTimeoutId = setTimeout(pulse, jitter);
  };
  pulse();
}

function shouldPlayAmbient() {
  if (!config.customize?.ambientFocus) return false;
  if (micro.status !== "running") return false;
  if (reducedMotion) return false;
  if (document.hidden) return false;
  return true;
}

function syncAmbientAudio() {
  if (shouldPlayAmbient()) {
    if (ambientIntervalId == null && ambientTimeoutId == null) {
      scheduleAmbientPulse();
    }
  } else {
    stopAmbientTick();
  }
}

function updateAmbientToggleUI() {
  if (!dom.ambientToggle) return;
  const on = !!config.customize?.ambientFocus;
  dom.ambientToggle.classList.toggle("is-active", on);
  dom.ambientToggle.setAttribute("aria-pressed", on ? "true" : "false");
}

async function toggleAmbientFocus() {
  if (!config.customize) config.customize = { ...DEFAULT_CUSTOMIZE, sections: { ...DEFAULT_CUSTOMIZE.sections } };
  config.customize.ambientFocus = !config.customize.ambientFocus;
  await saveConfig(config);
  updateAmbientToggleUI();
  syncAmbientAudio();
}

/* ==========================================================================
   8c. Momentum ledger
   ========================================================================== */

let ledgerRunStart = null;
let ledgerPausedMs = 0;
let idleSince = null;
let driftAnchor = null;
let lastLedgerText = "";
let lastLedgerLeakSecond = -1;
let lastLedgerEarnCents = -1;
let lastLedgerMode = "";
let lastDashDateKey = "";
let lifeGridDots = [];

function getHourlyWorth() {
  const v = Number(config.customize?.hourlyWorth);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function msToDollars(ms, hourly) {
  return (ms / MS_HOUR) * hourly;
}

function formatLedgerMoney(n) {
  return `$${n.toFixed(2)}`;
}

function hasMissionIntent() {
  const fromInput = dom.missionInput?.value?.trim();
  const fromConfig = config.mission?.trim();
  return !!(fromInput || fromConfig);
}

function resetLedgerSession() {
  ledgerRunStart = null;
  ledgerPausedMs = 0;
  lastLedgerEarnCents = -1;
}

function ledgerSessionStart() {
  ledgerRunStart = Date.now();
}

function ledgerSessionPause() {
  if (ledgerRunStart != null) {
    ledgerPausedMs += Date.now() - ledgerRunStart;
    ledgerRunStart = null;
  }
}

function getLedgerSessionMs(now = Date.now()) {
  let ms = ledgerPausedMs;
  if (micro.status === "running" && ledgerRunStart != null) {
    ms += now - ledgerRunStart;
  }
  return ms;
}

function resetIdleDrift() {
  idleSince = null;
  driftAnchor = null;
  lastLedgerLeakSecond = -1;
}

function isIntentionalBrowsing(now = Date.now()) {
  return intentionalBrowseUntil != null && now < intentionalBrowseUntil;
}

function shouldShowMissionGate(now = Date.now()) {
  return (
    micro.status === "idle" &&
    !isIntentionalBrowsing(now) &&
    config.customize?.sections?.mission !== false
  );
}

function shouldCollapseKnowledge() {
  return !isKnowledgeUnlocked(knowledgeUnlockDate);
}

async function loadIntentionalBrowseUntil() {
  const result = await storageGet(INTENTIONAL_BROWSE_KEY);
  const until = result[INTENTIONAL_BROWSE_KEY];
  if (typeof until === "number" && until > Date.now()) {
    return until;
  }
  if (typeof until === "number") {
    await storageSet({ [INTENTIONAL_BROWSE_KEY]: null });
  }
  return null;
}

async function clearIntentionalBrowse() {
  intentionalBrowseUntil = null;
  await storageSet({ [INTENTIONAL_BROWSE_KEY]: null });
}

async function startIntentionalBrowse() {
  const until = Date.now() + INTENTIONAL_BROWSE_MS;
  intentionalBrowseUntil = until;
  await storageSet({ [INTENTIONAL_BROWSE_KEY]: until });
  resetIdleDrift();
  updateMissionGateUI();
}

function renderBrowseGraceBanner(now = Date.now()) {
  if (!dom.browseGraceBanner || !dom.browseGraceTime) return;

  if (!isIntentionalBrowsing(now)) {
    dom.browseGraceBanner.hidden = true;
    return;
  }

  const remaining = Math.max(0, intentionalBrowseUntil - now);
  dom.browseGraceBanner.hidden = false;
  dom.browseGraceTime.textContent = formatMicroTime(remaining);
}

function updateMissionGateUI(now = Date.now()) {
  if (intentionalBrowseUntil != null && now >= intentionalBrowseUntil) {
    intentionalBrowseUntil = null;
    storageSet({ [INTENTIONAL_BROWSE_KEY]: null }).catch(() => {});
  }

  const gate = shouldShowMissionGate(now);
  const collapseKnowledge = shouldCollapseKnowledge();

  dom.dashboard?.classList.toggle("is-mission-gate", gate);
  dom.dashboard?.classList.toggle("knowledge-gated", collapseKnowledge);

  if (dom.gateStartFocus) {
    const hasMission = !!dom.missionInput?.value?.trim();
    dom.gateStartFocus.disabled = !hasMission;
  }

  if (dom.missionGateHint) {
    dom.missionGateHint.hidden = !gate;
  }

  renderBrowseGraceBanner(now);
}

function syncDriftAnchor(now = Date.now()) {
  const canDrift =
    micro.status !== "running" &&
    micro.status !== "paused" &&
    !isIntentionalBrowsing(now) &&
    !document.hidden;

  if (!canDrift) {
    idleSince = null;
    driftAnchor = null;
    lastLedgerLeakSecond = -1;
    return;
  }

  if (idleSince == null) idleSince = now;

  const idleMs = now - idleSince;
  if (idleMs < DRIFT_GRACE_MS) {
    driftAnchor = null;
    return;
  }

  driftAnchor = idleSince + DRIFT_GRACE_MS;
}

function formatDriftDuration(ms) {
  const totalMin = Math.floor(ms / MS_MINUTE);
  if (totalMin >= 60) {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (totalMin >= 1) return `${totalMin} min`;
  const sec = Math.max(1, Math.ceil(ms / MS_SECOND));
  return `${sec} sec`;
}

function driftLeakMessage(now = Date.now()) {
  if (driftAnchor == null) return "";
  const driftMs = now - driftAnchor;
  const duration = formatDriftDuration(driftMs);
  if (!hasMissionIntent()) {
    return `You've been on this tab for ${duration} without a mission`;
  }
  return `You've been on this tab for ${duration} without a focus session`;
}

function renderMomentumLedger(now = Date.now()) {
  if (!dom.momentumLedger) return;

  syncDriftAnchor();

  const rate = getHourlyWorth();
  let text = "";
  let mode = "";

  if (micro.status === "running" || (micro.status === "paused" && ledgerPausedMs > 0)) {
    if (rate <= 0) {
      dom.momentumLedger.hidden = true;
      dom.momentumLedger.classList.remove("is-earning", "is-leak");
      lastLedgerText = "";
      lastLedgerEarnCents = -1;
      lastLedgerMode = "";
      return;
    }
    if (lastLedgerMode !== "earning") {
      lastLedgerText = "";
      lastLedgerMode = "earning";
    }
    const earned = msToDollars(getLedgerSessionMs(now), rate);
    const earnCents = Math.floor(earned * 100);
    if (micro.status === "running" && earnCents === lastLedgerEarnCents && lastLedgerText) {
      text = lastLedgerText;
    } else {
      lastLedgerEarnCents = earnCents;
      text = `+${formatLedgerMoney(earned)} earned this session`;
    }
    mode = "earning";
  } else if (micro.status !== "running" && micro.status !== "paused" && driftAnchor != null) {
    if (lastLedgerMode !== "leak") {
      lastLedgerText = "";
      lastLedgerMode = "leak";
    }
    const leakSec = Math.floor((now - driftAnchor) / MS_SECOND);
    if (leakSec !== lastLedgerLeakSecond) {
      lastLedgerLeakSecond = leakSec;
      text = driftLeakMessage(now);
    } else if (lastLedgerText) {
      text = lastLedgerText;
    } else {
      text = driftLeakMessage(now);
    }
    mode = "leak";
  } else {
    dom.momentumLedger.hidden = true;
    dom.momentumLedger.classList.remove("is-earning", "is-leak");
    lastLedgerText = "";
    lastLedgerEarnCents = -1;
    lastLedgerMode = "";
    return;
  }

  if (!text) return;

  dom.momentumLedger.hidden = false;
  dom.momentumLedger.classList.toggle("is-earning", mode === "earning");
  dom.momentumLedger.classList.toggle("is-leak", mode === "leak");

  if (text !== lastLedgerText) {
    lastLedgerText = text;
    dom.momentumLedger.textContent = text;
  }
}

const dashDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
});

function renderDashDate(now = Date.now()) {
  if (!dom.dashDate) return;
  const d = new Date(now);
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
  if (key === lastDashDateKey) return;
  lastDashDateKey = key;
  dom.dashDate.textContent = dashDateFormatter.format(d);
  dom.dashDate.dateTime = d.toISOString();
}

/* ==========================================================================
   9. DOM references & state
   ========================================================================== */

const dom = {
  settingsBackdrop: document.getElementById("settings-backdrop"),
  settingsDrawer: document.getElementById("settings-drawer"),
  settingsClose: document.getElementById("settings-close"),
  settingsTabLife: document.getElementById("settings-tab-life"),
  settingsTabAppearance: document.getElementById("settings-tab-appearance"),
  settingsTabLayout: document.getElementById("settings-tab-layout"),
  settingsTabFocus: document.getElementById("settings-tab-focus"),
  settingsPanelLife: document.getElementById("settings-panel-life"),
  settingsPanelAppearance: document.getElementById("settings-panel-appearance"),
  settingsPanelLayout: document.getElementById("settings-panel-layout"),
  settingsPanelFocus: document.getElementById("settings-panel-focus"),
  distractorPresets: document.getElementById("distractor-presets"),
  inputFrictionEnabled: document.getElementById("input-friction-enabled"),
  inputFrictionDelay: document.getElementById("input-friction-delay"),
  inputFrictionCustom: document.getElementById("input-friction-custom"),
  frictionClearBypass: document.getElementById("friction-clear-bypass"),
  frictionSiteWarning: document.getElementById("friction-site-warning"),
  frictionSyncError: document.getElementById("friction-sync-error"),
  extensionWarning: document.getElementById("extension-warning"),
  settingsTabs: document.querySelector(".settings-tabs"),
  themePresets: document.getElementById("theme-presets"),
  fontPresets: document.getElementById("font-presets"),
  settingsDoneBtn: document.getElementById("settings-done-btn"),
  setupForm: document.getElementById("setup-form"),
  setupError: document.getElementById("setup-error"),
  dashboard: document.getElementById("dashboard"),
  blockMacro: document.getElementById("block-macro"),
  blockMicro: document.getElementById("block-micro"),
  missionGate: document.getElementById("mission-gate"),
  missionBar: document.querySelector(".mission-bar"),
  gateStartFocus: document.getElementById("gate-start-focus"),
  gateIntentionalBrowse: document.getElementById("gate-intentional-browse"),
  missionGateHint: document.getElementById("mission-gate-hint"),
  browseGraceBanner: document.getElementById("browse-grace-banner"),
  browseGraceTime: document.getElementById("browse-grace-time"),
  macroRemaining: document.getElementById("macro-remaining"),
  todayRemaining: document.getElementById("today-remaining"),
  ageClock: document.getElementById("age-clock"),
  lifeGrid: document.getElementById("life-grid"),
  momentumLedger: document.getElementById("momentum-ledger"),
  dashDate: document.getElementById("dash-date"),
  ambientToggle: document.getElementById("ambient-toggle"),
  valYears: document.getElementById("val-years"),
  valMonths: document.getElementById("val-months"),
  valDays: document.getElementById("val-days"),
  valHours: document.getElementById("val-hours"),
  valMinutes: document.getElementById("val-minutes"),
  valSeconds: document.getElementById("val-seconds"),
  valMs: document.getElementById("val-ms"),
  focusStats: document.getElementById("focus-stats"),
  microDisplay: document.getElementById("micro-display"),
  microStart: document.getElementById("micro-start"),
  microPause: document.getElementById("micro-pause"),
  microReset: document.getElementById("micro-reset"),
  presetBtns: document.querySelectorAll(".preset-btn"),
  jolt: document.getElementById("jolt"),
  missionInput: document.getElementById("mission-input"),
  blockKnowledge: document.getElementById("block-knowledge"),
  trinodeTabWorld: document.getElementById("trinode-tab-world"),
  trinodeTabSignal: document.getElementById("trinode-tab-signal"),
  trinodeTabLife: document.getElementById("trinode-tab-life"),
  trinodeVectorRow: document.getElementById("trinode-vector-row"),
  trinodeVectorInput: document.getElementById("trinode-vector-input"),
  trinodePanel: document.getElementById("trinode-panel"),
  trinodeTitle: document.getElementById("trinode-title"),
  trinodeContent: document.getElementById("trinode-content"),
  trinodeSource: document.getElementById("trinode-source"),
  trinodeReshuffle: document.getElementById("trinode-reshuffle"),
  trinodeLock: document.getElementById("trinode-lock"),
  editBtn: document.getElementById("edit-btn"),
  inputBirth: document.getElementById("input-birth"),
  inputLife: document.getElementById("input-life"),
  inputWorkDayEnd: document.getElementById("input-work-day-end"),
  inputColorBg: document.getElementById("input-color-bg"),
  inputColorText: document.getElementById("input-color-text"),
  inputColorAccent: document.getElementById("input-color-accent"),
  inputColorCrimson: document.getElementById("input-color-crimson"),
  inputSound: document.getElementById("input-sound"),
  inputHourlyWorth: document.getElementById("input-hourly-worth"),
  inputShowMs: document.getElementById("input-show-ms"),
  inputMacroClockLabels: document.getElementById("input-macro-clock-labels"),
  inputMacroClockDecimal: document.getElementById("input-macro-clock-decimal"),
  inputShowMacro: document.getElementById("input-show-macro"),
  inputShowMicro: document.getElementById("input-show-micro"),
  inputShowJolt: document.getElementById("input-show-jolt"),
  inputShowMission: document.getElementById("input-show-mission"),
  inputShowKnowledge: document.getElementById("input-show-knowledge"),
  previewSoundBtn: document.getElementById("preview-sound-btn"),
};

let config = { ...DEFAULT_CONFIG };
let micro = { ...DEFAULT_MICRO };
const cachedDates = { birth: null, death: null };
let rafId = null;
let microRafId = null;
let reducedMotion = false;
let completing = false;
let drawerOpen = false;
let drawerLocked = false;
let saveDebounceTimer = null;
let activeSettingsTab = "life";
let tickerChannel = null;
let tickerLeader = true;
const tickerTabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const SETTINGS_TAB_ORDER = ["life", "appearance", "layout", "focus"];

const SETTINGS_TAB_DOM = {
  life: {
    tab: () => dom.settingsTabLife,
    panel: () => dom.settingsPanelLife,
  },
  appearance: {
    tab: () => dom.settingsTabAppearance,
    panel: () => dom.settingsPanelAppearance,
  },
  layout: {
    tab: () => dom.settingsTabLayout,
    panel: () => dom.settingsPanelLayout,
  },
  focus: {
    tab: () => dom.settingsTabFocus,
    panel: () => dom.settingsPanelFocus,
  },
};

const prev = {
  years: null,
  months: null,
  days: null,
  hours: null,
  minutes: null,
  seconds: null,
  ms: null,
  remainingPct: null,
  litDots: null,
  macroRemaining: "",
  todayRemaining: "",
  microDisplay: "",
  microStatus: "",
};

function buildLifeGrid() {
  if (!dom.lifeGrid) return;
  if (lifeGridDots.length && dom.lifeGrid.childElementCount === LIFE_GRID_DOTS) return;

  lifeGridDots = [];
  dom.lifeGrid.replaceChildren();

  const frag = document.createDocumentFragment();
  for (let i = 0; i < LIFE_GRID_DOTS; i++) {
    const dot = document.createElement("span");
    dot.className = "life-grid-dot";
    dot.dataset.index = String(i);
    frag.appendChild(dot);
    lifeGridDots.push(dot);
  }
  dom.lifeGrid.appendChild(frag);
  prev.litDots = null;
}

function renderLifeGrid(remainingPct) {
  if (!lifeGridDots.length) buildLifeGrid();
  if (!lifeGridDots.length) return;

  const litCount = Math.round(clamp(remainingPct / 100, 0, 1) * LIFE_GRID_DOTS);
  if (prev.litDots === litCount && prev.litDots != null) return;
  prev.litDots = litCount;

  const startLit = LIFE_GRID_DOTS - litCount;
  for (let i = 0; i < LIFE_GRID_DOTS; i++) {
    const dot = lifeGridDots[i];
    dot.classList.toggle("is-lit", i >= startLit);
    dot.classList.remove("is-frontier");
  }

  if (litCount > 0 && litCount < LIFE_GRID_DOTS) {
    lifeGridDots[startLit]?.classList.add("is-frontier");
  } else if (litCount === LIFE_GRID_DOTS && LIFE_GRID_DOTS > 0) {
    lifeGridDots[0]?.classList.add("is-frontier");
  }

  if (dom.lifeGrid) {
    const pctStr = remainingPct.toFixed(1);
    dom.lifeGrid.setAttribute("aria-valuenow", pctStr);
    dom.lifeGrid.setAttribute("aria-valuetext", `${pctStr} percent remaining`);
  }
}

/* ==========================================================================
   10. UI helpers
   ========================================================================== */

function setText(el, value, key) {
  if (!el) return;
  if (prev[key] === value) return;
  prev[key] = value;
  el.textContent = value;
}

function selectSettingsTab(tabId, { focusPanel = false } = {}) {
  if (!SETTINGS_TAB_ORDER.includes(tabId)) return;
  activeSettingsTab = tabId;

  SETTINGS_TAB_ORDER.forEach((id) => {
    const { tab, panel } = SETTINGS_TAB_DOM[id];
    const tabEl = tab();
    const panelEl = panel();
    const isActive = id === tabId;

    tabEl?.classList.toggle("is-active", isActive);
    tabEl?.setAttribute("aria-selected", isActive ? "true" : "false");
    panelEl?.classList.toggle("is-active", isActive);

    if (panelEl) {
      if (isActive) {
        panelEl.removeAttribute("hidden");
      } else {
        panelEl.setAttribute("hidden", "");
      }
    }
  });

  if (focusPanel) {
    const panelEl = SETTINGS_TAB_DOM[tabId].panel();
    const focusable = panelEl?.querySelector(
      "input:not([type='hidden']), select, textarea, button:not([disabled])"
    );
    focusable?.focus();
  }
}

function tabForValidationError(err) {
  if (!err) return activeSettingsTab;
  if (/on-screen section/i.test(err)) return "layout";
  if (/birth date|life expectancy/i.test(err)) return "life";
  return activeSettingsTab;
}

function openSettingsDrawer({ locked = false } = {}) {
  drawerLocked = locked && !(config.setupComplete && config.birthDate);
  drawerOpen = true;
  fillSetupForm();
  syncPresetUI();

  dom.settingsDrawer.hidden = false;
  dom.settingsDrawer.removeAttribute("hidden");
  dom.settingsDrawer.setAttribute("aria-hidden", "false");
  dom.settingsDrawer.classList.add("is-open");

  dom.settingsBackdrop.hidden = false;
  dom.settingsBackdrop.removeAttribute("hidden");
  dom.settingsBackdrop.classList.add("is-visible");
  dom.settingsBackdrop.setAttribute("aria-hidden", "false");

  document.body.classList.add("settings-open");
  dom.editBtn?.setAttribute("aria-expanded", "true");

  if (drawerLocked) {
    dom.settingsClose.hidden = true;
    dom.settingsDoneBtn.textContent = "Save & start";
  } else {
    dom.settingsClose.hidden = false;
    dom.settingsDoneBtn.textContent = "Done";
  }

  selectSettingsTab("life");
  dom.inputBirth?.focus();
}

function closeSettingsDrawer({ force = false } = {}) {
  if (drawerLocked && !force) return;

  drawerOpen = false;
  drawerLocked = false;

  dom.settingsDrawer.classList.remove("is-open");
  dom.settingsDrawer.setAttribute("aria-hidden", "true");

  dom.settingsBackdrop.classList.remove("is-visible");
  dom.settingsBackdrop.setAttribute("aria-hidden", "true");

  document.body.classList.remove("settings-open");
  dom.editBtn?.setAttribute("aria-expanded", "false");

  const finishClose = () => {
    if (!drawerOpen) {
      dom.settingsDrawer.hidden = true;
      dom.settingsBackdrop.hidden = true;
    }
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    finishClose();
    return;
  }

  window.setTimeout(finishClose, 280);
}

function toggleSettingsDrawer() {
  if (drawerOpen) {
    closeSettingsDrawer();
  } else {
    openSettingsDrawer();
  }
}

function fillSetupForm() {
  dom.inputBirth.value = config.birthDate ?? "";
  dom.inputLife.value = config.lifeExpectancy ?? 80;
  if (dom.inputWorkDayEnd) {
    dom.inputWorkDayEnd.value = parseWorkDayEndTime(config.workDayEndTime).iso;
  }
  const c = config.customize || DEFAULT_CUSTOMIZE;
  const colors = { ...DEFAULT_CUSTOMIZE.colors, ...c.colors };
  dom.inputColorBg.value = colors.bg;
  dom.inputColorText.value = colors.text;
  dom.inputColorAccent.value = colors.accent;
  dom.inputColorCrimson.value = colors.accentCrimson;
  dom.inputSound.value = c.sound ?? "chime";
  dom.inputHourlyWorth.value = c.hourlyWorth ?? DEFAULT_CUSTOMIZE.hourlyWorth;
  dom.inputShowMs.checked = c.showMilliseconds !== false;
  if (dom.inputMacroClockLabels) {
    dom.inputMacroClockLabels.checked = c.macroClockShowLabels !== false;
  }
  if (dom.inputMacroClockDecimal) {
    dom.inputMacroClockDecimal.checked = c.macroClockDecimalFormat === true;
  }
  const s = { ...DEFAULT_CUSTOMIZE.sections, ...c.sections };
  dom.inputShowMacro.checked = s.macro !== false;
  dom.inputShowMicro.checked = s.micro !== false;
  dom.inputShowJolt.checked = s.jolt !== false;
  dom.inputShowMission.checked = s.mission !== false;
  dom.inputShowKnowledge.checked = s.knowledge !== false;

  const friction = config.distractorFriction || DEFAULT_DISTRACTOR_FRICTION;
  if (dom.inputFrictionEnabled) dom.inputFrictionEnabled.checked = !!friction.enabled;
  if (dom.inputFrictionDelay) {
    dom.inputFrictionDelay.value = String(friction.delaySeconds ?? DEFAULT_FRICTION_DELAY_SEC);
  }
  syncDistractorPresetUI(friction.sites || []);
  if (dom.inputFrictionCustom) {
    dom.inputFrictionCustom.value = customHostsForFriction(friction.sites || []).join("\n");
  }
  updateFrictionSiteWarning();
}

function customHostsForFriction(sites) {
  const presetHosts = new Set(DISTRACTOR_PRESETS.flatMap((p) => p.hosts));
  return sites.filter((h) => !presetHosts.has(h));
}

function syncDistractorPresetUI(sites) {
  if (!dom.distractorPresets) return;
  const siteSet = new Set(sites);
  dom.distractorPresets.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.checked = isPresetFullySelected(input.dataset.presetId, siteSet);
  });
}

function readDistractorFrictionFromForm() {
  const siteSet = new Set();
  dom.distractorPresets?.querySelectorAll('input[type="checkbox"]:checked').forEach((input) => {
    for (const host of hostsForPreset(input.dataset.presetId)) {
      siteSet.add(host);
    }
  });

  const customRaw = dom.inputFrictionCustom?.value || "";
  for (const line of customRaw.split(/\r?\n/)) {
    const host = normalizeDistractorHost(line);
    if (host) siteSet.add(host);
  }

  const delay = parseInt(dom.inputFrictionDelay?.value, 10);
  return normalizeDistractorFriction({
    enabled: dom.inputFrictionEnabled?.checked === true,
    delaySeconds: delay,
    sites: [...siteSet],
  });
}

function syncPresetUI() {
  const themeId = config.customize?.themeId ?? DEFAULT_CUSTOMIZE.themeId;
  const fontId = config.customize?.font ?? DEFAULT_CUSTOMIZE.font;

  dom.themePresets?.querySelectorAll(".theme-swatch").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.themeId === themeId);
  });
  dom.fontPresets?.querySelectorAll(".font-pill").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.fontId === fontId);
  });
}

function applyThemePreset(themeId) {
  const preset = THEME_PRESETS[themeId];
  if (!preset) return;

  dom.inputColorBg.value = preset.colors.bg;
  dom.inputColorText.value = preset.colors.text;
  dom.inputColorAccent.value = preset.colors.accent;
  dom.inputColorCrimson.value = preset.colors.accentCrimson;
  applyLiveSettings({ themeId });
}

function applyFontPreset(fontId) {
  if (!FONT_PRESETS[fontId]) return;
  applyLiveSettings({ font: fontId });
  syncPresetUI();
}

function markThemeCustom() {
  if (config.customize) config.customize.themeId = "custom";
  syncPresetUI();
}

function buildPresetControls() {
  if (dom.themePresets) {
    dom.themePresets.innerHTML = "";
    for (const [id, preset] of Object.entries(THEME_PRESETS)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "theme-swatch";
      btn.dataset.themeId = id;
      btn.setAttribute("aria-label", preset.name);
      btn.innerHTML = `
        <span class="theme-swatch-colors">
          <span style="background:${preset.colors.bg}"></span>
          <span style="background:${preset.colors.accent}"></span>
          <span style="background:${preset.colors.accentCrimson}"></span>
        </span>
        ${preset.name}`;
      btn.addEventListener("click", () => applyThemePreset(id));
      dom.themePresets.appendChild(btn);
    }
  }

  if (dom.fontPresets) {
    dom.fontPresets.innerHTML = "";
    for (const [id, preset] of Object.entries(FONT_PRESETS)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "font-pill";
      btn.dataset.fontId = id;
      btn.textContent = preset.name;
      btn.style.fontFamily = preset.font;
      btn.addEventListener("click", () => applyFontPreset(id));
      dom.fontPresets.appendChild(btn);
    }
  }

  if (dom.distractorPresets) {
    dom.distractorPresets.innerHTML = "";
    for (const preset of DISTRACTOR_PRESETS) {
      const label = document.createElement("label");
      label.className = "distractor-preset";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.presetId = preset.id;
      const span = document.createElement("span");
      span.textContent = preset.label;
      label.append(input, span);
      dom.distractorPresets.appendChild(label);
    }
    syncDistractorPresetUI(config.distractorFriction?.sites || []);
  }
}

function refreshDashboardSnapshot() {
  rebuildDateCache();
  if (!cachedDates.birth || !cachedDates.death) return;

  const macro = calcMacro(cachedDates.birth, cachedDates.death);

  const snapshot = {
    yearsLeft: macro.remainingParts.years,
    expiredPct: macro.expiredPct,
  };

  if (config.customize?.sections?.jolt !== false) {
    dom.jolt.textContent = pickJolt(config, snapshot);
  } else {
    dom.jolt.textContent = "";
  }

  initMacro();
  renderMicroUI();
  syncDriftAnchor();
}

function applyLiveSettings(overrides = {}) {
  const data = parseForm();
  config = normalizeConfig({
    ...config,
    ...data,
    customize: {
      ...parseCustomizeForm(),
      ...overrides,
    },
  });

  applyCustomize();
  rebuildDateCache();
  refreshDashboardSnapshot();
  renderMomentumLedger();
  syncPresetUI();

  initMacro();
  updateFrictionSiteWarning();

  const err = validateForm(parseForm());
  if (!err) {
    showError("");
    scheduleDebouncedSave();
  }
}

function flushDebouncedSave() {
  if (!saveDebounceTimer) return;
  clearTimeout(saveDebounceTimer);
  saveDebounceTimer = null;
  const data = parseForm();
  const err = validateForm(data);
  if (!err) {
    saveConfig(config).catch(() => showError("Could not save settings. Try again."));
  }
}

function scheduleDebouncedSave() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(async () => {
    saveDebounceTimer = null;
    const data = parseForm();
    const err = validateForm(data);
    if (err) return;
    try {
      await saveConfig(config);
    } catch {
      showError("Could not save settings. Try again.");
    }
  }, 400);
}

function showError(msg) {
  if (!dom.setupError) return;
  dom.setupError.hidden = !msg;
  dom.setupError.textContent = msg || "";
  if (msg) dom.setupError.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function rebuildDateCache() {
  cachedDates.birth = parseBirthDate(config.birthDate);
  cachedDates.death =
    cachedDates.birth != null
      ? deathDateFromBirth(cachedDates.birth, config.lifeExpectancy)
      : null;
}

function resetPrev() {
  Object.keys(prev).forEach((k) => {
    if (typeof prev[k] === "number") prev[k] = null;
    else prev[k] = "";
  });
}

/* ==========================================================================
   11. Validation & form
   ========================================================================== */

function validateForm(data) {
  return S.validateFormData(data);
}

function parseCustomizeForm() {
  return {
    themeId: config.customize?.themeId ?? DEFAULT_CUSTOMIZE.themeId,
    font: config.customize?.font ?? DEFAULT_CUSTOMIZE.font,
    colors: {
      bg: dom.inputColorBg.value,
      text: dom.inputColorText.value,
      accent: dom.inputColorAccent.value,
      accentCrimson: dom.inputColorCrimson.value,
    },
    sound: dom.inputSound.value || "chime",
    showMilliseconds: dom.inputShowMs.checked,
    macroClockShowLabels: dom.inputMacroClockLabels?.checked !== false,
    macroClockDecimalFormat: dom.inputMacroClockDecimal?.checked === true,
    hourlyWorth: Math.max(0, parseFloat(dom.inputHourlyWorth?.value, 10) || 0),
    ambientFocus: !!config.customize?.ambientFocus,
    sections: {
      macro: dom.inputShowMacro.checked,
      micro: dom.inputShowMicro.checked,
      jolt: dom.inputShowJolt.checked,
      mission: dom.inputShowMission.checked,
      knowledge: dom.inputShowKnowledge.checked,
    },
  };
}

function parseForm() {
  return {
    birthDate: dom.inputBirth.value || null,
    lifeExpectancy: parseFloat(dom.inputLife.value, 10) || 80,
    workDayEndTime: dom.inputWorkDayEnd?.value || DEFAULT_WORK_DAY_END,
    distractorFriction: readDistractorFrictionFromForm(),
    customize: parseCustomizeForm(),
  };
}

async function handleSetupSubmit(e) {
  e.preventDefault();
  const data = parseForm();
  const err = validateForm(data);
  if (err) {
    const tab = tabForValidationError(err);
    selectSettingsTab(tab, { focusPanel: true });
    showError(err);
    return;
  }
  showError("");

  config = normalizeConfig({
    ...config,
    ...data,
    setupComplete: true,
  });

  try {
    await saveConfig(config);
  } catch {
    showError("Could not save settings. Try again.");
    return;
  }

  applyCustomize();
  updateAmbientToggleUI();
  rebuildDateCache();
  closeSettingsDrawer({ force: true });
  showDashboard();
}

/* ==========================================================================
   12. Micro timer engine
   ========================================================================== */

function updatePresetUI() {
  dom.presetBtns.forEach((btn) => {
    const sec = parseInt(btn.dataset.seconds, 10);
    btn.classList.toggle("is-active", sec === micro.presetSeconds);
  });
}

function renderMicroUI(now = Date.now()) {
  const remaining = getMicroRemaining(micro, now);
  const display = formatMicroTime(remaining);

  setText(dom.microDisplay, display, "microDisplay");

  dom.microDisplay.classList.toggle("is-running", micro.status === "running");
  dom.microDisplay.classList.toggle("is-done", micro.status === "idle" && remaining === 0 && micro.completedAt);

  if (prev.microStatus !== micro.status) {
    prev.microStatus = micro.status;
    dom.microStart.disabled = micro.status === "running";
    dom.microPause.disabled = micro.status !== "running";
  }

  updatePresetUI();
  renderMomentumLedger(now);
  syncAmbientAudio();
}

async function applyMicro(next) {
  micro = { ...micro, ...next };
  await saveMicro(micro);
  renderMicroUI();
}

async function selectPreset(seconds) {
  await applyMicro({
    status: "idle",
    presetSeconds: seconds,
    remainingMs: seconds * MS_SECOND,
    endTimestamp: null,
    completedAt: null,
  });
}

async function startMicro(seconds) {
  const preset = seconds ?? micro.presetSeconds;
  const remaining =
    micro.status === "paused" ? getMicroRemaining(micro) : preset * MS_SECOND;

  resetIdleDrift();

  if (micro.status === "paused") {
    ledgerSessionStart();
  } else {
    resetLedgerSession();
    ledgerSessionStart();
  }

  await applyMicro({
    status: "running",
    presetSeconds: preset,
    remainingMs: remaining,
    endTimestamp: Date.now() + remaining,
    completedAt: null,
  });
  startMicroLoop();
  await onFocusSessionStarted();
}

async function pauseMicro() {
  if (micro.status !== "running") return;
  ledgerSessionPause();
  const remaining = getMicroRemaining(micro);
  await applyMicro({
    status: "paused",
    remainingMs: remaining,
    endTimestamp: null,
  });
  stopMicroLoop();
}

async function resetMicro() {
  resetLedgerSession();
  syncDriftAnchor();
  await applyMicro({
    status: "idle",
    remainingMs: micro.presetSeconds * MS_SECOND,
    endTimestamp: null,
    completedAt: null,
  });
  stopMicroLoop();
  syncAmbientAudio();
}

async function completeMicro() {
  if (completing) return;

  const fresh = await loadMicro();
  if (fresh.status !== "running" || getMicroRemaining(fresh) > 0) {
    micro = { ...DEFAULT_MICRO, ...fresh };
    renderMicroUI();
    if (fresh.status !== "running") stopMicroLoop();
    return;
  }

  completing = true;
  try {
    const completedAt = Date.now();
    resetLedgerSession();
    syncDriftAnchor();
    const completed = {
      ...fresh,
      status: "idle",
      remainingMs: fresh.presetSeconds * MS_SECOND,
      endTimestamp: null,
      completedAt,
    };
    micro = completed;
    await saveMicro(completed);
    await handleMicroCompletion(completed);
    maybePlayChime(completedAt);
    renderMicroUI();
    updateMissionGateUI();
  } finally {
    completing = false;
    stopMicroLoop();
    syncAmbientAudio();
  }
}

async function reconcileMicroState() {
  if (S.isMicroExpired(micro)) {
    const completed = S.buildCompletedMicro(micro);
    micro = completed;
    await saveMicro(completed);
    await handleMicroCompletion(completed);
    stopMicroLoop();
    renderMicroUI();
    updateMissionGateUI();
    return;
  }

  if (
    micro.status === "idle" &&
    micro.completedAt &&
    S.shouldRecordCompletion(focusStats, micro.completedAt)
  ) {
    await handleMicroCompletion(micro);
  }

  if (micro.status === "running") {
    startMicroLoop();
  } else {
    stopMicroLoop();
  }
}

async function tickMicro() {
  if (micro.status !== "running") return;

  const now = Date.now();
  const remaining = getMicroRemaining(micro, now);
  renderMicroUI(now);

  if (remaining <= 0) {
    await completeMicro();
    return;
  }

  microRafId = requestAnimationFrame(tickMicro);
}

function startMicroLoop() {
  stopMicroLoop();
  if (micro.status === "running") {
    microRafId = requestAnimationFrame(tickMicro);
  }
}

function stopMicroLoop() {
  if (microRafId != null) {
    cancelAnimationFrame(microRafId);
    microRafId = null;
  }
}

function onMicroStorageChanged(newMicro) {
  if (!newMicro) return;
  const prevCompleted = micro.completedAt;
  micro = { ...DEFAULT_MICRO, ...newMicro };

  if (micro.completedAt && micro.completedAt !== prevCompleted) {
    maybePlayChime(micro.completedAt);
    handleMicroCompletion(micro).catch((err) =>
      console.error("Memento completion sync failed:", err)
    );
  }

  renderMicroUI();
  updateMissionGateUI();

  if (micro.status === "running") {
    startMicroLoop();
  } else {
    stopMicroLoop();
  }
}

/* ==========================================================================
   13. Mission gate
   ========================================================================== */

async function commitMission() {
  const text = dom.missionInput.value.trim();
  if (!text) return;

  config.mission = text;
  await saveConfig(config);
  dom.missionInput?.classList.remove("is-empty-hint");
  syncDriftAnchor();
  updateMissionGateUI();
}

async function startFocusFromGate() {
  const text = dom.missionInput?.value?.trim();
  if (!text) {
    dom.missionInput?.classList.add("is-empty-hint");
    dom.missionInput?.focus();
    return;
  }

  dom.missionInput.classList.remove("is-empty-hint");
  config.mission = text;
  await saveConfig(config);

  await selectPreset(PRESETS.deepWork);
  await startMicro(PRESETS.deepWork);
  updateMissionGateUI();
}

/* ==========================================================================
   14. Render / ticker
   ========================================================================== */

function renderFrame(now = Date.now()) {
  if (!cachedDates.birth || !cachedDates.death) return;

  const macro = calcMacro(cachedDates.birth, cachedDates.death, now);
  const { remainingPct } = macro;
  const remainingLabel = `${remainingPct.toFixed(1)}% left`;
  setText(dom.macroRemaining, remainingLabel, "macroRemaining");

  const today = calcTodayHorizon(config.workDayEndTime, now);
  setText(dom.todayRemaining, formatTodayHorizonLabel(today), "todayRemaining");

  renderMacroClock(macro);

  prev.remainingPct = remainingPct;
  renderLifeGrid(remainingPct);

  renderDashDate(now);
  renderMomentumLedger(now);
  renderFocusStats();
  updateMissionGateUI(now);

  if (micro.status === "running") {
    renderMicroUI(now);
  }
}

function tick() {
  if (!tickerLeader || document.hidden) {
    stopTicker();
    return;
  }
  const now = Date.now();
  renderFrame(now);
  if (tickerChannel) {
    tickerChannel.postMessage({ type: "tick", now });
  }
  rafId = requestAnimationFrame(tick);
}

function onFollowerTick(now) {
  if (!cachedDates.birth || !cachedDates.death) return;
  renderFrame(now);
  if (micro.status === "running") renderMicroUI(now);
}

function setupTickerChannel() {
  if (typeof BroadcastChannel === "undefined") return;

  tickerChannel = new BroadcastChannel(TICKER_CHANNEL);
  tickerLeader = true;

  tickerChannel.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg || typeof msg.type !== "string") return;

    if (msg.type === "ping" && msg.tabId !== tickerTabId) {
      tickerLeader = false;
      stopTicker();
      tickerChannel.postMessage({ type: "ack", tabId: tickerTabId });
    }
    if (msg.type === "ack" && msg.tabId !== tickerTabId && tickerLeader) {
      tickerLeader = false;
      stopTicker();
    }
    if (msg.type === "leader-yield" && !document.hidden) {
      tickerLeader = true;
      if (config.setupComplete && cachedDates.birth && rafId == null) {
        startTicker();
      }
    }
    if (msg.type === "tick" && !tickerLeader) {
      onFollowerTick(msg.now);
    }
  };

  tickerChannel.postMessage({ type: "ping", tabId: tickerTabId });
  setTimeout(() => {
    if (tickerLeader && config.setupComplete && cachedDates.birth && rafId == null) {
      startTicker();
    }
  }, 80);
}

function startTicker() {
  if (!tickerLeader || document.hidden) return;
  stopTicker();
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  rebuildDateCache();
  if (!cachedDates.birth || !cachedDates.death) return;

  buildLifeGrid();
  resetPrev();
  renderFrame(Date.now());
  renderMicroUI();
  rafId = requestAnimationFrame(tick);

  if (micro.status === "running") {
    startMicroLoop();
  }
}

function initMacro() {
  rebuildDateCache();
  if (!cachedDates.birth || !cachedDates.death) return false;

  buildLifeGrid();
  if (rafId == null) {
    startTicker();
  } else {
    renderFrame(Date.now());
  }
  return true;
}

function stopTicker() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  stopAmbientTick();
}

function showDashboard() {
  dom.dashboard.hidden = false;
  dom.missionInput.value = config.mission ?? "";

  if (!initMacro()) return;

  const macro = calcMacro(cachedDates.birth, cachedDates.death);

  const snapshot = {
    yearsLeft: macro.remainingParts.years,
    expiredPct: macro.expiredPct,
  };
  if (config.customize?.sections?.jolt !== false) {
    dom.jolt.textContent = pickJolt(config, snapshot);
  } else {
    dom.jolt.textContent = "";
  }

  applyCustomize();
  updateAmbientToggleUI();
  syncDriftAnchor();
  renderFocusStats();
  updateMissionGateUI();
  renderTriNode();
}

function handleEscape(e) {
  if (e.key === "Escape" && drawerOpen && !drawerLocked) {
    closeSettingsDrawer();
  }
}

/* ==========================================================================
   15. Init
   ========================================================================== */

function bindEvents() {
  dom.setupForm?.addEventListener("submit", handleSetupSubmit);
  dom.editBtn?.addEventListener("click", () => toggleSettingsDrawer());
  dom.settingsClose?.addEventListener("click", () => closeSettingsDrawer());
  dom.settingsBackdrop?.addEventListener("click", () => closeSettingsDrawer());
  dom.settingsDrawer?.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("keydown", handleEscape);

  dom.previewSoundBtn?.addEventListener("click", () => {
    const previewCustomize = parseCustomizeForm();
    const prevCustomize = config.customize;
    config.customize = { ...prevCustomize, ...previewCustomize };
    playCompletionChime(true);
    config.customize = prevCustomize;
  });

  const liveInputs = [
    dom.inputBirth,
    dom.inputLife,
    dom.inputWorkDayEnd,
    dom.inputColorBg,
    dom.inputColorText,
    dom.inputColorAccent,
    dom.inputColorCrimson,
    dom.inputSound,
    dom.inputHourlyWorth,
    dom.inputShowMs,
    dom.inputMacroClockLabels,
    dom.inputMacroClockDecimal,
    dom.inputShowMacro,
    dom.inputShowMicro,
    dom.inputShowJolt,
    dom.inputShowMission,
    dom.inputShowKnowledge,
    dom.inputFrictionEnabled,
    dom.inputFrictionDelay,
    dom.inputFrictionCustom,
  ];
  dom.distractorPresets?.querySelectorAll('input[type="checkbox"]').forEach((el) => {
    el.addEventListener("change", () => applyLiveSettings());
  });
  liveInputs.forEach((el) => {
    if (!el) return;
    const evt =
      el.type === "checkbox" ||
      el.type === "time" ||
      el.tagName === "SELECT" ||
      el.tagName === "TEXTAREA"
        ? "change"
        : "input";
    el.addEventListener(evt, () => {
      if (
        el === dom.inputColorBg ||
        el === dom.inputColorText ||
        el === dom.inputColorAccent ||
        el === dom.inputColorCrimson
      ) {
        markThemeCustom();
      }
      applyLiveSettings();
    });
  });

  dom.microStart?.addEventListener("click", () => startMicro());
  dom.microPause?.addEventListener("click", () => pauseMicro());
  dom.microReset?.addEventListener("click", () => resetMicro());

  dom.presetBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      selectPreset(parseInt(btn.dataset.seconds, 10));
    });
  });

  dom.missionInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (shouldShowMissionGate()) {
        startFocusFromGate();
      } else {
        commitMission();
      }
    }
  });

  dom.missionInput.addEventListener("input", () => {
    dom.missionInput.classList.remove("is-empty-hint");
    syncDriftAnchor();
    renderMomentumLedger();
    updateMissionGateUI();
  });

  dom.gateStartFocus?.addEventListener("click", () => startFocusFromGate());
  dom.gateIntentionalBrowse?.addEventListener("click", () => startIntentionalBrowse());

  dom.frictionClearBypass?.addEventListener("click", async () => {
    await storageSet({ [FRICTION_BYPASS_KEY]: {} });
    notifyBackground("mementoSync");
  });

  dom.ambientToggle?.addEventListener("click", () => toggleAmbientFocus());

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resetIdleDrift();
      stopTicker();
    } else if (tickerLeader && config.setupComplete && cachedDates.birth) {
      startTicker();
    }
    syncDriftAnchor();
    renderMomentumLedger();
    syncAmbientAudio();
  });

  window.addEventListener("pagehide", () => {
    flushDebouncedSave();
    if (tickerLeader && tickerChannel) {
      tickerChannel.postMessage({ type: "leader-yield" });
    }
  });

  dom.trinodeTabWorld?.addEventListener("click", () => selectTriNodeTab("world"));
  dom.trinodeTabSignal?.addEventListener("click", () => selectTriNodeTab("signal"));
  dom.trinodeTabLife?.addEventListener("click", () => selectTriNodeTab("life"));

  dom.trinodeReshuffle?.addEventListener("click", () => renderTriNode({ force: true }));

  dom.trinodeVectorInput?.addEventListener("input", (e) => {
    signalVector = e.target.value;
    if (vectorDebounceTimer) clearTimeout(vectorDebounceTimer);
    vectorDebounceTimer = setTimeout(async () => {
      try {
        await storageSet({ [SIGNAL_VECTOR_KEY]: signalVector });
      } catch {
        /* ignore */
      }
      if (activeTriNode === "signal") renderTriNode({ force: true });
    }, 300);
  });

  SETTINGS_TAB_ORDER.forEach((tabId) => {
    const tabEl = SETTINGS_TAB_DOM[tabId].tab();
    tabEl?.addEventListener("click", () => selectSettingsTab(tabId, { focusPanel: true }));
  });

  dom.settingsTabs?.addEventListener("keydown", (e) => {
    const idx = SETTINGS_TAB_ORDER.indexOf(activeSettingsTab);
    if (idx < 0) return;

    let nextIdx = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (idx + 1) % SETTINGS_TAB_ORDER.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (idx - 1 + SETTINGS_TAB_ORDER.length) % SETTINGS_TAB_ORDER.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = SETTINGS_TAB_ORDER.length - 1;
    } else {
      return;
    }

    const nextTab = SETTINGS_TAB_ORDER[nextIdx];
    selectSettingsTab(nextTab, { focusPanel: false });
    SETTINGS_TAB_DOM[nextTab].tab()?.focus();
  });

  dom.trinodeLock?.addEventListener("click", () => {
    dom.blockMicro?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  if (hasChromeStorage() && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[MICRO_KEY]) {
        onMicroStorageChanged(changes[MICRO_KEY].newValue);
      }
      if (changes[CONFIG_KEY]?.newValue) {
        config = normalizeConfig(changes[CONFIG_KEY].newValue);
        applyCustomize();
        updateAmbientToggleUI();
        syncAmbientAudio();
      }
      if (changes[KNOWLEDGE_UNLOCK_KEY]) {
        knowledgeUnlockDate = changes[KNOWLEDGE_UNLOCK_KEY].newValue ?? null;
        updateMissionGateUI();
        renderTriNode();
      }
      if (changes[INTENTIONAL_BROWSE_KEY]) {
        const until = changes[INTENTIONAL_BROWSE_KEY].newValue;
        intentionalBrowseUntil =
          typeof until === "number" && until > Date.now() ? until : null;
        updateMissionGateUI();
      }
      if (changes[FOCUS_STATS_KEY]) {
        focusStats = rollFocusStatsToToday(
          normalizeFocusStats(changes[FOCUS_STATS_KEY].newValue)
        );
        renderFocusStats();
      }
    });
  }

  window.addEventListener("storage", (e) => {
    if (e.key === MICRO_KEY && e.newValue) {
      try {
        onMicroStorageChanged(JSON.parse(e.newValue));
      } catch {
        /* ignore */
      }
    }
    if (e.key === KNOWLEDGE_UNLOCK_KEY && e.newValue) {
      try {
        knowledgeUnlockDate = JSON.parse(e.newValue);
        updateMissionGateUI();
        renderTriNode();
      } catch {
        /* ignore */
      }
    }
    if (e.key === INTENTIONAL_BROWSE_KEY) {
      try {
        const until = JSON.parse(e.newValue);
        intentionalBrowseUntil =
          typeof until === "number" && until > Date.now() ? until : null;
        updateMissionGateUI();
      } catch {
        /* ignore */
      }
    }
    if (e.key === FOCUS_STATS_KEY && e.newValue) {
      try {
        focusStats = rollFocusStatsToToday(normalizeFocusStats(JSON.parse(e.newValue)));
        renderFocusStats();
      } catch {
        /* ignore */
      }
    }
  });
}

async function init() {
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  config = await loadConfig();
  micro = await loadMicro();
  await reconcileMicroState();
  if (micro.status === "running" || micro.status === "paused") {
    notifyBackground("mementoSync");
  }
  knowledgeUnlockDate = await loadKnowledgeUnlockDate();
  intentionalBrowseUntil = await loadIntentionalBrowseUntil();
  await loadFocusStats();
  await reconcileMicroState();

  const svResult = await storageGet(SIGNAL_VECTOR_KEY);
  signalVector =
    typeof svResult[SIGNAL_VECTOR_KEY] === "string" ? svResult[SIGNAL_VECTOR_KEY] : "";
  if (dom.trinodeVectorInput) dom.trinodeVectorInput.value = signalVector;

  await loadSeenLedger();

  buildPresetControls();
  bindEvents();
  setupTickerChannel();
  applyCustomize();
  updateAmbientToggleUI();

  dom.dashboard.hidden = false;
  fillSetupForm();

  if (hasChromeStorage()) {
    chrome.runtime.sendMessage({ type: "mementoGetFrictionError" }, (response) => {
      if (response?.error) showFrictionSyncError(response.error);
    });
  }

  if (config.setupComplete && config.birthDate) {
    closeSettingsDrawer({ force: true });
    showDashboard();
  } else {
    openSettingsDrawer({ locked: true });
  }
}

function boot() {
  init().catch((err) => console.error("Memento init failed:", err));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

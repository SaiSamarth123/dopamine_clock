/**
 * Memento — shared pure utilities (new tab, service worker, block page, tests)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.MementoShared = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MS_SECOND = 1000;
  const MS_MINUTE = 60 * MS_SECOND;
  const MS_HOUR = 60 * MS_MINUTE;
  const MS_DAY = 24 * MS_HOUR;
  const MS_YEAR = 365.25 * MS_DAY;

  const MIN_STREAK_SESSION_SEC = 15 * 60;
  const DEFAULT_WORK_DAY_END = "18:00";
  const DEFAULT_FRICTION_DELAY_SEC = 10;
  const MAX_FRICTION_SITES = 999;
  const CONFIG_VERSION = 2;

  const PRESET_DEEP_WORK_SEC = 25 * 60;

  const DEFAULT_FOCUS_STATS = {
    todayISO: null,
    sessionsToday: 0,
    minutesToday: 0,
    streakDays: 0,
    lastCompletedDate: null,
    lastMission: "",
    lastRecordedCompletionAt: null,
  };

  const DEFAULT_MICRO = {
    status: "idle",
    presetSeconds: PRESET_DEEP_WORK_SEC,
    remainingMs: PRESET_DEEP_WORK_SEC * MS_SECOND,
    endTimestamp: null,
    completedAt: null,
  };

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function normalizeHost(raw) {
    let s = String(raw || "")
      .trim()
      .toLowerCase();
    if (!s) return null;
    try {
      if (/^https?:\/\//i.test(s)) {
        s = new URL(s).hostname;
      } else if (s.includes("/")) {
        s = new URL(`https://${s}`).hostname;
      }
    } catch {
      return null;
    }
    s = s.replace(/^www\./, "").replace(/\/+$/, "");
    if (!s || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(s)) return null;
    return s;
  }

  function targetUrlForHost(host) {
    const normalized = normalizeHost(host);
    return normalized ? `https://${normalized}/` : null;
  }

  function getMicroRemaining(micro, now = Date.now()) {
    if (micro?.status === "running" && micro.endTimestamp != null) {
      return Math.max(0, micro.endTimestamp - now);
    }
    if (micro?.status === "paused" && micro.remainingMs != null) {
      return Math.max(0, micro.remainingMs);
    }
    if (micro?.status === "idle") {
      if (micro.completedAt) return 0;
      if (micro.remainingMs != null) return Math.max(0, micro.remainingMs);
    }
    return 0;
  }

  function isMicroExpired(micro, now = Date.now()) {
    return micro?.status === "running" && micro.endTimestamp != null && now >= micro.endTimestamp;
  }

  function buildCompletedMicro(micro, now = Date.now()) {
    const presetSeconds = micro?.presetSeconds ?? PRESET_DEEP_WORK_SEC;
    return {
      ...micro,
      status: "idle",
      remainingMs: presetSeconds * MS_SECOND,
      endTimestamp: null,
      completedAt: now,
    };
  }

  function todayISO(fromDate = new Date()) {
    const d = fromDate instanceof Date ? fromDate : new Date(fromDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function yesterdayISO(fromDate = new Date()) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() - 1);
    return todayISO(d);
  }

  function parseBirthDate(iso) {
    if (!iso) return null;
    const dateOnly = String(iso).trim().slice(0, 10);
    const parts = dateOnly.split("-").map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function deathDateFromBirth(birth, lifeExpectancy) {
    const d = new Date(birth.getTime());
    d.setFullYear(d.getFullYear() + Math.floor(lifeExpectancy));
    return d;
  }

  function calendarAgeFromBirth(birth, now = Date.now()) {
    const asOf = new Date(now);
    let age = asOf.getFullYear() - birth.getFullYear();
    const monthDelta = asOf.getMonth() - birth.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && asOf.getDate() < birth.getDate())) age--;
    return age;
  }

  function parseWorkDayEndTime(value) {
    const raw = String(value ?? DEFAULT_WORK_DAY_END).trim();
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
    if (!m) {
      return { hours: 18, minutes: 0, iso: DEFAULT_WORK_DAY_END };
    }
    const hours = clamp(parseInt(m[1], 10), 0, 23);
    const minutes = clamp(parseInt(m[2], 10), 0, 59);
    return {
      hours,
      minutes,
      iso: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    };
  }

  function normalizeFocusStats(raw) {
    const stats = { ...DEFAULT_FOCUS_STATS, ...(raw || {}) };
    stats.sessionsToday = Math.max(0, Math.floor(Number(stats.sessionsToday) || 0));
    stats.minutesToday = Math.max(0, Math.floor(Number(stats.minutesToday) || 0));
    stats.streakDays = Math.max(0, Math.floor(Number(stats.streakDays) || 0));
    stats.todayISO = typeof stats.todayISO === "string" ? stats.todayISO : null;
    stats.lastCompletedDate =
      typeof stats.lastCompletedDate === "string" ? stats.lastCompletedDate : null;
    stats.lastMission = typeof stats.lastMission === "string" ? stats.lastMission : "";
    stats.lastRecordedCompletionAt =
      typeof stats.lastRecordedCompletionAt === "number" && stats.lastRecordedCompletionAt > 0
        ? stats.lastRecordedCompletionAt
        : null;
    return stats;
  }

  function rollFocusStatsToToday(stats, now = new Date()) {
    const today = todayISO(now);
    if (stats.todayISO === today) return stats;
    return {
      ...stats,
      todayISO: today,
      sessionsToday: 0,
      minutesToday: 0,
    };
  }

  function shouldRecordCompletion(stats, completedAt) {
    if (!completedAt || typeof completedAt !== "number") return false;
    return stats.lastRecordedCompletionAt !== completedAt;
  }

  /**
   * Pure focus-stats update after a timer completion. Idempotent via completedAt.
   */
  function applyFocusSessionComplete(stats, options = {}, now = new Date()) {
    const { presetSeconds = 0, completedAt, mission = "" } = options;
    if (!shouldRecordCompletion(stats, completedAt)) {
      return stats;
    }

    let next = rollFocusStatsToToday(normalizeFocusStats(stats), now);
    next = { ...next, lastRecordedCompletionAt: completedAt };

    if (presetSeconds < MIN_STREAK_SESSION_SEC) {
      return next;
    }

    const minutes = Math.max(1, Math.round(presetSeconds / 60));
    const today = todayISO(now);
    const hadSessionToday = next.lastCompletedDate === today;

    next.sessionsToday += 1;
    next.minutesToday += minutes;

    if (!hadSessionToday) {
      const last = next.lastCompletedDate;
      if (last === yesterdayISO(now)) {
        next.streakDays = Math.max(1, next.streakDays) + 1;
      } else {
        next.streakDays = 1;
      }
      next.lastCompletedDate = today;
    }

    if (mission) next.lastMission = String(mission).trim();
    return next;
  }

  function validateFormData(data) {
    if (!data.birthDate) return "Enter your birth date.";
    const birth = parseBirthDate(data.birthDate);
    if (!birth) return "Enter a valid birth date.";
    if (birth.getTime() > Date.now()) return "Birth date cannot be in the future.";

    const life = parseFloat(data.lifeExpectancy);
    const expectancy = Number.isFinite(life) ? clamp(life, 1, 130) : 80;
    const death = deathDateFromBirth(birth, expectancy);
    if (death.getTime() <= Date.now()) {
      const calendarAge = calendarAgeFromBirth(birth);
      return `Life expectancy must be greater than your age (${calendarAge}).`;
    }

    const sections = data.customize?.sections || {};
    const anySection = Object.values(sections).some(Boolean);
    if (!anySection) return "Enable at least one on-screen section.";

    const friction = data.distractorFriction;
    if (friction?.enabled && friction.sites?.length > MAX_FRICTION_SITES) {
      return `Site friction supports at most ${MAX_FRICTION_SITES} hosts. Remove some sites.`;
    }

    return null;
  }

  function normalizeDistractorFriction(friction, defaultSites) {
    const base = friction && typeof friction === "object" ? friction : {};
    const delay = parseInt(base.delaySeconds, 10);
    const sites = Array.isArray(base.sites) ? base.sites : defaultSites;
    const normalizedSites = [
      ...new Set(sites.map(normalizeHost).filter(Boolean)),
    ].sort();
    const capped = normalizedSites.slice(0, MAX_FRICTION_SITES);
    return {
      enabled: !!base.enabled,
      delaySeconds:
        Number.isFinite(delay) && delay >= 3 && delay <= 60 ? delay : DEFAULT_FRICTION_DELAY_SEC,
      sites: capped.length ? capped : [...defaultSites],
      truncated: normalizedSites.length > MAX_FRICTION_SITES,
    };
  }

  function sanitizeExternalUrl(url) {
    if (!url || typeof url !== "string") return null;
    try {
      const u = new URL(url);
      if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    } catch {
      /* ignore */
    }
    return null;
  }

  function formatBadgeText(remainingMs) {
    if (remainingMs <= 0) return "";
    const mins = Math.ceil(remainingMs / MS_MINUTE);
    if (mins >= 100) return `${Math.floor(mins / 60)}h`;
    return String(mins);
  }

  function shouldShowBadge(micro, remainingMs) {
    return (micro?.status === "running" || micro?.status === "paused") && remainingMs > 0;
  }

  return {
    MS_SECOND,
    MS_MINUTE,
    MS_HOUR,
    MS_DAY,
    MS_YEAR,
    MIN_STREAK_SESSION_SEC,
    DEFAULT_WORK_DAY_END,
    DEFAULT_FRICTION_DELAY_SEC,
    MAX_FRICTION_SITES,
    CONFIG_VERSION,
    PRESET_DEEP_WORK_SEC,
    DEFAULT_FOCUS_STATS,
    DEFAULT_MICRO,
    clamp,
    normalizeHost,
    targetUrlForHost,
    getMicroRemaining,
    isMicroExpired,
    buildCompletedMicro,
    todayISO,
    yesterdayISO,
    parseBirthDate,
    deathDateFromBirth,
    calendarAgeFromBirth,
    parseWorkDayEndTime,
    normalizeFocusStats,
    rollFocusStatsToToday,
    shouldRecordCompletion,
    applyFocusSessionComplete,
    validateFormData,
    normalizeDistractorFriction,
    sanitizeExternalUrl,
    formatBadgeText,
    shouldShowBadge,
  };
});

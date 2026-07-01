const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("normalizeFocusStats", () => {
  it("coerces invalid numbers to zero", () => {
    const stats = S.normalizeFocusStats({
      sessionsToday: -3,
      minutesToday: "bad",
      streakDays: 2.9,
    });
    assert.equal(stats.sessionsToday, 0);
    assert.equal(stats.minutesToday, 0);
    assert.equal(stats.streakDays, 2);
  });
});

describe("rollFocusStatsToToday", () => {
  it("resets daily counters on a new day", () => {
    const now = new Date("2024-06-15T12:00:00");
    const rolled = S.rollFocusStatsToToday(
      S.normalizeFocusStats({
        todayISO: "2024-06-14",
        sessionsToday: 2,
        minutesToday: 50,
        streakDays: 3,
      }),
      now
    );
    assert.equal(rolled.todayISO, "2024-06-15");
    assert.equal(rolled.sessionsToday, 0);
    assert.equal(rolled.minutesToday, 0);
    assert.equal(rolled.streakDays, 3);
  });

  it("keeps counters on the same day", () => {
    const now = new Date("2024-06-15T12:00:00");
    const rolled = S.rollFocusStatsToToday(
      S.normalizeFocusStats({ todayISO: "2024-06-15", sessionsToday: 1 }),
      now
    );
    assert.equal(rolled.sessionsToday, 1);
  });
});

describe("shouldRecordCompletion", () => {
  it("allows first completion and blocks duplicates", () => {
    const stats = S.normalizeFocusStats({});
    const at = 1_700_000_000_000;
    assert.equal(S.shouldRecordCompletion(stats, at), true);
    stats.lastRecordedCompletionAt = at;
    assert.equal(S.shouldRecordCompletion(stats, at), false);
  });
});

describe("applyFocusSessionComplete", () => {
  const completedAt = 1_700_000_000_000;
  const now = new Date("2024-06-15T12:00:00");

  it("is idempotent", () => {
    const stats = S.normalizeFocusStats({
      todayISO: "2024-06-15",
      sessionsToday: 1,
      lastRecordedCompletionAt: completedAt,
    });
    const next = S.applyFocusSessionComplete(
      stats,
      { presetSeconds: 25 * 60, completedAt },
      now
    );
    assert.equal(next.sessionsToday, 1);
  });

  it("increments for 25-min session", () => {
    const stats = S.normalizeFocusStats({ todayISO: "2024-06-15" });
    const next = S.applyFocusSessionComplete(
      stats,
      { presetSeconds: 25 * 60, completedAt, mission: "Ship" },
      now
    );
    assert.equal(next.sessionsToday, 1);
    assert.equal(next.minutesToday, 25);
    assert.equal(next.streakDays, 1);
    assert.equal(next.lastMission, "Ship");
    assert.equal(next.lastCompletedDate, "2024-06-15");
  });

  it("extends streak from yesterday", () => {
    const stats = S.normalizeFocusStats({
      todayISO: "2024-06-15",
      streakDays: 4,
      lastCompletedDate: "2024-06-14",
    });
    const next = S.applyFocusSessionComplete(
      stats,
      { presetSeconds: 25 * 60, completedAt: completedAt + 1 },
      now
    );
    assert.equal(next.streakDays, 5);
  });

  it("resets streak after a gap day", () => {
    const stats = S.normalizeFocusStats({
      todayISO: "2024-06-15",
      streakDays: 10,
      lastCompletedDate: "2024-06-13",
    });
    const next = S.applyFocusSessionComplete(
      stats,
      { presetSeconds: 25 * 60, completedAt: completedAt + 2 },
      now
    );
    assert.equal(next.streakDays, 1);
  });

  it("does not count sessions shorter than 15 minutes", () => {
    const stats = S.normalizeFocusStats({ todayISO: "2024-06-15" });
    const next = S.applyFocusSessionComplete(
      stats,
      { presetSeconds: 5 * 60, completedAt: completedAt + 3 },
      now
    );
    assert.equal(next.sessionsToday, 0);
    assert.equal(next.streakDays, 0);
    assert.equal(next.lastRecordedCompletionAt, completedAt + 3);
  });

  it("counts only one session per day toward streak", () => {
    const stats = S.normalizeFocusStats({
      todayISO: "2024-06-15",
      sessionsToday: 1,
      streakDays: 1,
      lastCompletedDate: "2024-06-15",
    });
    const next = S.applyFocusSessionComplete(
      stats,
      { presetSeconds: 25 * 60, completedAt: completedAt + 4 },
      now
    );
    assert.equal(next.sessionsToday, 2);
    assert.equal(next.streakDays, 1);
  });
});

describe("formatBadgeText / shouldShowBadge", () => {
  it("formats minutes and hours", () => {
    assert.equal(S.formatBadgeText(90_000), "2");
    assert.equal(S.formatBadgeText(3_600_000), "60");
    assert.equal(S.formatBadgeText(7_200_000), "2h");
    assert.equal(S.formatBadgeText(0), "");
  });

  it("shows badge only while running or paused with time left", () => {
    assert.equal(S.shouldShowBadge({ status: "running" }, 60_000), true);
    assert.equal(S.shouldShowBadge({ status: "paused" }, 60_000), true);
    assert.equal(S.shouldShowBadge({ status: "idle" }, 60_000), false);
    assert.equal(S.shouldShowBadge({ status: "running" }, 0), false);
  });
});

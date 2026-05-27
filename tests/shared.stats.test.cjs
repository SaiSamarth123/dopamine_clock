const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

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
    assert.equal(next.streakDays, 1);
  });
});

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("getMicroRemaining", () => {
  it("computes running time", () => {
    const now = 1_000_000;
    const micro = { status: "running", endTimestamp: now + 5000, remainingMs: 0 };
    assert.equal(S.getMicroRemaining(micro, now), 5000);
  });

  it("returns paused remainingMs", () => {
    const micro = { status: "paused", remainingMs: 12_000, endTimestamp: null };
    assert.equal(S.getMicroRemaining(micro), 12_000);
  });

  it("returns remainingMs for idle preset selection", () => {
    const micro = { status: "idle", presetSeconds: 1500, remainingMs: 1500 * 1000 };
    assert.equal(S.getMicroRemaining(micro), 1500 * 1000);
  });

  it("returns zero for idle completed session", () => {
    const micro = {
      status: "idle",
      presetSeconds: 1500,
      remainingMs: 1500 * 1000,
      completedAt: Date.now(),
    };
    assert.equal(S.getMicroRemaining(micro), 0);
  });

  it("never returns negative remaining time", () => {
    const now = 1_000_000;
    const micro = { status: "running", endTimestamp: now - 5000 };
    assert.equal(S.getMicroRemaining(micro, now), 0);
  });
});

describe("isMicroExpired / buildCompletedMicro", () => {
  it("detects expiry and builds idle completed state", () => {
    const now = 5_000_000;
    const micro = { status: "running", presetSeconds: 1500, endTimestamp: now - 1 };
    assert.equal(S.isMicroExpired(micro, now), true);
    const completed = S.buildCompletedMicro(micro, now);
    assert.equal(completed.status, "idle");
    assert.equal(completed.endTimestamp, null);
    assert.equal(completed.completedAt, now);
    assert.equal(completed.remainingMs, 1500 * S.MS_SECOND);
  });

  it("is false for paused or idle timers", () => {
    const now = Date.now();
    assert.equal(S.isMicroExpired({ status: "paused", endTimestamp: now - 1 }, now), false);
    assert.equal(S.isMicroExpired({ status: "idle", endTimestamp: now - 1 }, now), false);
  });
});

describe("targetUrlForHost", () => {
  it("builds https origin for valid hosts", () => {
    assert.equal(S.targetUrlForHost("youtube.com"), "https://youtube.com/");
    assert.equal(S.targetUrlForHost("https://www.reddit.com/r/test"), "https://reddit.com/");
  });

  it("returns null for invalid hosts", () => {
    assert.equal(S.targetUrlForHost(""), null);
    assert.equal(S.targetUrlForHost("not valid"), null);
  });
});

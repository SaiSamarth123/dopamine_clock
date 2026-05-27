const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("getMicroRemaining", () => {
  it("computes running time", () => {
    const now = 1_000_000;
    const micro = { status: "running", endTimestamp: now + 5000, remainingMs: 0 };
    assert.equal(S.getMicroRemaining(micro, now), 5000);
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
});

describe("isMicroExpired", () => {
  it("builds completed micro", () => {
    const now = 5_000_000;
    const micro = { status: "running", presetSeconds: 1500, endTimestamp: now - 1 };
    assert.equal(S.isMicroExpired(micro, now), true);
    assert.equal(S.buildCompletedMicro(micro, now).status, "idle");
  });
});

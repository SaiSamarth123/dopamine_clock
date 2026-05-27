const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("normalizeDistractorFriction", () => {
  it("caps sites", () => {
    const sites = Array.from({ length: 1100 }, (_, i) => `host${i}.com`);
    const out = S.normalizeDistractorFriction(
      { enabled: true, sites },
      ["youtube.com"]
    );
    assert.equal(out.sites.length, S.MAX_FRICTION_SITES);
    assert.equal(out.truncated, true);
  });
});

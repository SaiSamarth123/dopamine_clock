const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("normalizeHost", () => {
  it("strips protocol and www", () => {
    assert.equal(S.normalizeHost("https://www.YouTube.com/watch"), "youtube.com");
  });

  it("rejects invalid hosts", () => {
    assert.equal(S.normalizeHost(""), null);
    assert.equal(S.normalizeHost("not a host!"), null);
  });
});

describe("sanitizeExternalUrl", () => {
  it("allows http and https only", () => {
    assert.equal(S.sanitizeExternalUrl("https://dev.to/a"), "https://dev.to/a");
    assert.equal(S.sanitizeExternalUrl("javascript:evil"), null);
  });
});

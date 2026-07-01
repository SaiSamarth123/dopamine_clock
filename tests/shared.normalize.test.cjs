const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("normalizeHost", () => {
  it("strips protocol and www", () => {
    assert.equal(S.normalizeHost("https://www.YouTube.com/watch"), "youtube.com");
    assert.equal(S.normalizeHost("http://reddit.com/r/all"), "reddit.com");
  });

  it("accepts bare domains and paths", () => {
    assert.equal(S.normalizeHost("example.com/path"), "example.com");
    assert.equal(S.normalizeHost("sub.domain.co.uk"), "sub.domain.co.uk");
  });

  it("rejects invalid hosts", () => {
    assert.equal(S.normalizeHost(""), null);
    assert.equal(S.normalizeHost("not a host!"), null);
    assert.equal(S.normalizeHost("-bad.com"), null);
    assert.equal(S.normalizeHost("javascript:alert(1)"), null);
  });
});

describe("sanitizeExternalUrl", () => {
  it("allows http and https only", () => {
    assert.equal(S.sanitizeExternalUrl("https://dev.to/a"), "https://dev.to/a");
    assert.equal(S.sanitizeExternalUrl("http://example.com"), "http://example.com/");
  });

  it("rejects dangerous or invalid URLs", () => {
    assert.equal(S.sanitizeExternalUrl("javascript:evil"), null);
    assert.equal(S.sanitizeExternalUrl("data:text/html,hi"), null);
    assert.equal(S.sanitizeExternalUrl(""), null);
    assert.equal(S.sanitizeExternalUrl(null), null);
  });
});

describe("clamp", () => {
  it("bounds values", () => {
    assert.equal(S.clamp(5, 0, 10), 5);
    assert.equal(S.clamp(-1, 0, 10), 0);
    assert.equal(S.clamp(99, 0, 10), 10);
  });
});

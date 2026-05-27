const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("parseBirthDate", () => {
  it("parses ISO date", () => {
    const d = S.parseBirthDate("1990-06-15");
    assert.ok(d);
    assert.equal(d.getFullYear(), 1990);
  });
});

describe("validateFormData", () => {
  const base = {
    birthDate: "1990-01-01",
    lifeExpectancy: 80,
    customize: { sections: { macro: true } },
    distractorFriction: { enabled: false, sites: [] },
  };

  it("accepts valid data", () => {
    assert.equal(S.validateFormData(base), null);
  });

  it("rejects too many friction sites", () => {
    const sites = Array.from({ length: 1000 }, (_, i) => `site${i}.com`);
    const err = S.validateFormData({
      ...base,
      distractorFriction: { enabled: true, sites },
    });
    assert.match(err, /999/);
  });
});

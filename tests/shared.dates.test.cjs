const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { S } = require("./helpers.cjs");

describe("parseBirthDate", () => {
  it("parses ISO date", () => {
    const d = S.parseBirthDate("1990-06-15");
    assert.ok(d);
    assert.equal(d.getFullYear(), 1990);
    assert.equal(d.getMonth(), 5);
    assert.equal(d.getDate(), 15);
  });

  it("rejects non-ISO garbage", () => {
    assert.equal(S.parseBirthDate(""), null);
    assert.equal(S.parseBirthDate("not-a-date"), null);
    assert.equal(S.parseBirthDate("abc-def-ghi"), null);
  });
});

describe("calendarAgeFromBirth", () => {
  it("computes age before birthday in the year", () => {
    const birth = S.parseBirthDate("1990-12-31");
    const now = new Date("2024-06-15T12:00:00").getTime();
    assert.equal(S.calendarAgeFromBirth(birth, now), 33);
  });

  it("computes age after birthday in the year", () => {
    const birth = S.parseBirthDate("1990-01-01");
    const now = new Date("2024-06-15T12:00:00").getTime();
    assert.equal(S.calendarAgeFromBirth(birth, now), 34);
  });
});

describe("deathDateFromBirth", () => {
  it("adds calendar years to birth date", () => {
    const birth = S.parseBirthDate("1990-06-15");
    const death = S.deathDateFromBirth(birth, 85);
    assert.equal(death.getFullYear(), 2075);
    assert.equal(death.getMonth(), 5);
    assert.equal(death.getDate(), 15);
  });
});

describe("parseWorkDayEndTime", () => {
  it("parses HH:MM", () => {
    assert.deepEqual(S.parseWorkDayEndTime("09:30"), { hours: 9, minutes: 30, iso: "09:30" });
  });

  it("clamps out-of-range values", () => {
    assert.deepEqual(S.parseWorkDayEndTime("25:99"), { hours: 23, minutes: 59, iso: "23:59" });
  });

  it("falls back to default for invalid input", () => {
    assert.deepEqual(S.parseWorkDayEndTime("invalid"), {
      hours: 18,
      minutes: 0,
      iso: "18:00",
    });
  });
});

describe("todayISO / yesterdayISO", () => {
  it("formats local calendar dates", () => {
    const now = new Date("2024-06-15T12:00:00");
    assert.equal(S.todayISO(now), "2024-06-15");
    assert.equal(S.yesterdayISO(now), "2024-06-14");
  });
});

describe("validateFormData", () => {
  const base = {
    birthDate: "1990-01-01",
    lifeExpectancy: 80,
    customize: {},
  };

  it("accepts valid data", () => {
    assert.equal(S.validateFormData(base), null);
  });

  it("rejects missing birth date", () => {
    assert.match(S.validateFormData({ ...base, birthDate: "" }), /birth date/i);
  });

  it("rejects invalid birth date", () => {
    assert.match(S.validateFormData({ ...base, birthDate: "bad" }), /valid birth date/i);
  });

  it("rejects future birth date", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const iso = `${future.getFullYear()}-01-01`;
    assert.match(S.validateFormData({ ...base, birthDate: iso }), /future/i);
  });

  it("rejects life expectancy at or below current age", () => {
    const err = S.validateFormData({
      ...base,
      birthDate: "1990-01-01",
      lifeExpectancy: 30,
    });
    assert.match(err, /life expectancy must be greater/i);
    assert.match(err, /\d+/);
  });
});

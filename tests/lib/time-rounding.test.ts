import { describe, it, expect } from "vitest";
import { roundMinutes, roundTime, type RoundingRule } from "@/lib/time-rounding";

// ---------------------------------------------------------------------------
// roundMinutes
// ---------------------------------------------------------------------------

describe("roundMinutes", () => {
  describe("NONE rule", () => {
    it("returns the original value unchanged", () => {
      expect(roundMinutes(7, "NONE")).toBe(7);
      expect(roundMinutes(0, "NONE")).toBe(0);
      expect(roundMinutes(59, "NONE")).toBe(59);
      expect(roundMinutes(33, "NONE")).toBe(33);
    });
  });

  describe("NEAREST_5 rule", () => {
    it("rounds 7 down to 5", () => {
      expect(roundMinutes(7, "NEAREST_5")).toBe(5);
    });

    it("rounds 8 up to 10", () => {
      expect(roundMinutes(8, "NEAREST_5")).toBe(10);
    });

    it("rounds 12 down to 10", () => {
      expect(roundMinutes(12, "NEAREST_5")).toBe(10);
    });

    it("rounds 13 up to 15", () => {
      expect(roundMinutes(13, "NEAREST_5")).toBe(15);
    });

    it("returns 0 unchanged", () => {
      expect(roundMinutes(0, "NEAREST_5")).toBe(0);
    });

    it("returns exact multiples unchanged", () => {
      expect(roundMinutes(5, "NEAREST_5")).toBe(5);
      expect(roundMinutes(30, "NEAREST_5")).toBe(30);
      expect(roundMinutes(55, "NEAREST_5")).toBe(55);
    });
  });

  describe("NEAREST_15 rule", () => {
    it("rounds 7 down to 0", () => {
      expect(roundMinutes(7, "NEAREST_15")).toBe(0);
    });

    it("rounds 8 up to 15", () => {
      expect(roundMinutes(8, "NEAREST_15")).toBe(15);
    });

    it("rounds 22 down to 15", () => {
      expect(roundMinutes(22, "NEAREST_15")).toBe(15);
    });

    it("rounds 23 up to 30", () => {
      expect(roundMinutes(23, "NEAREST_15")).toBe(30);
    });

    it("rounds 37 down to 30", () => {
      expect(roundMinutes(37, "NEAREST_15")).toBe(30);
    });

    it("rounds 38 up to 45", () => {
      expect(roundMinutes(38, "NEAREST_15")).toBe(45);
    });

    it("returns exact multiples unchanged", () => {
      expect(roundMinutes(0, "NEAREST_15")).toBe(0);
      expect(roundMinutes(15, "NEAREST_15")).toBe(15);
      expect(roundMinutes(30, "NEAREST_15")).toBe(30);
      expect(roundMinutes(45, "NEAREST_15")).toBe(45);
    });
  });

  describe("NEAREST_30 rule", () => {
    it("rounds 14 down to 0", () => {
      expect(roundMinutes(14, "NEAREST_30")).toBe(0);
    });

    it("rounds 15 up to 30", () => {
      expect(roundMinutes(15, "NEAREST_30")).toBe(30);
    });

    it("rounds 44 down to 30", () => {
      expect(roundMinutes(44, "NEAREST_30")).toBe(30);
    });

    it("rounds 45 up to 60", () => {
      expect(roundMinutes(45, "NEAREST_30")).toBe(60);
    });

    it("returns 0 unchanged", () => {
      expect(roundMinutes(0, "NEAREST_30")).toBe(0);
    });

    it("returns exact multiples unchanged", () => {
      expect(roundMinutes(30, "NEAREST_30")).toBe(30);
      expect(roundMinutes(60, "NEAREST_30")).toBe(60);
    });
  });
});

// ---------------------------------------------------------------------------
// roundTime
// ---------------------------------------------------------------------------

describe("roundTime", () => {
  it("NONE returns a new Date with the same timestamp", () => {
    const original = new Date("2026-04-01T09:07:00.000Z");
    const result = roundTime(original, "NONE");
    expect(result.getTime()).toBe(original.getTime());
    // Must be a new object, not the same reference
    expect(result).not.toBe(original);
  });

  it("NEAREST_15: rounds a date's minutes down to the previous 15", () => {
    // 09:07 UTC → rounds to 09:00
    const input = new Date("2026-04-01T09:07:00.000Z");
    const result = roundTime(input, "NEAREST_15");
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it("NEAREST_15: rounds a date's minutes up to the next 15", () => {
    // 09:08 UTC → rounds to 09:15
    const input = new Date("2026-04-01T09:08:00.000Z");
    const result = roundTime(input, "NEAREST_15");
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(15);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it("NEAREST_15: already on a 15-minute boundary stays the same", () => {
    const input = new Date("2026-04-01T10:30:00.000Z");
    const result = roundTime(input, "NEAREST_15");
    expect(result.getUTCHours()).toBe(10);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it("NEAREST_30: rounds down when minutes < 15", () => {
    // 09:14 UTC → rounds to 09:00
    const input = new Date("2026-04-01T09:14:00.000Z");
    const result = roundTime(input, "NEAREST_30");
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("NEAREST_30: rounds up when minutes = 15", () => {
    // 09:15 UTC → rounds to 09:30
    const input = new Date("2026-04-01T09:15:00.000Z");
    const result = roundTime(input, "NEAREST_30");
    expect(result.getUTCHours()).toBe(9);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it("NEAREST_30: rounds up when minutes = 45, crossing the hour", () => {
    // 09:45 UTC → rounds to 10:00
    const input = new Date("2026-04-01T09:45:00.000Z");
    const result = roundTime(input, "NEAREST_30");
    expect(result.getUTCHours()).toBe(10);
    expect(result.getUTCMinutes()).toBe(0);
  });

  it("NEAREST_30: already on a 30-minute boundary stays the same", () => {
    const input = new Date("2026-04-01T11:30:00.000Z");
    const result = roundTime(input, "NEAREST_30");
    expect(result.getUTCHours()).toBe(11);
    expect(result.getUTCMinutes()).toBe(30);
  });

  it("NEAREST_5: rounds minutes correctly", () => {
    // 09:07 UTC → rounds to 09:05
    const input = new Date("2026-04-01T09:07:00.000Z");
    const result = roundTime(input, "NEAREST_5");
    expect(result.getUTCMinutes()).toBe(5);
  });

  it("returns a Date instance, not a primitive", () => {
    const input = new Date("2026-04-01T09:00:00.000Z");
    const result = roundTime(input, "NEAREST_15");
    expect(result).toBeInstanceOf(Date);
  });
});

import { describe, it, expect } from "vitest";
import { timeToDecimal, decimalToTime, getBarStyle, TIME_OPTIONS } from "@/lib/schedule-time-utils";

describe("timeToDecimal", () => {
  it('converts "9:00 AM" to 9.0', () => {
    expect(timeToDecimal("9:00 AM")).toBe(9.0);
  });

  it('converts "12:00 PM" to 12.0', () => {
    expect(timeToDecimal("12:00 PM")).toBe(12.0);
  });

  it('converts "12:00 AM" to 0', () => {
    expect(timeToDecimal("12:00 AM")).toBe(0);
  });

  it('converts "1:30 PM" to 13.5', () => {
    expect(timeToDecimal("1:30 PM")).toBe(13.5);
  });

  it('converts "11:45 AM" to 11.75', () => {
    expect(timeToDecimal("11:45 AM")).toBe(11.75);
  });

  it("returns 0 for an empty string", () => {
    expect(timeToDecimal("")).toBe(0);
  });

  it("returns 0 for an invalid format", () => {
    expect(timeToDecimal("not-a-time")).toBe(0);
  });
});

describe("decimalToTime", () => {
  it("converts 9.0 to \"9:00 AM\"", () => {
    expect(decimalToTime(9.0)).toBe("9:00 AM");
  });

  it("converts 13.5 to \"1:30 PM\"", () => {
    expect(decimalToTime(13.5)).toBe("1:30 PM");
  });

  it("converts 12.0 to \"12:00 PM\"", () => {
    expect(decimalToTime(12.0)).toBe("12:00 PM");
  });

  it("converts 0 to \"12:00 AM\"", () => {
    expect(decimalToTime(0)).toBe("12:00 AM");
  });

  it("converts 17.25 to \"5:15 PM\"", () => {
    expect(decimalToTime(17.25)).toBe("5:15 PM");
  });
});

describe("getBarStyle", () => {
  // businessStart=8, businessEnd=20, totalHours=12

  it("returns correct left% and width% for a standard 9AM-5PM shift", () => {
    // start=9, end=17
    // left = (9-8)/12 * 100 = 8.333...%
    // width = (17-9)/12 * 100 = 66.666...%
    const style = getBarStyle("9:00 AM", "5:00 PM");
    expect(style.left).toBe(`${(1 / 12) * 100}%`);
    expect(style.width).toBe(`${(8 / 12) * 100}%`);
  });

  it("clamps shift starting before business hours to 0% left", () => {
    // start=6 clamped to 8 → left=0%
    // end=17 → width = (17-8)/12 * 100 = 75%
    const style = getBarStyle("6:00 AM", "5:00 PM");
    expect(style.left).toBe("0%");
    expect(style.width).toBe(`${(9 / 12) * 100}%`);
  });

  it("clamps shift ending after business hours to 100% right edge", () => {
    // start=9 → left = (9-8)/12 * 100 = 8.333...%
    // end=21 clamped to 20 → width = (20-9)/12 * 100 = 91.666...%
    const style = getBarStyle("9:00 AM", "9:00 PM");
    expect(style.left).toBe(`${(1 / 12) * 100}%`);
    expect(style.width).toBe(`${(11 / 12) * 100}%`);
  });

  it("returns 0% left and 100% width for a full business day shift (8AM-8PM)", () => {
    const style = getBarStyle("8:00 AM", "8:00 PM");
    expect(style.left).toBe("0%");
    expect(style.width).toBe("100%");
  });
});

describe("TIME_OPTIONS", () => {
  it("is an array", () => {
    expect(Array.isArray(TIME_OPTIONS)).toBe(true);
  });

  it('starts with "7:00 AM"', () => {
    expect(TIME_OPTIONS[0]).toBe("7:00 AM");
  });

  it('ends with "8:00 PM"', () => {
    expect(TIME_OPTIONS[TIME_OPTIONS.length - 1]).toBe("8:00 PM");
  });

  it('contains "12:00 PM"', () => {
    expect(TIME_OPTIONS).toContain("12:00 PM");
  });

  it("has 27 entries covering 7AM-8PM in 30-minute increments", () => {
    // 7:00 AM to 8:00 PM = 13 hours × 2 slots/hour + 1 = 27
    expect(TIME_OPTIONS).toHaveLength(27);
  });
});

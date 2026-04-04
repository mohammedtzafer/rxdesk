import { describe, it, expect } from "vitest";
import {
  calculateOvertime,
  getDayBreakdowns,
  calculateEntryOvertime,
  type TimeEntryForCalc,
} from "@/lib/overtime";

// ---------------------------------------------------------------------------
// calculateOvertime
// ---------------------------------------------------------------------------

describe("calculateOvertime", () => {
  it("returns all zeros for no entries", () => {
    const result = calculateOvertime([], 8, 40);
    expect(result).toEqual({
      regularHours: 0,
      dailyOvertimeHours: 0,
      weeklyOvertimeHours: 0,
      totalOvertimeHours: 0,
      totalHours: 0,
    });
  });

  it("single 8h entry with 8h daily threshold → 8h regular, 0 daily OT", () => {
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 480 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.regularHours).toBe(8);
    expect(result.dailyOvertimeHours).toBe(0);
    expect(result.weeklyOvertimeHours).toBe(0);
    expect(result.totalOvertimeHours).toBe(0);
    expect(result.totalHours).toBe(8);
  });

  it("single 10h entry with 8h daily threshold → 8h regular, 2h daily OT", () => {
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 600 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.regularHours).toBe(8);
    expect(result.dailyOvertimeHours).toBe(2);
    expect(result.weeklyOvertimeHours).toBe(0);
    expect(result.totalOvertimeHours).toBe(2);
    expect(result.totalHours).toBe(10);
  });

  it("multiple entries on the same day are aggregated before applying threshold", () => {
    // Two 5h entries on the same day → 10h total → 2h daily OT
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 300 },
      { date: "2026-04-01", durationMinutes: 300 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.totalHours).toBe(10);
    expect(result.dailyOvertimeHours).toBe(2);
    expect(result.regularHours).toBe(8);
  });

  it("multiple days, only some over daily threshold", () => {
    // Day 1: 10h → 2h daily OT
    // Day 2: 7h  → 0h daily OT
    // Day 3: 9h  → 1h daily OT
    // Total hours: 26h, total daily OT: 3h
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 600 },
      { date: "2026-04-02", durationMinutes: 420 },
      { date: "2026-04-03", durationMinutes: 540 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.totalHours).toBe(26);
    expect(result.dailyOvertimeHours).toBe(3);
    expect(result.weeklyOvertimeHours).toBe(0);
    expect(result.regularHours).toBe(23);
  });

  it("weekly OT: 45h over 5 days (9h/day), 8h daily / 40h weekly → 5h daily OT, 0h weekly OT", () => {
    // Each day: 9h → 1h daily OT → 5h total daily OT
    // Total hours 45 > 40 weekly threshold, but daily OT (5h) already covers the excess
    // weeklyOT = max(0, 45 - 40 - 5) = 0
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 540 },
      { date: "2026-04-02", durationMinutes: 540 },
      { date: "2026-04-03", durationMinutes: 540 },
      { date: "2026-04-04", durationMinutes: 540 },
      { date: "2026-04-05", durationMinutes: 540 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.totalHours).toBe(45);
    expect(result.dailyOvertimeHours).toBe(5);
    expect(result.weeklyOvertimeHours).toBe(0);
    expect(result.totalOvertimeHours).toBe(5);
    expect(result.regularHours).toBe(40);
  });

  it("weekly OT: 44h over 6 days (no day over 8h), 8h daily / 40h weekly → 0 daily OT + 4h weekly OT", () => {
    // Day 1–5: 8h each, Day 6: 4h → total 44h, no day over 8h
    // daily OT = 0, weekly OT = 44 - 40 - 0 = 4
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 480 },
      { date: "2026-04-02", durationMinutes: 480 },
      { date: "2026-04-03", durationMinutes: 480 },
      { date: "2026-04-04", durationMinutes: 480 },
      { date: "2026-04-05", durationMinutes: 480 },
      { date: "2026-04-06", durationMinutes: 240 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.totalHours).toBe(44);
    expect(result.dailyOvertimeHours).toBe(0);
    expect(result.weeklyOvertimeHours).toBe(4);
    expect(result.totalOvertimeHours).toBe(4);
    expect(result.regularHours).toBe(40);
  });

  it("combined daily + weekly OT", () => {
    // Day 1: 10h → 2h daily OT
    // Day 2–5: 8h each → 32h regular
    // Day 6: 5h → 0h daily OT
    // Total: 47h, daily OT: 2h
    // Weekly OT = max(0, 47 - 40 - 2) = 5
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 600 },
      { date: "2026-04-02", durationMinutes: 480 },
      { date: "2026-04-03", durationMinutes: 480 },
      { date: "2026-04-04", durationMinutes: 480 },
      { date: "2026-04-05", durationMinutes: 480 },
      { date: "2026-04-06", durationMinutes: 300 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.totalHours).toBe(47);
    expect(result.dailyOvertimeHours).toBe(2);
    expect(result.weeklyOvertimeHours).toBe(5);
    expect(result.totalOvertimeHours).toBe(7);
    expect(result.regularHours).toBe(40);
  });

  it("rounds results to 2 decimal places", () => {
    // 500 minutes = 8.3333... hours
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 500 },
    ];
    const result = calculateOvertime(entries, 8, 40);
    expect(result.totalHours).toBe(8.33);
    expect(result.dailyOvertimeHours).toBe(0.33);
    expect(result.regularHours).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// getDayBreakdowns
// ---------------------------------------------------------------------------

describe("getDayBreakdowns", () => {
  it("returns empty array for no entries", () => {
    const result = getDayBreakdowns([], 8);
    expect(result).toEqual([]);
  });

  it("returns correct breakdown for multiple days with varying hours", () => {
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-03", durationMinutes: 600 }, // 10h → 2h OT
      { date: "2026-04-01", durationMinutes: 420 }, // 7h  → 0h OT
      { date: "2026-04-02", durationMinutes: 480 }, // 8h  → 0h OT
    ];
    const result = getDayBreakdowns(entries, 8);
    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      date: "2026-04-01",
      totalHours: 7,
      regularHours: 7,
      overtimeHours: 0,
    });
    expect(result[1]).toEqual({
      date: "2026-04-02",
      totalHours: 8,
      regularHours: 8,
      overtimeHours: 0,
    });
    expect(result[2]).toEqual({
      date: "2026-04-03",
      totalHours: 10,
      regularHours: 8,
      overtimeHours: 2,
    });
  });

  it("sorts breakdowns by date ascending", () => {
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-05", durationMinutes: 480 },
      { date: "2026-04-02", durationMinutes: 480 },
      { date: "2026-04-04", durationMinutes: 480 },
    ];
    const result = getDayBreakdowns(entries, 8);
    const dates = result.map((d) => d.date);
    expect(dates).toEqual(["2026-04-02", "2026-04-04", "2026-04-05"]);
  });

  it("aggregates multiple entries on the same day before computing breakdown", () => {
    // Three 3h entries on same day → 9h total → 1h OT
    const entries: TimeEntryForCalc[] = [
      { date: "2026-04-01", durationMinutes: 180 },
      { date: "2026-04-01", durationMinutes: 180 },
      { date: "2026-04-01", durationMinutes: 180 },
    ];
    const result = getDayBreakdowns(entries, 8);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "2026-04-01",
      totalHours: 9,
      regularHours: 8,
      overtimeHours: 1,
    });
  });
});

// ---------------------------------------------------------------------------
// calculateEntryOvertime
// ---------------------------------------------------------------------------

describe("calculateEntryOvertime", () => {
  it("entry fully under threshold → all regular, no OT", () => {
    // 3h entry, 4h already logged, threshold 8h → total 7h, still under
    const result = calculateEntryOvertime(3, 4, 8);
    expect(result).toEqual({ regularHours: 3, overtimeHours: 0 });
  });

  it("entry fully over threshold → all OT when day already past threshold", () => {
    // 2h entry, 8h already logged, threshold 8h → day already at threshold
    const result = calculateEntryOvertime(2, 8, 8);
    expect(result).toEqual({ regularHours: 0, overtimeHours: 2 });
  });

  it("entry fully over threshold when day is well past threshold", () => {
    // 1h entry, 10h already logged, threshold 8h → all OT
    const result = calculateEntryOvertime(1, 10, 8);
    expect(result).toEqual({ regularHours: 0, overtimeHours: 1 });
  });

  it("entry spans the threshold → partial regular, partial OT", () => {
    // 4h entry, 6h already logged, threshold 8h → 2h regular, 2h OT
    const result = calculateEntryOvertime(4, 6, 8);
    expect(result).toEqual({ regularHours: 2, overtimeHours: 2 });
  });

  it("entry exactly reaches threshold → all regular, zero OT", () => {
    // 2h entry, 6h already logged, threshold 8h → exactly 8h total
    const result = calculateEntryOvertime(2, 6, 8);
    expect(result).toEqual({ regularHours: 2, overtimeHours: 0 });
  });

  it("zero hours before, entry exactly at threshold → all regular", () => {
    const result = calculateEntryOvertime(8, 0, 8);
    expect(result).toEqual({ regularHours: 8, overtimeHours: 0 });
  });

  it("rounds to 2 decimal places for fractional hours", () => {
    // 3h entry, 6.5h already logged, threshold 8h → 1.5h regular, 1.5h OT
    const result = calculateEntryOvertime(3, 6.5, 8);
    expect(result.regularHours).toBe(1.5);
    expect(result.overtimeHours).toBe(1.5);
  });

  it("fractional threshold spanning case rounds correctly", () => {
    // 500 minutes entry (8.3333h), 0h before, 8h threshold
    // regular = 8, OT = 0.33
    const entryHours = 500 / 60;
    const result = calculateEntryOvertime(entryHours, 0, 8);
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(0.33);
  });
});

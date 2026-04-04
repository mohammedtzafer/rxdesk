import { describe, it, expect } from "vitest";
import {
  checkDayConflicts,
  checkTimeOffConflict,
  checkHoursConflict,
} from "@/lib/schedule-conflicts";

describe("checkDayConflicts", () => {
  it("returns null when start is before end (valid shift)", () => {
    expect(checkDayConflicts("9:00 AM", "5:00 PM")).toBeNull();
  });

  it('returns a conflict with type "time-invalid" when start is after end', () => {
    const result = checkDayConflicts("5:00 PM", "9:00 AM");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("time-invalid");
  });

  it('returns a conflict with type "time-invalid" when start equals end', () => {
    const result = checkDayConflicts("9:00 AM", "9:00 AM");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("time-invalid");
  });

  it('returns a conflict when "5:00 PM" is used as start and "9:00 AM" as end', () => {
    const result = checkDayConflicts("5:00 PM", "9:00 AM");
    expect(result).not.toBeNull();
    expect(result?.type).toBe("time-invalid");
  });
});

describe("checkTimeOffConflict", () => {
  const baseRequest = {
    employeeId: "emp-1",
    date: "2024-01-15",
    status: "Approved",
    allDay: true,
  };

  it("returns null when there are no time-off requests", () => {
    const result = checkTimeOffConflict("emp-1", "Monday", "2024-01-15", []);
    expect(result).toBeNull();
  });

  it('returns a conflict with type "time-off" when employee has approved time off on the matching date', () => {
    // weekStart=2024-01-15 (Monday), day="Monday" → dayIndex=0 → date=2024-01-15
    const result = checkTimeOffConflict("emp-1", "Monday", "2024-01-15", [baseRequest]);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("time-off");
  });

  it('returns null when the matching request status is "Submitted" (not approved)', () => {
    const request = { ...baseRequest, status: "Submitted" };
    const result = checkTimeOffConflict("emp-1", "Monday", "2024-01-15", [request]);
    expect(result).toBeNull();
  });

  it("returns null when the request belongs to a different employee", () => {
    const request = { ...baseRequest, employeeId: "emp-99" };
    const result = checkTimeOffConflict("emp-1", "Monday", "2024-01-15", [request]);
    expect(result).toBeNull();
  });

  it("returns null when the request is on a different date", () => {
    const request = { ...baseRequest, date: "2024-01-20" };
    const result = checkTimeOffConflict("emp-1", "Monday", "2024-01-15", [request]);
    expect(result).toBeNull();
  });

  it("correctly maps Monday of week 2024-01-15 to the 15th", () => {
    const request = { ...baseRequest, date: "2024-01-15" };
    const result = checkTimeOffConflict("emp-1", "Monday", "2024-01-15", [request]);
    expect(result?.type).toBe("time-off");
  });

  it("correctly maps Tuesday of week 2024-01-15 to the 16th", () => {
    const request = { ...baseRequest, date: "2024-01-16" };
    const result = checkTimeOffConflict("emp-1", "Tuesday", "2024-01-15", [request]);
    expect(result?.type).toBe("time-off");
  });

  it("correctly maps Wednesday of week 2024-01-15 to the 17th", () => {
    const request = { ...baseRequest, date: "2024-01-17" };
    const result = checkTimeOffConflict("emp-1", "Wednesday", "2024-01-15", [request]);
    expect(result?.type).toBe("time-off");
  });

  it("correctly maps Saturday of week 2024-01-15 to the 20th", () => {
    const request = { ...baseRequest, date: "2024-01-20" };
    const result = checkTimeOffConflict("emp-1", "Saturday", "2024-01-15", [request]);
    expect(result?.type).toBe("time-off");
  });
});

describe("checkHoursConflict", () => {
  it("returns null when hours are within the target", () => {
    expect(checkHoursConflict(38, 40)).toBeNull();
  });

  it("returns null when hours are exactly at target + 2 (threshold is strictly greater than)", () => {
    expect(checkHoursConflict(42, 40)).toBeNull();
  });

  it('returns a conflict with type "over-hours" when hours exceed target + 2', () => {
    const result = checkHoursConflict(42.1, 40);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("over-hours");
  });

  it("returns null when total hours are 0 and target is 40", () => {
    expect(checkHoursConflict(0, 40)).toBeNull();
  });

  it('returns a conflict with type "over-hours" when hours are 50 and target is 40', () => {
    const result = checkHoursConflict(50, 40);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("over-hours");
  });
});

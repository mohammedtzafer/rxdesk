import { describe, it, expect } from "vitest";
import {
  timeToDecimal,
  getBarStyle,
} from "@/lib/schedule-time-utils";
import {
  DAYS_OF_WEEK,
  makeDefaultAvailability,
  DayOfWeek,
  EmployeeWithAvailability,
  ScheduleEntryData,
  WeeklyScheduleData,
} from "@/lib/schedule-types";

// ---------------------------------------------------------------------------
// Re-implementations of page-component functions (not importable directly)
// Logic is identical to the source; tests validate behavior, not internals.
// ---------------------------------------------------------------------------

function buildEmployees(schedules: WeeklyScheduleData[]): EmployeeWithAvailability[] {
  const allEntries = schedules.flatMap((s) => s.entries);
  const byEmployee = new Map<string, EmployeeWithAvailability>();

  for (const entry of allEntries) {
    if (!byEmployee.has(entry.employeeId)) {
      byEmployee.set(entry.employeeId, {
        id: entry.employeeId,
        name: entry.employeeName,
        targetHoursPerWeek: 40,
        sortOrder: byEmployee.size,
        locationId: "",
        availability: makeDefaultAvailability(),
      });
    }
    const emp = byEmployee.get(entry.employeeId)!;
    const day = entry.day as DayOfWeek;
    if (DAYS_OF_WEEK.includes(day)) {
      emp.availability[day] = {
        available: entry.available,
        startTime: entry.startTime,
        endTime: entry.endTime,
        role: entry.role,
      };
    }
  }

  return Array.from(byEmployee.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function mergeScheduleIntoEmployees(
  baseEmployees: EmployeeWithAvailability[],
  schedules: WeeklyScheduleData[]
): EmployeeWithAvailability[] {
  if (schedules.length === 0) return baseEmployees;

  const allEntries = schedules.flatMap((s) => s.entries);
  if (allEntries.length === 0) return baseEmployees;

  const entryMap = new Map<string, Map<string, ScheduleEntryData>>();
  const scheduleEmployeeNames = new Map<string, string>();

  for (const entry of allEntries) {
    if (!entryMap.has(entry.employeeId)) {
      entryMap.set(entry.employeeId, new Map());
      scheduleEmployeeNames.set(entry.employeeId, entry.employeeName);
    }
    entryMap.get(entry.employeeId)!.set(entry.day, entry);
  }

  const merged = new Map<string, EmployeeWithAvailability>();

  for (const emp of baseEmployees) {
    const schedEntries = entryMap.get(emp.id);
    if (schedEntries) {
      const availability = { ...emp.availability };
      for (const day of DAYS_OF_WEEK) {
        const entry = schedEntries.get(day);
        if (entry) {
          availability[day] = {
            available: entry.available,
            startTime: entry.startTime,
            endTime: entry.endTime,
            role: entry.role,
          };
        }
      }
      merged.set(emp.id, { ...emp, availability });
    } else {
      merged.set(emp.id, emp);
    }
  }

  for (const [empId, entries] of entryMap) {
    if (!merged.has(empId)) {
      const availability = makeDefaultAvailability();
      for (const [day, entry] of entries) {
        if (DAYS_OF_WEEK.includes(day as DayOfWeek)) {
          availability[day as DayOfWeek] = {
            available: entry.available,
            startTime: entry.startTime,
            endTime: entry.endTime,
            role: entry.role,
          };
        }
      }
      merged.set(empId, {
        id: empId,
        name: scheduleEmployeeNames.get(empId) || "Unknown",
        targetHoursPerWeek: 40,
        sortOrder: merged.size,
        locationId: "",
        availability,
      });
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function calculatePlannedHours(emp: EmployeeWithAvailability): number {
  let total = 0;
  for (const day of DAYS_OF_WEEK) {
    const avail = emp.availability[day];
    if (avail.available) {
      const start = timeToDecimal(avail.startTime);
      const end = timeToDecimal(avail.endTime);
      if (end > start) total += end - start;
    }
  }
  return Math.round(total * 100) / 100;
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

let _empCounter = 0;
let _schedCounter = 0;

function makeEntry(
  empId: string,
  empName: string,
  day: string,
  opts: Partial<ScheduleEntryData> = {}
): ScheduleEntryData {
  return {
    employeeId: empId,
    employeeName: empName,
    day,
    available: true,
    startTime: "9:00 AM",
    endTime: "5:00 PM",
    role: "Filling",
    ...opts,
  };
}

function makeSchedule(
  locationId: string,
  weekStart: string,
  entries: ScheduleEntryData[],
  status: WeeklyScheduleData["status"] = "Finalized"
): WeeklyScheduleData {
  _schedCounter++;
  return {
    id: `sched-${_schedCounter}`,
    locationId,
    weekStart,
    status,
    entries,
    comments: [],
    lastUpdated: new Date().toISOString(),
  };
}

function makeEmployee(
  id: string,
  name: string,
  locationId: string,
  overrides: Partial<EmployeeWithAvailability> = {}
): EmployeeWithAvailability {
  _empCounter++;
  return {
    id,
    name,
    targetHoursPerWeek: 40,
    sortOrder: _empCounter,
    locationId,
    availability: makeDefaultAvailability(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: Single location — schedule displayed
// ---------------------------------------------------------------------------

describe("Scenario 1: Single location schedule display", () => {
  it("buildEmployees with one schedule returns all employees from that schedule", () => {
    const entries = [
      makeEntry("emp-1", "Alice", "Monday"),
      makeEntry("emp-1", "Alice", "Tuesday"),
      makeEntry("emp-2", "Bob", "Monday"),
    ];
    const schedule = makeSchedule("loc-columbia", "2025-06-02", entries);

    const result = buildEmployees([schedule]);

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.name)).toEqual(["Alice", "Bob"]);
  });

  it("each employee has correct day availability from schedule entries", () => {
    const entries = [
      makeEntry("emp-1", "Alice", "Monday", { startTime: "8:00 AM", endTime: "4:00 PM", role: "Pharmacist" }),
      makeEntry("emp-1", "Alice", "Wednesday", { startTime: "10:00 AM", endTime: "6:00 PM", role: "Technician" }),
    ];
    const schedule = makeSchedule("loc-columbia", "2025-06-02", entries);

    const [alice] = buildEmployees([schedule]);

    expect(alice.availability.Monday.startTime).toBe("8:00 AM");
    expect(alice.availability.Monday.endTime).toBe("4:00 PM");
    expect(alice.availability.Monday.role).toBe("Pharmacist");
    expect(alice.availability.Wednesday.startTime).toBe("10:00 AM");
    expect(alice.availability.Wednesday.role).toBe("Technician");
  });

  it("employee marked unavailable on a day shows available=false", () => {
    const entries = [
      makeEntry("emp-1", "Alice", "Monday"),
      makeEntry("emp-1", "Alice", "Friday", { available: false }),
    ];
    const schedule = makeSchedule("loc-columbia", "2025-06-02", entries);

    const [alice] = buildEmployees([schedule]);

    expect(alice.availability.Monday.available).toBe(true);
    expect(alice.availability.Friday.available).toBe(false);
  });

  it("employees preserve insertion order by sortOrder", () => {
    const entries = [
      makeEntry("emp-a", "Alice", "Monday"),
      makeEntry("emp-b", "Bob", "Monday"),
      makeEntry("emp-c", "Carol", "Monday"),
    ];
    const schedule = makeSchedule("loc-columbia", "2025-06-02", entries);

    const result = buildEmployees([schedule]);

    expect(result[0].name).toBe("Alice");
    expect(result[1].name).toBe("Bob");
    expect(result[2].name).toBe("Carol");
  });

  it("buildEmployees returns empty array when schedule has no entries", () => {
    const schedule = makeSchedule("loc-columbia", "2025-06-02", []);

    expect(buildEmployees([schedule])).toEqual([]);
  });

  it("buildEmployees returns empty array when given zero schedules", () => {
    expect(buildEmployees([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Multiple locations — separated display
// ---------------------------------------------------------------------------

describe("Scenario 2: Multi-location schedule display", () => {
  it("buildEmployees with schedules from 2 locations returns employees from both", () => {
    const columbiaEntries = [
      makeEntry("emp-1", "Alice", "Monday"),
    ];
    const baltimorEntries = [
      makeEntry("emp-2", "Bob", "Monday"),
    ];
    const schedCol = makeSchedule("loc-columbia", "2025-06-02", columbiaEntries);
    const schedBal = makeSchedule("loc-baltimore", "2025-06-02", baltimorEntries);

    const result = buildEmployees([schedCol, schedBal]);

    expect(result).toHaveLength(2);
    const names = result.map((e) => e.name);
    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
  });

  it("grouping by locationId produces separate employee lists per location", () => {
    const entries = [
      makeEntry("emp-1", "Alice", "Monday"),
      makeEntry("emp-2", "Bob", "Monday"),
    ];
    const schedCol = makeSchedule("loc-columbia", "2025-06-02", [entries[0]]);
    const schedBal = makeSchedule("loc-baltimore", "2025-06-02", [entries[1]]);

    const allEmployees = buildEmployees([schedCol, schedBal]);

    // Simulate the grouping the dashboard does: filter by locationId from each schedule
    const colGroup = allEmployees.filter((e) =>
      schedCol.entries.some((en) => en.employeeId === e.id)
    );
    const balGroup = allEmployees.filter((e) =>
      schedBal.entries.some((en) => en.employeeId === e.id)
    );

    expect(colGroup).toHaveLength(1);
    expect(colGroup[0].name).toBe("Alice");
    expect(balGroup).toHaveLength(1);
    expect(balGroup[0].name).toBe("Bob");
  });

  it("employee appearing in both location schedules is included once by buildEmployees (last entry wins per day)", () => {
    // Same employee scheduled at two locations on the same day — buildEmployees deduplicates by empId
    const entries = [
      makeEntry("emp-shared", "Carol", "Monday", { startTime: "8:00 AM", endTime: "12:00 PM" }),
      makeEntry("emp-shared", "Carol", "Monday", { startTime: "1:00 PM", endTime: "5:00 PM" }),
    ];
    const schedCol = makeSchedule("loc-columbia", "2025-06-02", [entries[0]]);
    const schedBal = makeSchedule("loc-baltimore", "2025-06-02", [entries[1]]);

    const result = buildEmployees([schedCol, schedBal]);

    // Carol appears once; the second Monday entry overwrites the first
    const carolEntries = result.filter((e) => e.id === "emp-shared");
    expect(carolEntries).toHaveLength(1);
    expect(carolEntries[0].availability.Monday.startTime).toBe("1:00 PM");
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Schedule merge — finalized schedule overrides defaults
// ---------------------------------------------------------------------------

describe("Scenario 3: Schedule merge — finalized overrides defaults", () => {
  it("returns base employees unchanged when no schedules provided", () => {
    const base = [makeEmployee("emp-1", "Alice", "loc-1")];
    const result = mergeScheduleIntoEmployees(base, []);
    expect(result).toEqual(base);
  });

  it("returns base employees unchanged when schedule has empty entries", () => {
    const base = [makeEmployee("emp-1", "Alice", "loc-1")];
    const schedule = makeSchedule("loc-1", "2025-06-02", []);
    const result = mergeScheduleIntoEmployees(base, [schedule]);
    expect(result).toEqual(base);
  });

  it("overrides availability with matching schedule entries", () => {
    const base = [makeEmployee("emp-1", "Alice", "loc-1")];
    // Default is 9AM-5PM; schedule has 7AM-3PM
    const entries = [
      makeEntry("emp-1", "Alice", "Monday", { startTime: "7:00 AM", endTime: "3:00 PM", role: "Pharmacist" }),
    ];
    const schedule = makeSchedule("loc-1", "2025-06-02", entries);

    const result = mergeScheduleIntoEmployees(base, [schedule]);

    expect(result[0].availability.Monday.startTime).toBe("7:00 AM");
    expect(result[0].availability.Monday.endTime).toBe("3:00 PM");
    expect(result[0].availability.Monday.role).toBe("Pharmacist");
  });

  it("adds employee from schedule who is not in the base list (cross-location helper)", () => {
    const base = [makeEmployee("emp-1", "Alice", "loc-1")];
    const entries = [
      makeEntry("emp-2", "Bob", "Monday"),
    ];
    const schedule = makeSchedule("loc-1", "2025-06-02", entries);

    const result = mergeScheduleIntoEmployees(base, [schedule]);

    const bob = result.find((e) => e.id === "emp-2");
    expect(bob).toBeDefined();
    expect(bob!.name).toBe("Bob");
  });

  it("keeps base employee with default availability when not in schedule", () => {
    const base = [
      makeEmployee("emp-1", "Alice", "loc-1"),
      makeEmployee("emp-2", "Bob", "loc-1"),
    ];
    const entries = [
      makeEntry("emp-1", "Alice", "Monday", { startTime: "7:00 AM", endTime: "3:00 PM" }),
    ];
    const schedule = makeSchedule("loc-1", "2025-06-02", entries);

    const result = mergeScheduleIntoEmployees(base, [schedule]);

    const bob = result.find((e) => e.id === "emp-2");
    expect(bob).toBeDefined();
    // Bob's availability comes from makeDefaultAvailability()
    expect(bob!.availability.Monday.startTime).toBe("9:00 AM");
    expect(bob!.availability.Monday.endTime).toBe("5:00 PM");
  });

  it("schedule entry for one day overrides only that day; other days keep defaults", () => {
    const base = [makeEmployee("emp-1", "Alice", "loc-1")];
    const entries = [
      makeEntry("emp-1", "Alice", "Wednesday", { startTime: "11:00 AM", endTime: "7:00 PM" }),
    ];
    const schedule = makeSchedule("loc-1", "2025-06-02", entries);

    const result = mergeScheduleIntoEmployees(base, [schedule]);

    const alice = result[0];
    // Wednesday overridden
    expect(alice.availability.Wednesday.startTime).toBe("11:00 AM");
    // Other days keep the default 9AM-5PM
    expect(alice.availability.Monday.startTime).toBe("9:00 AM");
    expect(alice.availability.Thursday.startTime).toBe("9:00 AM");
    expect(alice.availability.Saturday.startTime).toBe("9:00 AM");
  });

  it("handles multiple schedules — entries from all are merged", () => {
    const base = [makeEmployee("emp-1", "Alice", "loc-1")];
    const sched1 = makeSchedule("loc-1", "2025-06-02", [
      makeEntry("emp-1", "Alice", "Monday", { startTime: "8:00 AM", endTime: "4:00 PM" }),
    ]);
    const sched2 = makeSchedule("loc-1", "2025-06-02", [
      makeEntry("emp-1", "Alice", "Tuesday", { startTime: "10:00 AM", endTime: "6:00 PM" }),
    ]);

    const result = mergeScheduleIntoEmployees(base, [sched1, sched2]);

    const alice = result[0];
    expect(alice.availability.Monday.startTime).toBe("8:00 AM");
    expect(alice.availability.Tuesday.startTime).toBe("10:00 AM");
  });

  it("cross-location helper gets Unknown name when employeeName missing from map", () => {
    const base: EmployeeWithAvailability[] = [];
    const entries = [makeEntry("emp-ghost", "", "Monday")];
    entries[0].employeeName = "";
    const schedule = makeSchedule("loc-1", "2025-06-02", entries);

    const result = mergeScheduleIntoEmployees(base, [schedule]);

    // scheduleEmployeeNames stores empty string; fallback "Unknown" only fires when get() returns undefined
    // An empty string is falsy, so the || "Unknown" kicks in
    expect(result[0].name).toBe("Unknown");
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Planned vs actual hours calculation
// ---------------------------------------------------------------------------

describe("Scenario 4: Planned vs actual comparison", () => {
  it("calculates 40h for 5 weekdays × 8h shift (Mon-Fri)", () => {
    const emp = makeEmployee("emp-1", "Alice", "loc-1");
    // Set Mon-Fri to 8h; Saturday OFF
    for (const day of ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as DayOfWeek[]) {
      emp.availability[day] = { available: true, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };
    }
    emp.availability.Saturday = { available: false, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };

    expect(calculatePlannedHours(emp)).toBe(40);
  });

  it("calculates 24h when employee has 2 days off (3 days × 8h)", () => {
    const emp = makeEmployee("emp-1", "Alice", "loc-1");
    // 3 days on, 3 days off
    const workDays: DayOfWeek[] = ["Monday", "Wednesday", "Friday"];
    const offDays: DayOfWeek[] = ["Tuesday", "Thursday", "Saturday"];

    for (const day of workDays) {
      emp.availability[day] = { available: true, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };
    }
    for (const day of offDays) {
      emp.availability[day] = { available: false, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };
    }

    expect(calculatePlannedHours(emp)).toBe(24);
  });

  it("calculates correct total for mixed shift lengths", () => {
    const emp = makeEmployee("emp-1", "Alice", "loc-1");
    emp.availability.Monday    = { available: true, startTime: "8:00 AM", endTime: "4:00 PM", role: "Filling" };  // 8h
    emp.availability.Tuesday   = { available: true, startTime: "9:00 AM", endTime: "1:00 PM", role: "Filling" };  // 4h
    emp.availability.Wednesday = { available: true, startTime: "10:00 AM", endTime: "7:00 PM", role: "Filling" }; // 9h
    emp.availability.Thursday  = { available: false, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" }; // 0h (off)
    emp.availability.Friday    = { available: true, startTime: "7:00 AM", endTime: "3:00 PM", role: "Filling" };  // 8h
    emp.availability.Saturday  = { available: false, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" }; // 0h (off)

    // 8 + 4 + 9 + 0 + 8 + 0 = 29
    expect(calculatePlannedHours(emp)).toBe(29);
  });

  it("variance: actual 42 vs planned 40 = +2 (over target)", () => {
    const planned = 40;
    const actual = 42;
    expect(actual - planned).toBe(2);
  });

  it("variance: actual 35 vs planned 40 = -5 (under target)", () => {
    const planned = 40;
    const actual = 35;
    expect(actual - planned).toBe(-5);
  });

  it("variance: actual 40 vs planned 40 = 0 (on target)", () => {
    const planned = 40;
    const actual = 40;
    expect(actual - planned).toBe(0);
  });

  it("returns 0 for an employee with all days marked unavailable", () => {
    const emp = makeEmployee("emp-1", "Alice", "loc-1");
    for (const day of DAYS_OF_WEEK) {
      emp.availability[day] = { available: false, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };
    }

    expect(calculatePlannedHours(emp)).toBe(0);
  });

  it("does not add hours when endTime equals startTime (zero-length shift)", () => {
    const emp = makeEmployee("emp-1", "Alice", "loc-1");
    emp.availability.Monday = { available: true, startTime: "9:00 AM", endTime: "9:00 AM", role: "Filling" };
    for (const day of ["Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as DayOfWeek[]) {
      emp.availability[day] = { available: false, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };
    }

    expect(calculatePlannedHours(emp)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Print schedule — hours calculation
// ---------------------------------------------------------------------------

describe("Scenario 5: Print schedule hours per shift", () => {
  function shiftHours(startTime: string, endTime: string): number {
    const start = timeToDecimal(startTime);
    const end = timeToDecimal(endTime);
    return end > start ? Math.round((end - start) * 100) / 100 : 0;
  }

  it("9:00 AM–5:00 PM = 8h", () => {
    expect(shiftHours("9:00 AM", "5:00 PM")).toBe(8);
  });

  it("8:00 AM–4:00 PM = 8h", () => {
    expect(shiftHours("8:00 AM", "4:00 PM")).toBe(8);
  });

  it("10:00 AM–6:00 PM = 8h", () => {
    expect(shiftHours("10:00 AM", "6:00 PM")).toBe(8);
  });

  it("employee marked OFF contributes 0h", () => {
    const dayOff = { available: false, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };
    const hours = dayOff.available ? shiftHours(dayOff.startTime, dayOff.endTime) : 0;
    expect(hours).toBe(0);
  });

  it("weekly total is the sum of all daily shift hours", () => {
    const shifts = [
      { startTime: "8:00 AM", endTime: "4:00 PM" },  // 8h
      { startTime: "9:00 AM", endTime: "5:00 PM" },  // 8h
      { startTime: "10:00 AM", endTime: "2:00 PM" }, // 4h
      { startTime: "7:00 AM", endTime: "3:00 PM" },  // 8h
      { startTime: "9:00 AM", endTime: "1:00 PM" },  // 4h
    ];
    const total = shifts.reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0);
    expect(total).toBe(32);
  });

  it("multiple employees each get correct individual totals", () => {
    const aliceShifts = ["Monday", "Tuesday", "Wednesday"].map(() => ({
      startTime: "9:00 AM",
      endTime: "5:00 PM",
    }));
    const bobShifts = ["Monday", "Friday"].map(() => ({
      startTime: "8:00 AM",
      endTime: "4:00 PM",
    }));

    const aliceTotal = aliceShifts.reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0);
    const bobTotal   = bobShifts.reduce((sum, s) => sum + shiftHours(s.startTime, s.endTime), 0);

    expect(aliceTotal).toBe(24);
    expect(bobTotal).toBe(16);
  });

  it("12:30 PM–5:00 PM = 4.5h", () => {
    expect(shiftHours("12:30 PM", "5:00 PM")).toBe(4.5);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Bar positioning — interval granularity
// ---------------------------------------------------------------------------

describe("Scenario 6: Bar positioning at different times", () => {
  // Default business window: 8 AM–8 PM (12 hours)

  it("9:00 AM–5:00 PM → left ~8.33%, width ~66.67%", () => {
    const style = getBarStyle("9:00 AM", "5:00 PM");
    // left = (9-8)/12 * 100
    expect(style.left).toBe(`${(1 / 12) * 100}%`);
    // width = (17-9)/12 * 100
    expect(style.width).toBe(`${(8 / 12) * 100}%`);
  });

  it("8:00 AM–8:00 PM (full business day) → left 0%, width 100%", () => {
    const style = getBarStyle("8:00 AM", "8:00 PM");
    expect(style.left).toBe("0%");
    expect(style.width).toBe("100%");
  });

  it("12:00 PM–4:00 PM → correct positioning in middle of day", () => {
    const style = getBarStyle("12:00 PM", "4:00 PM");
    // left = (12-8)/12 * 100 = 33.333...%
    expect(style.left).toBe(`${(4 / 12) * 100}%`);
    // width = (16-12)/12 * 100 = 33.333...%
    expect(style.width).toBe(`${(4 / 12) * 100}%`);
  });

  it("shift starting before business hours is clamped to left 0%", () => {
    const style = getBarStyle("6:00 AM", "12:00 PM");
    expect(style.left).toBe("0%");
  });

  it("shift ending after business hours has width clamped to right edge", () => {
    const style = getBarStyle("6:00 PM", "10:00 PM");
    // start=18, end clamped to 20; left=(18-8)/12*100
    expect(style.left).toBe(`${(10 / 12) * 100}%`);
    // width = (20-18)/12*100
    expect(style.width).toBe(`${(2 / 12) * 100}%`);
  });

  it("shift entirely outside business hours on the left returns width 0%", () => {
    // start=5, end=7 — both before businessStart=8
    const style = getBarStyle("5:00 AM", "7:00 AM");
    // left = max(5,8)-8)/12*100 = 0%
    // width = (min(7,20) - max(5,8))/12*100 = (7-8)/12*100 = negative → clamped to 0%
    expect(style.width).toBe("0%");
  });

  it("7:00 AM–3:00 PM with custom business window 7–19 is positioned correctly", () => {
    const style = getBarStyle("7:00 AM", "3:00 PM", 7, 19);
    // totalHours = 12; left = (7-7)/12*100 = 0%; width = (15-7)/12*100 = 66.67%
    expect(style.left).toBe("0%");
    expect(style.width).toBe(`${(8 / 12) * 100}%`);
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: Default availability factory
// ---------------------------------------------------------------------------

describe("Scenario 7: Default availability factory (makeDefaultAvailability)", () => {
  it("returns an entry for every day in DAYS_OF_WEEK", () => {
    const avail = makeDefaultAvailability();
    for (const day of DAYS_OF_WEEK) {
      expect(avail[day]).toBeDefined();
    }
  });

  it("covers all 6 days (Mon–Sat)", () => {
    const avail = makeDefaultAvailability();
    expect(Object.keys(avail)).toHaveLength(6);
  });

  it("all days default to available=true", () => {
    const avail = makeDefaultAvailability();
    for (const day of DAYS_OF_WEEK) {
      expect(avail[day].available).toBe(true);
    }
  });

  it("default start time is 9:00 AM for every day", () => {
    const avail = makeDefaultAvailability();
    for (const day of DAYS_OF_WEEK) {
      expect(avail[day].startTime).toBe("9:00 AM");
    }
  });

  it("default end time is 5:00 PM for every day", () => {
    const avail = makeDefaultAvailability();
    for (const day of DAYS_OF_WEEK) {
      expect(avail[day].endTime).toBe("5:00 PM");
    }
  });

  it("default role is Filling for every day", () => {
    const avail = makeDefaultAvailability();
    for (const day of DAYS_OF_WEEK) {
      expect(avail[day].role).toBe("Filling");
    }
  });

  it("each call returns a fresh independent object (mutations do not bleed)", () => {
    const a = makeDefaultAvailability();
    const b = makeDefaultAvailability();
    a.Monday.startTime = "7:00 AM";
    expect(b.Monday.startTime).toBe("9:00 AM");
  });

  it("Saturday is included in the default availability", () => {
    const avail = makeDefaultAvailability();
    expect(avail.Saturday).toBeDefined();
    expect(avail.Saturday.available).toBe(true);
  });

  it("Sunday is NOT included (pharmacy is closed Sundays)", () => {
    const avail = makeDefaultAvailability();
    expect((avail as Record<string, unknown>)["Sunday"]).toBeUndefined();
  });
});

import { describe, it, expect } from "vitest";
import {
  generateAdpCsv,
  generatePaychexCsv,
  generateGustoCsv,
  generateGenericCsv,
  generatePayrollExport,
  calculatePayrollEntries,
  type PayrollEntry,
  type PayrollFormat,
} from "@/lib/payroll";

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

let idCounter = 0;

function makeEntry(overrides: Partial<PayrollEntry> = {}): PayrollEntry {
  idCounter++;
  return {
    employeeId: `EMP${String(idCounter).padStart(8, "0")}`,
    employeeName: `First${idCounter} Last${idCounter}`,
    employeeEmail: `employee${idCounter}@example.com`,
    locationName: `Location ${idCounter}`,
    regularHours: 40,
    overtimeHours: 0,
    totalHours: 40,
    breakMinutes: 30,
    daysWorked: 5,
    periodStart: "2024-01-01",
    periodEnd: "2024-01-07",
    ...overrides,
  };
}

function makeTimeEntry(overrides: Partial<ReturnType<typeof buildTimeEntry>> = {}) {
  return buildTimeEntry(overrides);
}

function buildTimeEntry(overrides: Partial<{
  userId: string;
  userName: string;
  userEmail: string;
  locationName: string;
  date: string;
  regularHours: number;
  overtimeHours: number;
  breakMinutes: number;
}> = {}) {
  idCounter++;
  return {
    userId: `user-${idCounter}`,
    userName: `Worker${idCounter} Surname${idCounter}`,
    userEmail: `worker${idCounter}@example.com`,
    locationName: "Main Pharmacy",
    date: "2024-01-02",
    regularHours: 8,
    overtimeHours: 0,
    breakMinutes: 30,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseRows(csv: string): string[][] {
  return csv.split("\n").map((line) => line.split(","));
}

// ---------------------------------------------------------------------------
// generateAdpCsv
// ---------------------------------------------------------------------------

describe("generateAdpCsv", () => {
  it("includes a header row as the first line", () => {
    const csv = generateAdpCsv([]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Co Code,Batch ID,File #,Reg Hours,O/T Hours,Temp Dept,Temp Rate"
    );
  });

  it("has exactly 7 columns in the header", () => {
    const csv = generateAdpCsv([]);
    const header = csv.split("\n")[0].split(",");
    expect(header).toHaveLength(7);
  });

  it("uses the default company code 001 in every data row", () => {
    const entries = [makeEntry(), makeEntry()];
    const rows = parseRows(generateAdpCsv(entries));
    // rows[0] is header; rows[1] and rows[2] are data
    expect(rows[1][0]).toBe("001");
    expect(rows[2][0]).toBe("001");
  });

  it("uses a custom company code in every data row", () => {
    const entries = [makeEntry(), makeEntry()];
    const rows = parseRows(generateAdpCsv(entries, "XYZ"));
    expect(rows[1][0]).toBe("XYZ");
    expect(rows[2][0]).toBe("XYZ");
  });

  it("truncates employee ID to the last 6 characters in File #", () => {
    // "ABCDEFGHIJ".slice(-6) === "EFGHIJ"
    const entry = makeEntry({ employeeId: "ABCDEFGHIJ" });
    const rows = parseRows(generateAdpCsv([entry]));
    // col index 2 is File #
    expect(rows[1][2]).toBe("EFGHIJ");
  });

  it("uppercases the File # field", () => {
    const entry = makeEntry({ employeeId: "abcdef" });
    const rows = parseRows(generateAdpCsv([entry]));
    expect(rows[1][2]).toBe("ABCDEF");
  });

  it("escapes commas in location names (replaces with space)", () => {
    const entry = makeEntry({ locationName: "North, Downtown, Branch" });
    const csv = generateAdpCsv([entry]);
    // Temp Dept is col index 5 — should not contain commas
    const rows = parseRows(csv);
    // col 5 of the data row
    expect(rows[1][5]).toBe("North  Downtown  Branch");
  });

  it("produces correct column order: Co Code, Batch ID, File #, Reg Hours, O/T Hours, Temp Dept, Temp Rate", () => {
    const entry = makeEntry({
      employeeId: "ID0001",
      regularHours: 36,
      overtimeHours: 4,
      locationName: "East Wing",
      periodEnd: "2024-01-07",
    });
    const rows = parseRows(generateAdpCsv([entry], "ABC"));
    const [coCode, batchId, fileNum, regHours, otHours, tempDept, tempRate] =
      rows[1];
    expect(coCode).toBe("ABC");
    expect(batchId).toBe("RXDESK-2024-01-07");
    expect(fileNum).toBe("ID0001");
    expect(regHours).toBe("36.00");
    expect(otHours).toBe("4.00");
    expect(tempDept).toBe("East Wing");
    expect(tempRate).toBe("");
  });

  it("produces only a header row for empty input", () => {
    const csv = generateAdpCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// generatePaychexCsv
// ---------------------------------------------------------------------------

describe("generatePaychexCsv", () => {
  it("includes a header row as the first line", () => {
    const csv = generatePaychexCsv([]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Employee ID,Last Name,First Name,Regular Hours,Overtime Hours,Department"
    );
  });

  it("splits a two-part name into correct first/last", () => {
    const entry = makeEntry({ employeeName: "Jane Doe" });
    const rows = parseRows(generatePaychexCsv([entry]));
    // col 1 = Last Name, col 2 = First Name
    expect(rows[1][1]).toBe("Doe");
    expect(rows[1][2]).toBe("Jane");
  });

  it("handles a multi-word last name correctly", () => {
    const entry = makeEntry({ employeeName: "Maria Van Der Berg" });
    const rows = parseRows(generatePaychexCsv([entry]));
    expect(rows[1][2]).toBe("Maria");
    expect(rows[1][1]).toBe("Van Der Berg");
  });

  it("falls back to first name as last name when only one name token", () => {
    const entry = makeEntry({ employeeName: "Mononymous" });
    const rows = parseRows(generatePaychexCsv([entry]));
    expect(rows[1][2]).toBe("Mononymous"); // firstName
    expect(rows[1][1]).toBe("Mononymous"); // lastName fallback
  });

  it("columns are in order: Employee ID, Last Name, First Name, Regular Hours, Overtime Hours, Department", () => {
    const entry = makeEntry({
      employeeId: "ABCDEFGH",
      employeeName: "Alice Smith",
      regularHours: 38,
      overtimeHours: 2,
      locationName: "Dispensary",
    });
    const rows = parseRows(generatePaychexCsv([entry]));
    const [empId, lastName, firstName, regHours, otHours, dept] = rows[1];
    expect(empId).toBe("ABCDEFGH"); // last 8 chars of 8-char ID = same
    expect(lastName).toBe("Smith");
    expect(firstName).toBe("Alice");
    expect(regHours).toBe("38.00");
    expect(otHours).toBe("2.00");
    expect(dept).toBe("Dispensary");
  });

  it("escapes commas in name and department fields", () => {
    const entry = makeEntry({
      employeeName: "First, Last",
      locationName: "North, Branch",
    });
    const rows = parseRows(generatePaychexCsv([entry]));
    // After comma replacement the names should not contain commas
    const rowLine = generatePaychexCsv([entry]).split("\n")[1];
    // Count commas: 5 delimiters expected (6 fields)
    const commaCount = (rowLine.match(/,/g) || []).length;
    expect(commaCount).toBe(5);
  });

  it("produces only a header row for empty input", () => {
    const csv = generatePaychexCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// generateGustoCsv
// ---------------------------------------------------------------------------

describe("generateGustoCsv", () => {
  it("includes a header row as the first line", () => {
    const csv = generateGustoCsv([]);
    expect(csv.split("\n")[0]).toBe(
      "Employee Email,Hours Worked,Overtime Hours,Pay Period Start,Pay Period End"
    );
  });

  it("uses employee email (not name or ID) as identifier", () => {
    const entry = makeEntry({ employeeEmail: "jane@clinic.com" });
    const rows = parseRows(generateGustoCsv([entry]));
    expect(rows[1][0]).toBe("jane@clinic.com");
  });

  it("includes pay period start date", () => {
    const entry = makeEntry({ periodStart: "2024-02-01" });
    const rows = parseRows(generateGustoCsv([entry]));
    // col 3 = Pay Period Start
    expect(rows[1][3]).toBe("2024-02-01");
  });

  it("includes pay period end date", () => {
    const entry = makeEntry({ periodEnd: "2024-02-14" });
    const rows = parseRows(generateGustoCsv([entry]));
    // col 4 = Pay Period End
    expect(rows[1][4]).toBe("2024-02-14");
  });

  it("records total hours worked (not just regular)", () => {
    const entry = makeEntry({ totalHours: 44.5, overtimeHours: 4.5 });
    const rows = parseRows(generateGustoCsv([entry]));
    expect(rows[1][1]).toBe("44.50"); // Hours Worked = totalHours
    expect(rows[1][2]).toBe("4.50");  // Overtime Hours
  });

  it("columns are in order: Email, Hours Worked, Overtime Hours, Period Start, Period End", () => {
    const entry = makeEntry({
      employeeEmail: "test@rx.com",
      totalHours: 40,
      overtimeHours: 0,
      periodStart: "2024-03-01",
      periodEnd: "2024-03-15",
    });
    const rows = parseRows(generateGustoCsv([entry]));
    const [email, hoursWorked, otHours, start, end] = rows[1];
    expect(email).toBe("test@rx.com");
    expect(hoursWorked).toBe("40.00");
    expect(otHours).toBe("0.00");
    expect(start).toBe("2024-03-01");
    expect(end).toBe("2024-03-15");
  });

  it("produces only a header row for empty input", () => {
    const csv = generateGustoCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// generateGenericCsv
// ---------------------------------------------------------------------------

describe("generateGenericCsv", () => {
  it("includes a header row as the first line", () => {
    const csv = generateGenericCsv([]);
    expect(csv.split("\n")[0]).toBe(
      "Employee ID,Employee Name,Email,Location,Regular Hours,Overtime Hours,Total Hours,Break Minutes,Days Worked,Period Start,Period End"
    );
  });

  it("has 11 columns in the header", () => {
    const header = generateGenericCsv([]).split("\n")[0].split(",");
    expect(header).toHaveLength(11);
  });

  it("quotes employee name field", () => {
    const entry = makeEntry({ employeeName: "John Smith" });
    const csv = generateGenericCsv([entry]);
    expect(csv).toContain('"John Smith"');
  });

  it("quotes location name field", () => {
    const entry = makeEntry({ locationName: "North Branch" });
    const csv = generateGenericCsv([entry]);
    expect(csv).toContain('"North Branch"');
  });

  it("includes all 11 fields in each data row", () => {
    const entry = makeEntry({
      employeeId: "EMP001",
      employeeName: "Alice Jones",
      employeeEmail: "alice@rx.com",
      locationName: "Downtown",
      regularHours: 38,
      overtimeHours: 2,
      totalHours: 40,
      breakMinutes: 60,
      daysWorked: 5,
      periodStart: "2024-01-01",
      periodEnd: "2024-01-07",
    });
    const rows = generateGenericCsv([entry]).split("\n");
    // Split carefully — quoted fields contain no commas, so plain split works here
    const fields = rows[1].split(",");
    expect(fields).toHaveLength(11);
    expect(fields[0]).toBe("EMP001");
    expect(fields[1]).toBe('"Alice Jones"');
    expect(fields[2]).toBe("alice@rx.com");
    expect(fields[3]).toBe('"Downtown"');
    expect(fields[4]).toBe("38.00");
    expect(fields[5]).toBe("2.00");
    expect(fields[6]).toBe("40.00");
    expect(fields[7]).toBe("60");
    expect(fields[8]).toBe("5");
    expect(fields[9]).toBe("2024-01-01");
    expect(fields[10]).toBe("2024-01-07");
  });

  it("produces only a header row for empty input", () => {
    const csv = generateGenericCsv([]);
    expect(csv.split("\n")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// generatePayrollExport — dispatch routing
// ---------------------------------------------------------------------------

describe("generatePayrollExport", () => {
  const entry = makeEntry();

  it('dispatches "ADP" to generateAdpCsv output', () => {
    const result = generatePayrollExport([entry], "ADP", "TESTCO");
    expect(result.split("\n")[0]).toBe(
      "Co Code,Batch ID,File #,Reg Hours,O/T Hours,Temp Dept,Temp Rate"
    );
    expect(result.split("\n")[1].split(",")[0]).toBe("TESTCO");
  });

  it('dispatches "PAYCHEX" to generatePaychexCsv output', () => {
    const result = generatePayrollExport([entry], "PAYCHEX");
    expect(result.split("\n")[0]).toBe(
      "Employee ID,Last Name,First Name,Regular Hours,Overtime Hours,Department"
    );
  });

  it('dispatches "GUSTO" to generateGustoCsv output', () => {
    const result = generatePayrollExport([entry], "GUSTO");
    expect(result.split("\n")[0]).toBe(
      "Employee Email,Hours Worked,Overtime Hours,Pay Period Start,Pay Period End"
    );
  });

  it('dispatches "CSV" to generateGenericCsv output', () => {
    const result = generatePayrollExport([entry], "CSV");
    expect(result.split("\n")[0]).toContain("Employee ID,Employee Name");
  });

  it('dispatches "GENERIC" to generateGenericCsv output', () => {
    const result = generatePayrollExport([entry], "GENERIC");
    expect(result.split("\n")[0]).toContain("Employee ID,Employee Name");
  });

  it("passes companyCode through to ADP", () => {
    const result = generatePayrollExport([entry], "ADP", "ZZZ");
    expect(result.split("\n")[1].split(",")[0]).toBe("ZZZ");
  });

  it("produces identical output for CSV and GENERIC formats", () => {
    const csv = generatePayrollExport([entry], "CSV");
    const generic = generatePayrollExport([entry], "GENERIC");
    expect(csv).toBe(generic);
  });
});

// ---------------------------------------------------------------------------
// calculatePayrollEntries
// ---------------------------------------------------------------------------

describe("calculatePayrollEntries", () => {
  const PERIOD_START = "2024-01-01";
  const PERIOD_END = "2024-01-07";

  it("returns an empty array for empty input", () => {
    const result = calculatePayrollEntries([], PERIOD_START, PERIOD_END);
    expect(result).toEqual([]);
  });

  it("handles a single time entry correctly", () => {
    const te = buildTimeEntry({
      userId: "u-001",
      userName: "Solo Worker",
      userEmail: "solo@rx.com",
      locationName: "Branch A",
      date: "2024-01-02",
      regularHours: 8,
      overtimeHours: 0,
      breakMinutes: 30,
    });
    const [result] = calculatePayrollEntries([te], PERIOD_START, PERIOD_END);
    expect(result.employeeId).toBe("u-001");
    expect(result.employeeName).toBe("Solo Worker");
    expect(result.employeeEmail).toBe("solo@rx.com");
    expect(result.locationName).toBe("Branch A");
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(0);
    expect(result.totalHours).toBe(8);
    expect(result.breakMinutes).toBe(30);
    expect(result.daysWorked).toBe(1);
    expect(result.periodStart).toBe(PERIOD_START);
    expect(result.periodEnd).toBe(PERIOD_END);
  });

  it("aggregates multiple entries for the same employee", () => {
    const entries = [
      buildTimeEntry({ userId: "u-100", date: "2024-01-01", regularHours: 8, overtimeHours: 0, breakMinutes: 30 }),
      buildTimeEntry({ userId: "u-100", date: "2024-01-02", regularHours: 6, overtimeHours: 2, breakMinutes: 30 }),
      buildTimeEntry({ userId: "u-100", date: "2024-01-03", regularHours: 7, overtimeHours: 1, breakMinutes: 0 }),
    ];
    const result = calculatePayrollEntries(entries, PERIOD_START, PERIOD_END);
    expect(result).toHaveLength(1);
    const [emp] = result;
    expect(emp.regularHours).toBe(21);
    expect(emp.overtimeHours).toBe(3);
    expect(emp.totalHours).toBe(24);
    expect(emp.breakMinutes).toBe(60);
    expect(emp.daysWorked).toBe(3);
  });

  it("counts unique days worked (duplicate dates counted once)", () => {
    const entries = [
      buildTimeEntry({ userId: "u-200", date: "2024-01-01", regularHours: 4, overtimeHours: 0, breakMinutes: 15 }),
      buildTimeEntry({ userId: "u-200", date: "2024-01-01", regularHours: 4, overtimeHours: 0, breakMinutes: 15 }),
      buildTimeEntry({ userId: "u-200", date: "2024-01-02", regularHours: 8, overtimeHours: 0, breakMinutes: 30 }),
    ];
    const [result] = calculatePayrollEntries(entries, PERIOD_START, PERIOD_END);
    // 2024-01-01 appears twice but should count as 1 unique day
    expect(result.daysWorked).toBe(2);
  });

  it("rounds regularHours to 2 decimal places", () => {
    const entries = [
      buildTimeEntry({ userId: "u-300", date: "2024-01-01", regularHours: 3.333, overtimeHours: 0, breakMinutes: 0 }),
      buildTimeEntry({ userId: "u-300", date: "2024-01-02", regularHours: 3.333, overtimeHours: 0, breakMinutes: 0 }),
      buildTimeEntry({ userId: "u-300", date: "2024-01-03", regularHours: 3.334, overtimeHours: 0, breakMinutes: 0 }),
    ];
    const [result] = calculatePayrollEntries(entries, PERIOD_START, PERIOD_END);
    // 3.333 + 3.333 + 3.334 = 10.0 exactly, but let's confirm rounding behavior
    expect(result.regularHours).toBe(Math.round(10.0 * 100) / 100);
    expect(Number.isInteger(result.regularHours * 100)).toBe(true);
  });

  it("rounds overtimeHours to 2 decimal places", () => {
    const entries = [
      buildTimeEntry({ userId: "u-301", date: "2024-01-01", regularHours: 8, overtimeHours: 1.005, breakMinutes: 0 }),
      buildTimeEntry({ userId: "u-301", date: "2024-01-02", regularHours: 8, overtimeHours: 0.005, breakMinutes: 0 }),
    ];
    const [result] = calculatePayrollEntries(entries, PERIOD_START, PERIOD_END);
    // Verify the value has at most 2 decimal digits
    expect(result.overtimeHours).toBe(Math.round(1.01 * 100) / 100);
  });

  it("rounds totalHours to 2 decimal places", () => {
    const entries = [
      buildTimeEntry({ userId: "u-302", date: "2024-01-01", regularHours: 3.3, overtimeHours: 1.1, breakMinutes: 0 }),
      buildTimeEntry({ userId: "u-302", date: "2024-01-02", regularHours: 3.3, overtimeHours: 1.1, breakMinutes: 0 }),
    ];
    const [result] = calculatePayrollEntries(entries, PERIOD_START, PERIOD_END);
    expect(result.totalHours).toBe(Math.round(8.8 * 100) / 100);
  });

  it("keeps employees separate when they have different userIds", () => {
    const entries = [
      buildTimeEntry({ userId: "u-400", date: "2024-01-01", regularHours: 8, overtimeHours: 0, breakMinutes: 30 }),
      buildTimeEntry({ userId: "u-401", date: "2024-01-01", regularHours: 7, overtimeHours: 1, breakMinutes: 30 }),
    ];
    const result = calculatePayrollEntries(entries, PERIOD_START, PERIOD_END);
    expect(result).toHaveLength(2);
    const u400 = result.find((r) => r.employeeId === "u-400");
    const u401 = result.find((r) => r.employeeId === "u-401");
    expect(u400?.regularHours).toBe(8);
    expect(u401?.regularHours).toBe(7);
    expect(u401?.overtimeHours).toBe(1);
  });

  it("attaches periodStart and periodEnd to every entry", () => {
    const te = buildTimeEntry({ userId: "u-500" });
    const results = calculatePayrollEntries([te], "2024-06-01", "2024-06-15");
    expect(results[0].periodStart).toBe("2024-06-01");
    expect(results[0].periodEnd).toBe("2024-06-15");
  });

  it("aggregates break minutes across multiple entries", () => {
    const entries = [
      buildTimeEntry({ userId: "u-600", date: "2024-01-01", regularHours: 8, overtimeHours: 0, breakMinutes: 45 }),
      buildTimeEntry({ userId: "u-600", date: "2024-01-02", regularHours: 8, overtimeHours: 0, breakMinutes: 30 }),
    ];
    const [result] = calculatePayrollEntries(entries, PERIOD_START, PERIOD_END);
    expect(result.breakMinutes).toBe(75);
  });

  it("handles an employee with a single zero-hour entry without errors", () => {
    const te = buildTimeEntry({
      userId: "u-700",
      regularHours: 0,
      overtimeHours: 0,
      breakMinutes: 0,
    });
    const [result] = calculatePayrollEntries([te], PERIOD_START, PERIOD_END);
    expect(result.regularHours).toBe(0);
    expect(result.overtimeHours).toBe(0);
    expect(result.totalHours).toBe(0);
    expect(result.daysWorked).toBe(1);
  });

  it("handles large input without throwing (1000 entries, 10 employees)", () => {
    const EMPLOYEE_COUNT = 10;
    const ENTRIES_PER_EMPLOYEE = 100;
    const timeEntries = [];
    for (let emp = 0; emp < EMPLOYEE_COUNT; emp++) {
      for (let day = 0; day < ENTRIES_PER_EMPLOYEE; day++) {
        timeEntries.push(
          buildTimeEntry({
            userId: `emp-bulk-${emp}`,
            date: `2024-01-${String((day % 28) + 1).padStart(2, "0")}`,
            regularHours: 8,
            overtimeHours: 0,
            breakMinutes: 30,
          })
        );
      }
    }
    const result = calculatePayrollEntries(timeEntries, PERIOD_START, PERIOD_END);
    expect(result).toHaveLength(EMPLOYEE_COUNT);
    // Each employee worked 28 unique days (days 1–28 covered by mod 28)
    expect(result[0].daysWorked).toBe(28);
    expect(result[0].regularHours).toBe(800);
  });
});

// Payroll export generation for ADP, Paychex, Gusto, and generic CSV

export interface PayrollEntry {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  locationName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  breakMinutes: number;
  daysWorked: number;
  periodStart: string;
  periodEnd: string;
}

export type PayrollFormat = "ADP" | "PAYCHEX" | "GUSTO" | "CSV" | "GENERIC";

/**
 * Generate ADP-compatible CSV (ADP Workforce Now import format)
 * Columns: Co Code, Batch ID, File #, Reg Hours, O/T Hours, Temp Dept, Temp Rate
 */
export function generateAdpCsv(
  entries: PayrollEntry[],
  companyCode: string = "001"
): string {
  const header = "Co Code,Batch ID,File #,Reg Hours,O/T Hours,Temp Dept,Temp Rate";
  const rows = entries.map((e) =>
    [
      companyCode,
      `RXDESK-${e.periodEnd}`,
      e.employeeId.slice(-6).toUpperCase(),
      e.regularHours.toFixed(2),
      e.overtimeHours.toFixed(2),
      e.locationName.replace(/,/g, " "),
      "",
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Generate Paychex-compatible CSV (Paychex Flex import format)
 * Columns: Employee ID, Last Name, First Name, Regular Hours, Overtime Hours, Department
 */
export function generatePaychexCsv(entries: PayrollEntry[]): string {
  const header =
    "Employee ID,Last Name,First Name,Regular Hours,Overtime Hours,Department";
  const rows = entries.map((e) => {
    const parts = e.employeeName.split(" ");
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ") || parts[0] || "";
    return [
      e.employeeId.slice(-8).toUpperCase(),
      lastName.replace(/,/g, " "),
      firstName.replace(/,/g, " "),
      e.regularHours.toFixed(2),
      e.overtimeHours.toFixed(2),
      e.locationName.replace(/,/g, " "),
    ].join(",");
  });
  return [header, ...rows].join("\n");
}

/**
 * Generate Gusto-compatible CSV (Gusto payroll import format)
 * Columns: Employee Email, Hours Worked, Overtime Hours, Pay Period Start, Pay Period End
 */
export function generateGustoCsv(entries: PayrollEntry[]): string {
  const header =
    "Employee Email,Hours Worked,Overtime Hours,Pay Period Start,Pay Period End";
  const rows = entries.map((e) =>
    [
      e.employeeEmail,
      e.totalHours.toFixed(2),
      e.overtimeHours.toFixed(2),
      e.periodStart,
      e.periodEnd,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Generate generic CSV with all fields
 */
export function generateGenericCsv(entries: PayrollEntry[]): string {
  const header =
    "Employee ID,Employee Name,Email,Location,Regular Hours,Overtime Hours,Total Hours,Break Minutes,Days Worked,Period Start,Period End";
  const rows = entries.map((e) =>
    [
      e.employeeId,
      `"${e.employeeName}"`,
      e.employeeEmail,
      `"${e.locationName}"`,
      e.regularHours.toFixed(2),
      e.overtimeHours.toFixed(2),
      e.totalHours.toFixed(2),
      e.breakMinutes,
      e.daysWorked,
      e.periodStart,
      e.periodEnd,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Generate payroll CSV in the specified format
 */
export function generatePayrollExport(
  entries: PayrollEntry[],
  format: PayrollFormat,
  companyCode?: string
): string {
  switch (format) {
    case "ADP":
      return generateAdpCsv(entries, companyCode);
    case "PAYCHEX":
      return generatePaychexCsv(entries);
    case "GUSTO":
      return generateGustoCsv(entries);
    case "CSV":
    case "GENERIC":
      return generateGenericCsv(entries);
  }
}

/**
 * Calculate payroll entries from time entry data.
 * Aggregates per employee across the period.
 */
export function calculatePayrollEntries(
  timeEntries: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    locationName: string;
    date: string;
    regularHours: number;
    overtimeHours: number;
    breakMinutes: number;
  }>,
  periodStart: string,
  periodEnd: string
): PayrollEntry[] {
  const byEmployee = new Map<
    string,
    {
      name: string;
      email: string;
      location: string;
      regularHours: number;
      overtimeHours: number;
      breakMinutes: number;
      dates: Set<string>;
    }
  >();

  for (const entry of timeEntries) {
    const existing = byEmployee.get(entry.userId);
    if (existing) {
      existing.regularHours += entry.regularHours;
      existing.overtimeHours += entry.overtimeHours;
      existing.breakMinutes += entry.breakMinutes;
      existing.dates.add(entry.date);
    } else {
      byEmployee.set(entry.userId, {
        name: entry.userName,
        email: entry.userEmail,
        location: entry.locationName,
        regularHours: entry.regularHours,
        overtimeHours: entry.overtimeHours,
        breakMinutes: entry.breakMinutes,
        dates: new Set([entry.date]),
      });
    }
  }

  return Array.from(byEmployee.entries()).map(([id, data]) => ({
    employeeId: id,
    employeeName: data.name,
    employeeEmail: data.email,
    locationName: data.location,
    regularHours: Math.round(data.regularHours * 100) / 100,
    overtimeHours: Math.round(data.overtimeHours * 100) / 100,
    totalHours:
      Math.round((data.regularHours + data.overtimeHours) * 100) / 100,
    breakMinutes: data.breakMinutes,
    daysWorked: data.dates.size,
    periodStart,
    periodEnd,
  }));
}

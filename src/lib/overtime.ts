export interface TimeEntryForCalc {
  date: string;
  durationMinutes: number;
}

export interface OvertimeResult {
  regularHours: number;
  dailyOvertimeHours: number;
  weeklyOvertimeHours: number;
  totalOvertimeHours: number;
  totalHours: number;
}

export interface DayBreakdown {
  date: string;
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
}

export function calculateOvertime(
  entries: TimeEntryForCalc[],
  dailyThreshold: number,
  weeklyThreshold: number
): OvertimeResult {
  const byDate = new Map<string, number>();
  for (const entry of entries) {
    const current = byDate.get(entry.date) ?? 0;
    byDate.set(entry.date, current + entry.durationMinutes / 60);
  }

  let totalHours = 0;
  let dailyOT = 0;

  for (const [, hours] of byDate) {
    totalHours += hours;
    if (hours > dailyThreshold) {
      dailyOT += hours - dailyThreshold;
    }
  }

  let weeklyOT = 0;
  if (totalHours > weeklyThreshold) {
    weeklyOT = Math.max(0, totalHours - weeklyThreshold - dailyOT);
  }

  const totalOT = dailyOT + weeklyOT;
  const regular = totalHours - totalOT;

  return {
    regularHours: round2(regular),
    dailyOvertimeHours: round2(dailyOT),
    weeklyOvertimeHours: round2(weeklyOT),
    totalOvertimeHours: round2(totalOT),
    totalHours: round2(totalHours),
  };
}

export function getDayBreakdowns(
  entries: TimeEntryForCalc[],
  dailyThreshold: number
): DayBreakdown[] {
  const byDate = new Map<string, number>();
  for (const entry of entries) {
    const current = byDate.get(entry.date) ?? 0;
    byDate.set(entry.date, current + entry.durationMinutes / 60);
  }

  const breakdowns: DayBreakdown[] = [];
  for (const [date, totalHours] of byDate) {
    const ot = Math.max(0, totalHours - dailyThreshold);
    breakdowns.push({
      date,
      totalHours: round2(totalHours),
      regularHours: round2(Math.min(totalHours, dailyThreshold)),
      overtimeHours: round2(ot),
    });
  }

  return breakdowns.sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateEntryOvertime(
  entryHours: number,
  totalDayHoursBefore: number,
  dailyThreshold: number
): { regularHours: number; overtimeHours: number } {
  const dayTotalAfter = totalDayHoursBefore + entryHours;

  if (dayTotalAfter <= dailyThreshold) {
    return { regularHours: round2(entryHours), overtimeHours: 0 };
  }

  if (totalDayHoursBefore >= dailyThreshold) {
    return { regularHours: 0, overtimeHours: round2(entryHours) };
  }

  const regular = dailyThreshold - totalDayHoursBefore;
  const ot = entryHours - regular;
  return { regularHours: round2(regular), overtimeHours: round2(ot) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

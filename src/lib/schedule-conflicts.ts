// Conflict detection from PharmShift

import { timeToDecimal } from "./schedule-time-utils";

export interface Conflict {
  type: "time-invalid" | "time-off" | "over-hours";
  message: string;
}

export function checkDayConflicts(startTime: string, endTime: string): Conflict | null {
  const start = timeToDecimal(startTime);
  const end = timeToDecimal(endTime);
  if (start >= end) {
    return { type: "time-invalid", message: "End time must be after start time" };
  }
  return null;
}

export function checkTimeOffConflict(
  employeeId: string,
  day: string,
  weekStart: string,
  timeOffRequests: Array<{ employeeId: string; date: string; status: string; allDay: boolean }>
): Conflict | null {
  // Calculate the actual date for this day in the week
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayIndex = days.indexOf(day);
  if (dayIndex === -1) return null;

  const weekStartDate = new Date(weekStart + "T00:00:00");
  const targetDate = new Date(weekStartDate);
  targetDate.setDate(targetDate.getDate() + dayIndex);
  const targetDateStr = targetDate.toISOString().split("T")[0];

  const conflict = timeOffRequests.find(
    (r) => r.employeeId === employeeId && r.date === targetDateStr && r.status === "Approved"
  );

  if (conflict) {
    return { type: "time-off", message: "Employee has approved time off on this day" };
  }
  return null;
}

export function checkHoursConflict(
  totalWeeklyHours: number,
  targetHours: number
): Conflict | null {
  if (totalWeeklyHours > targetHours + 2) {
    return {
      type: "over-hours",
      message: `${totalWeeklyHours.toFixed(1)}h exceeds target of ${targetHours}h`,
    };
  }
  return null;
}

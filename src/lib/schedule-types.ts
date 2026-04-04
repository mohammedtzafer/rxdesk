// PharmShift types adapted for RxDesk

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export const DAYS_OF_WEEK: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ROLE_COLORS: Record<string, string> = {
  Pharmacist: "#3B82F6",
  Technician: "#8B5CF6",
  Nimble: "#8B5CF6",
  Filling: "#22C55E",
  Mail: "#F59E0B",
  POS: "#EF4444",
  "Unbilled/Misc": "#6B7280",
  Driver: "#06B6D4",
};

export function getRoleColor(role: string): string {
  return ROLE_COLORS[role] || "#6B7280";
}

export interface DayAvailabilityData {
  available: boolean;
  startTime: string;
  endTime: string;
  role: string;
}

export interface ScheduleEntryData {
  id?: string;
  employeeId: string;
  employeeName: string;
  day: string;
  available: boolean;
  startTime: string;
  endTime: string;
  role: string;
}

export interface WeeklyScheduleData {
  id: string;
  locationId: string;
  weekStart: string;
  status: "Not Started" | "In Progress" | "Finalized";
  entries: ScheduleEntryData[];
  comments: Array<{ id: string; text: string; createdAt: string }>;
  lastUpdated: string;
  finalizedAt?: string;
}

export interface EmployeeWithAvailability {
  id: string;
  name: string;
  targetHoursPerWeek: number;
  sortOrder: number;
  locationId: string;
  availability: Record<DayOfWeek, DayAvailabilityData>;
}

export function makeDefaultAvailability(): Record<DayOfWeek, DayAvailabilityData> {
  const avail: Record<string, DayAvailabilityData> = {};
  for (const day of DAYS_OF_WEEK) {
    avail[day] = { available: true, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" };
  }
  return avail as Record<DayOfWeek, DayAvailabilityData>;
}

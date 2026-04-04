"use client";

import { DAYS_OF_WEEK, DayOfWeek, getRoleColor, EmployeeWithAvailability } from "@/lib/schedule-types";

interface WeeklyOverviewProps {
  employees: EmployeeWithAvailability[];
  selectedDay: DayOfWeek;
  onDaySelect: (day: DayOfWeek) => void;
  weekLabel: string;
}

export function WeeklyOverview({
  employees,
  selectedDay,
  onDaySelect,
  weekLabel,
}: WeeklyOverviewProps) {
  return (
    <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
        <h3 className="font-semibold text-[15px] text-[#1d1d1f]">Week overview — {weekLabel}</h3>
      </div>

      {/* Day cards grid */}
      <div
        className="grid grid-cols-3 lg:grid-cols-6 gap-2 p-4"
        role="radiogroup"
        aria-label="Select a day to view"
      >
        {DAYS_OF_WEEK.map((day) => {
          const available = employees.filter(
            (emp) => emp.availability[day]?.available
          );
          const isSelected = day === selectedDay;

          return (
            <button
              key={day}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${day}, ${available.length} staff scheduled`}
              onClick={() => onDaySelect(day)}
              className={`rounded-xl p-3 text-left transition-all border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-[#0071e3] bg-[#f0f6ff]"
                  : "border-transparent bg-[#f5f5f7] hover:bg-[#ebebeb]"
              }`}
            >
              <p className={`font-semibold text-[12px] ${isSelected ? "text-[#0071e3]" : "text-[rgba(0,0,0,0.48)]"}`}>
                {day.slice(0, 3)}
              </p>
              <p className={`text-2xl font-bold mt-1 ${isSelected ? "text-[#0071e3]" : "text-[#1d1d1f]"}`}>
                {available.length}
              </p>
              <p className="text-[10px] text-[rgba(0,0,0,0.48)]">staff</p>

              <div className="flex flex-wrap gap-0.5 mt-2" aria-hidden="true">
                {available.map((emp) => {
                  const avail = emp.availability[day];
                  const color = getRoleColor(avail.role);
                  return (
                    <div
                      key={emp.id}
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: color }}
                      title={`${emp.name} (${avail.role})`}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Coverage summary for selected day */}
      <div className="border-t border-[rgba(0,0,0,0.05)] px-4 py-3">
        <h4 className="text-[11px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide mb-2">
          {selectedDay} coverage by role
        </h4>
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Role coverage">
          {(() => {
            const available = employees.filter(
              (emp) => emp.availability[selectedDay]?.available
            );
            const roleCounts: Record<string, number> = {};
            available.forEach((emp) => {
              const role = emp.availability[selectedDay].role;
              roleCounts[role] = (roleCounts[role] || 0) + 1;
            });
            if (Object.keys(roleCounts).length === 0) {
              return (
                <span className="text-[13px] text-[rgba(0,0,0,0.48)]">No coverage</span>
              );
            }
            return Object.entries(roleCounts).map(([role, count]) => {
              const color = getRoleColor(role);
              return (
                <span
                  key={role}
                  role="listitem"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white"
                  style={{ backgroundColor: color }}
                >
                  {role}: {count}
                </span>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}

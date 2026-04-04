"use client";

import { useState } from "react";
import { DayOfWeek, getRoleColor, EmployeeWithAvailability } from "@/lib/schedule-types";
import { decimalToTime, timeToDecimal } from "@/lib/schedule-time-utils";
import { EmployeeAvatar } from "./employee-avatar";
import { Pencil } from "lucide-react";

const BUSINESS_START = 8;
const BUSINESS_END = 20;
const TOTAL_HOURS = BUSINESS_END - BUSINESS_START;

type TimeGranularity = "1h" | "30m" | "15m";

interface TimeSlot {
  decimal: number;
  label: string;
  type: "hour" | "30m" | "15m";
}

function buildTimeSlots(granularity: TimeGranularity): TimeSlot[] {
  const step = granularity === "1h" ? 1 : granularity === "30m" ? 0.5 : 0.25;
  const slots: TimeSlot[] = [];

  for (let h = BUSINESS_START; h <= BUSINESS_END; h += step) {
    const hour = Math.floor(h);
    const minutes = Math.round((h - hour) * 60);
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const period = hour >= 12 ? "PM" : "AM";

    if (minutes === 0) {
      slots.push({ decimal: h, label: `${displayHour} ${period}`, type: "hour" });
    } else if (minutes === 30) {
      slots.push({ decimal: h, label: ":30", type: "30m" });
    } else {
      slots.push({ decimal: h, label: `:${minutes.toString().padStart(2, "0")}`, type: "15m" });
    }
  }

  return slots;
}

interface DailyTimelineProps {
  employees: EmployeeWithAvailability[];
  day: DayOfWeek;
  onEmployeeClick?: (employee: EmployeeWithAvailability) => void;
  /** Controlled granularity from parent. When provided, hides the internal toggle. */
  granularity?: TimeGranularity;
  onGranularityChange?: (g: TimeGranularity) => void;
}

export function DailyTimeline({
  employees,
  day,
  onEmployeeClick,
  granularity: controlledGranularity,
  onGranularityChange,
}: DailyTimelineProps) {
  const [internalGranularity, setInternalGranularity] = useState<TimeGranularity>("1h");
  const granularity = controlledGranularity ?? internalGranularity;
  const setGranularity = (g: TimeGranularity) => {
    if (onGranularityChange) {
      onGranularityChange(g);
    } else {
      setInternalGranularity(g);
    }
  };
  const slots = buildTimeSlots(granularity);

  const availableEmployees = employees.filter(
    (emp) => emp.availability[day]?.available
  );

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[rgba(0,0,0,0.06)]">
      <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-[15px] text-[#1d1d1f]">{day}</h3>
            <span className="text-[13px] text-[rgba(0,0,0,0.48)]" aria-live="polite">
              {availableEmployees.length} staff
            </span>
          </div>

          {!controlledGranularity && (
            <div
              className="flex items-center gap-0.5 bg-[#f5f5f7] rounded-lg p-0.5 print:hidden"
              role="radiogroup"
              aria-label="Timeline granularity"
            >
              {(["1h", "30m", "15m"] as TimeGranularity[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={granularity === g}
                  onClick={() => setGranularity(g)}
                  className={`h-6 px-2.5 text-[11px] rounded-md transition-all font-medium ${
                    granularity === g
                      ? "bg-white shadow-sm text-[#1d1d1f]"
                      : "text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f]"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {availableEmployees.length > 0 && (
        <div className="px-4 py-2 bg-[#f0f6ff] border-b border-[rgba(0,113,227,0.1)] print:hidden">
          <p className="text-[11px] text-[#0071e3]">
            Tap an employee name to edit their schedule, role, and hours
          </p>
        </div>
      )}

      {availableEmployees.length === 0 ? (
        <div className="p-8 text-center text-[14px] text-[rgba(0,0,0,0.48)]" role="status">
          No staff scheduled for {day}
        </div>
      ) : (
        <div
          className="overflow-x-auto print:overflow-visible"
          tabIndex={0}
          role="region"
          aria-label={`${day} schedule timeline`}
        >
          <div
            className={
              granularity === "1h"
                ? "min-w-[600px]"
                : granularity === "30m"
                  ? "min-w-[900px]"
                  : "min-w-[1400px]"
            }
          >
            {/* Ruler time header */}
            <div className="flex border-b border-[rgba(0,0,0,0.05)]" aria-hidden="true">
              <div className="w-36 flex-shrink-0" />
              <div className="flex-1 relative">
                <div className="flex h-5">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex-1 relative">
                      {slot.type === "hour" && (
                        <span className="absolute left-0 -translate-x-1/2 text-[10px] font-semibold text-[#1d1d1f] whitespace-nowrap">
                          {slot.label}
                        </span>
                      )}
                      {slot.type === "30m" && granularity !== "1h" && (
                        <span className="absolute left-0 -translate-x-1/2 text-[9px] text-[rgba(0,0,0,0.48)]">
                          {slot.label}
                        </span>
                      )}
                      {slot.type === "15m" && granularity === "15m" && (
                        <span className="absolute left-0 -translate-x-1/2 text-[8px] text-[rgba(0,0,0,0.24)]">
                          {slot.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex h-3 border-t border-[rgba(0,0,0,0.05)]">
                  {slots.map((slot, i) => (
                    <div key={i} className="flex-1 relative">
                      <div
                        className={`absolute left-0 top-0 w-px ${
                          slot.type === "hour"
                            ? "h-3 bg-[rgba(0,0,0,0.3)]"
                            : slot.type === "30m"
                              ? "h-2 bg-[rgba(0,0,0,0.15)]"
                              : "h-1 bg-[rgba(0,0,0,0.08)]"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Employee rows */}
            <div role="list" aria-label="Scheduled employees">
              {availableEmployees.map((employee) => {
                const avail = employee.availability[day];
                const roleColor = getRoleColor(avail.role);
                const startDec = timeToDecimal(avail.startTime);
                const endDec = timeToDecimal(avail.endTime);
                const left = ((Math.max(startDec, BUSINESS_START) - BUSINESS_START) / TOTAL_HOURS) * 100;
                const width =
                  ((Math.min(endDec, BUSINESS_END) - Math.max(startDec, BUSINESS_START)) /
                    TOTAL_HOURS) *
                  100;

                return (
                  <div
                    key={employee.id}
                    role="listitem"
                    className="flex items-center border-b border-[rgba(0,0,0,0.04)] last:border-b-0 hover:bg-[#f5f5f7] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onEmployeeClick?.(employee)}
                      className="w-36 flex-shrink-0 px-3 py-2 text-left focus:outline-none group focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-inset"
                      aria-label={`Edit schedule for ${employee.name}, ${avail.role}, ${avail.startTime} to ${avail.endTime}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <EmployeeAvatar name={employee.name} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-[12px] text-[#1d1d1f] truncate">{employee.name}</p>
                            <Pencil
                              className="w-2.5 h-2.5 text-[rgba(0,0,0,0)] group-hover:text-[rgba(0,0,0,0.48)] transition-colors flex-shrink-0"
                              aria-hidden="true"
                            />
                          </div>
                          <p className="text-[10px] text-[rgba(0,0,0,0.48)] truncate">{avail.role}</p>
                        </div>
                      </div>
                    </button>

                    <div className="flex-1 relative h-12" aria-hidden="true">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex">
                        {slots.map((slot, i) => (
                          <div
                            key={i}
                            className={`flex-1 border-l ${
                              slot.type === "hour"
                                ? "border-[rgba(0,0,0,0.06)]"
                                : slot.type === "30m"
                                  ? "border-[rgba(0,0,0,0.03)]"
                                  : "border-[rgba(0,0,0,0.015)]"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Schedule bar */}
                      <div
                        className="absolute top-2 bottom-2 rounded-md flex items-center justify-center text-[10px] font-medium transition-opacity hover:opacity-80 print:rounded-sm"
                        style={{
                          left: `${Math.max(0, left)}%`,
                          width: `${Math.max(0, Math.min(100 - Math.max(0, left), width))}%`,
                          backgroundColor: roleColor,
                          color: "#fff",
                        }}
                      >
                        <span className="truncate px-1">
                          {decimalToTime(startDec)} – {decimalToTime(endDec)} ({avail.role})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

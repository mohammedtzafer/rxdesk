"use client";

import { useState } from "react";
import {
  DAYS_OF_WEEK,
  DayOfWeek,
  DayAvailabilityData,
  EmployeeWithAvailability,
  makeDefaultAvailability,
  getRoleColor,
} from "@/lib/schedule-types";
import { TIME_OPTIONS } from "@/lib/schedule-time-utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    targetHours: number,
    availability: Record<DayOfWeek, DayAvailabilityData>
  ) => void;
  onDelete?: () => void;
  employee?: EmployeeWithAvailability;
  roles: string[];
  title: string;
}

export function EmployeeForm({
  open,
  onClose,
  onSave,
  onDelete,
  employee,
  roles,
  title,
}: EmployeeFormProps) {
  const [name, setName] = useState(employee?.name ?? "");
  const [targetHours, setTargetHours] = useState(
    employee?.targetHoursPerWeek ?? 40
  );
  const [availability, setAvailability] = useState<
    Record<DayOfWeek, DayAvailabilityData>
  >(employee?.availability ?? makeDefaultAvailability());

  function handleDayToggle(day: DayOfWeek) {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], available: !prev[day].available },
    }));
  }

  function handleTimeChange(
    day: DayOfWeek,
    field: "startTime" | "endTime",
    value: string
  ) {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  function handleRoleChange(day: DayOfWeek, role: string) {
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], role },
    }));
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), targetHours, availability);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {employee
              ? "Update availability, target hours, and per-day roles."
              : "Add a new team member with their weekly availability."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name — only show for new employees; existing names are managed in team settings */}
          {!employee && (
            <div className="space-y-1.5">
              <Label htmlFor="emp-name" className="text-[12px]">
                Name
              </Label>
              <Input
                id="emp-name"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          {/* Target hours */}
          <div className="space-y-1.5">
            <Label htmlFor="emp-hours" className="text-[12px]">
              Target hours per week
            </Label>
            <Input
              id="emp-hours"
              type="number"
              min={0}
              max={80}
              step={1}
              value={targetHours}
              onChange={(e) =>
                setTargetHours(Math.max(0, parseInt(e.target.value) || 0))
              }
              className="w-24"
            />
            <p className="text-[11px] text-[rgba(0,0,0,0.48)]">
              Used to flag over/under scheduling
            </p>
          </div>

          <Separator />

          {/* Availability per day */}
          <fieldset>
            <legend className="text-[13px] font-semibold text-[#1d1d1f] mb-3">
              Weekly availability and roles
            </legend>
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const dayAvail = availability[day];
                return (
                  <div
                    key={day}
                    className={`rounded-xl border p-3 transition-colors ${
                      dayAvail.available
                        ? "bg-white border-[rgba(0,0,0,0.08)]"
                        : "bg-[#f5f5f7] border-[rgba(0,0,0,0.04)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={dayAvail.available}
                        aria-label={`${day} availability`}
                        onClick={() => handleDayToggle(day)}
                        className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] rounded"
                      >
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            dayAvail.available
                              ? "bg-[#0071e3] border-[#0071e3]"
                              : "bg-white border-[rgba(0,0,0,0.2)]"
                          }`}
                          aria-hidden="true"
                        >
                          {dayAvail.available && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="text-[13px] font-medium text-[#1d1d1f]">
                          {day}
                        </span>
                      </button>
                      {!dayAvail.available && (
                        <span className="text-[11px] text-[rgba(0,0,0,0.48)]">
                          Off
                        </span>
                      )}
                    </div>

                    {dayAvail.available && (
                      <div className="space-y-2">
                        <Select
                          value={dayAvail.role}
                          onValueChange={(v) => v && handleRoleChange(day, v)}
                        >
                          <SelectTrigger
                            className="h-8 text-[12px]"
                            aria-label={`${day} role`}
                          >
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => {
                              const color = getRoleColor(r);
                              return (
                                <SelectItem
                                  key={r}
                                  value={r}
                                  className="text-[12px]"
                                >
                                  <span className="flex items-center gap-2">
                                    <span
                                      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                      aria-hidden="true"
                                    />
                                    {r}
                                  </span>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                          <Select
                            value={dayAvail.startTime}
                            onValueChange={(v) =>
                              v && handleTimeChange(day, "startTime", v)
                            }
                          >
                            <SelectTrigger
                              className="h-8 text-[12px] flex-1"
                              aria-label={`${day} start time`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem
                                  key={t}
                                  value={t}
                                  className="text-[12px]"
                                >
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span
                            className="text-[12px] text-[rgba(0,0,0,0.48)]"
                            aria-hidden="true"
                          >
                            to
                          </span>
                          <Select
                            value={dayAvail.endTime}
                            onValueChange={(v) =>
                              v && handleTimeChange(day, "endTime", v)
                            }
                          >
                            <SelectTrigger
                              className="h-8 text-[12px] flex-1"
                              aria-label={`${day} end time`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((t) => (
                                <SelectItem
                                  key={t}
                                  value={t}
                                  className="text-[12px]"
                                >
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="w-full sm:w-auto sm:mr-auto px-4 py-2 bg-[#EF4444] text-white rounded-lg text-[13px] hover:bg-[#DC2626] transition-colors"
            >
              Remove employee
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() && !employee}
            className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
          >
            {employee ? "Save changes" : "Add employee"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useMemo } from "react";
import {
  DAYS_OF_WEEK,
  DayOfWeek,
  DayAvailabilityData,
  ScheduleEntryData,
  WeeklyScheduleData,
  EmployeeWithAvailability,
  getRoleColor,
} from "@/lib/schedule-types";
import { TIME_OPTIONS, timeToDecimal } from "@/lib/schedule-time-utils";
import {
  checkDayConflicts,
  checkTimeOffConflict,
  checkHoursConflict,
} from "@/lib/schedule-conflicts";
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
import { EmployeeAvatar } from "./employee-avatar";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ClipboardList,
  MessageSquare,
  Plus,
  AlertTriangle,
} from "lucide-react";

interface TimeOffEntry {
  employeeId: string;
  date: string;
  status: string;
  allDay: boolean;
}

interface ScheduleEditorProps {
  schedules: WeeklyScheduleData[];
  employees: EmployeeWithAvailability[];
  roles: string[];
  locationId: string;
  locationName: string;
  timeOffRequests: TimeOffEntry[];
  onSaveSchedule: (schedule: WeeklyScheduleData) => Promise<void>;
}

// Group flat entries into a structure keyed by employeeId -> day -> avail
type EntryMap = Record<string, Record<string, DayAvailabilityData>>;

function buildEntryMap(entries: ScheduleEntryData[]): EntryMap {
  const map: EntryMap = {};
  for (const e of entries) {
    if (!map[e.employeeId]) map[e.employeeId] = {};
    map[e.employeeId][e.day] = {
      available: e.available,
      startTime: e.startTime,
      endTime: e.endTime,
      role: e.role,
    };
  }
  return map;
}

function flattenEntryMap(
  employees: EmployeeWithAvailability[],
  entryMap: EntryMap
): ScheduleEntryData[] {
  const out: ScheduleEntryData[] = [];
  for (const emp of employees) {
    for (const day of DAYS_OF_WEEK) {
      const avail = entryMap[emp.id]?.[day] ?? emp.availability[day] ?? {
        available: false,
        startTime: "9:00 AM",
        endTime: "5:00 PM",
        role: "Filling",
      };
      out.push({
        employeeId: emp.id,
        employeeName: emp.name,
        day,
        available: avail.available,
        startTime: avail.startTime,
        endTime: avail.endTime,
        role: avail.role,
      });
    }
  }
  return out;
}

function buildDefaultEntryMap(employees: EmployeeWithAvailability[]): EntryMap {
  const map: EntryMap = {};
  for (const emp of employees) {
    map[emp.id] = {};
    for (const day of DAYS_OF_WEEK) {
      map[emp.id][day] = { ...emp.availability[day] };
    }
  }
  return map;
}

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.48)] border-[rgba(0,0,0,0.08)]",
  "In Progress": "bg-[#FFF3CD] text-[#856404] border-[#FFE69C]",
  Finalized: "bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]",
};

export function ScheduleEditor({
  schedules,
  employees,
  roles,
  locationId,
  timeOffRequests,
  onSaveSchedule,
}: ScheduleEditorProps) {
  const [viewWeek, setViewWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [saving, setSaving] = useState(false);
  const [editCell, setEditCell] = useState<{
    employeeId: string;
    day: DayOfWeek;
    avail: DayAvailabilityData;
  } | null>(null);
  const [commentDialog, setCommentDialog] = useState(false);
  const [commentText, setCommentText] = useState("");

  const weekKey = format(viewWeek, "yyyy-MM-dd");
  const weekLabel = `${format(viewWeek, "MMM d")} – ${format(addDays(viewWeek, 5), "MMM d, yyyy")}`;

  const locationSchedules = useMemo(
    () => schedules.filter((s) => s.locationId === locationId),
    [schedules, locationId]
  );
  const currentSchedule = locationSchedules.find((s) => s.weekStart === weekKey);
  const prevWeekKey = format(subWeeks(viewWeek, 1), "yyyy-MM-dd");
  const prevSchedule = locationSchedules.find((s) => s.weekStart === prevWeekKey);

  // Build the entry map for the current schedule
  const entryMap = useMemo((): EntryMap => {
    if (!currentSchedule) return {};
    return buildEntryMap(currentSchedule.entries);
  }, [currentSchedule]);

  // Conflict check for the edit dialog
  const editConflicts = useMemo(() => {
    if (!editCell || !currentSchedule) return [];
    const conflicts = [];
    const dayConflict = checkDayConflicts(editCell.avail.startTime, editCell.avail.endTime);
    if (dayConflict) conflicts.push(dayConflict);
    if (editCell.avail.available) {
      const toConflict = checkTimeOffConflict(
        editCell.employeeId,
        editCell.day,
        weekKey,
        timeOffRequests
      );
      if (toConflict) conflicts.push(toConflict);
    }
    return conflicts;
  }, [editCell, currentSchedule, weekKey, timeOffRequests]);

  async function save(patch: Partial<WeeklyScheduleData>) {
    setSaving(true);
    const base = currentSchedule ?? {
      id: "",
      locationId,
      weekStart: weekKey,
      status: "In Progress" as const,
      entries: [],
      comments: [],
      lastUpdated: new Date().toISOString(),
    };
    await onSaveSchedule({ ...base, ...patch });
    setSaving(false);
  }

  function createFromDefaults() {
    const newEntryMap = buildDefaultEntryMap(employees);
    const entries = flattenEntryMap(employees, newEntryMap);
    save({ status: "In Progress", entries, lastUpdated: new Date().toISOString() });
  }

  function copyFromPrevious() {
    if (!prevSchedule) return;
    save({
      status: "In Progress",
      entries: prevSchedule.entries.map((e) => {
        const emp = employees.find((em) => em.id === e.employeeId);
        return { ...e, employeeName: emp?.name ?? e.employeeName };
      }),
      lastUpdated: new Date().toISOString(),
    });
  }

  function handleSaveCell() {
    if (!editCell || !currentSchedule) return;
    const updated = currentSchedule.entries.filter(
      (e) => !(e.employeeId === editCell.employeeId && e.day === editCell.day)
    );
    const emp = employees.find((e) => e.id === editCell.employeeId);
    updated.push({
      employeeId: editCell.employeeId,
      employeeName: emp?.name ?? editCell.employeeId,
      day: editCell.day,
      available: editCell.avail.available,
      startTime: editCell.avail.startTime,
      endTime: editCell.avail.endTime,
      role: editCell.avail.role,
    });
    const wasFinalized = currentSchedule.status === "Finalized";
    save({ entries: updated, lastUpdated: new Date().toISOString() });
    setEditCell(null);
    if (wasFinalized) setCommentDialog(true);
  }

  function handleFinalize() {
    if (!currentSchedule) return;
    save({ status: "Finalized", lastUpdated: new Date().toISOString() });
  }

  async function handleAddComment() {
    if (!currentSchedule || !commentText.trim()) return;
    setSaving(true);
    await onSaveSchedule({
      ...currentSchedule,
      comments: [
        ...currentSchedule.comments,
        { id: Date.now().toString(), text: commentText.trim(), createdAt: new Date().toISOString() },
      ],
      lastUpdated: new Date().toISOString(),
    });
    setSaving(false);
    setCommentText("");
    setCommentDialog(false);
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-[rgba(0,0,0,0.48)]" aria-hidden="true" />
          <h3 className="font-semibold text-[15px] text-[#1d1d1f]">Weekly schedule</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setViewWeek((w) => subWeeks(w, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors text-[#1d1d1f]"
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium min-w-[200px] text-center text-[#1d1d1f]">
            {weekLabel}
          </span>
          <button
            type="button"
            onClick={() => setViewWeek((w) => addWeeks(w, 1))}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors text-[#1d1d1f]"
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!currentSchedule ? (
        <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] p-10 text-center space-y-4">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.48)] border-[rgba(0,0,0,0.08)]">
            Not started
          </span>
          <h4 className="text-[21px] font-semibold text-[#1d1d1f]">No schedule for this week</h4>
          <p className="text-[14px] text-[rgba(0,0,0,0.48)] max-w-sm mx-auto">
            Create a new schedule from employee defaults or copy last week&apos;s schedule.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={createFromDefaults}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Create from defaults
            </button>
            {prevSchedule && (
              <button
                type="button"
                onClick={copyFromPrevious}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[14px] hover:bg-[#f5f5f7] transition-colors disabled:opacity-50"
              >
                <Copy className="w-4 h-4" aria-hidden="true" />
                Copy from previous week
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Status bar */}
          <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                  STATUS_STYLES[currentSchedule.status]
                }`}
              >
                {currentSchedule.status}
              </span>
              <span className="text-[12px] text-[rgba(0,0,0,0.48)]">
                Updated: {format(new Date(currentSchedule.lastUpdated), "MMM d, h:mm a")}
              </span>
              {currentSchedule.finalizedAt && (
                <span className="text-[12px] text-[rgba(0,0,0,0.48)]">
                  · Finalized: {format(new Date(currentSchedule.finalizedAt), "MMM d, h:mm a")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCommentDialog(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                Comment ({currentSchedule.comments.length})
              </button>
              {currentSchedule.status !== "Finalized" && (
                <button
                  type="button"
                  onClick={handleFinalize}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  Finalize
                </button>
              )}
            </div>
          </div>

          {/* Schedule grid */}
          <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-[12px]">
                <thead>
                  <tr className="border-b border-[rgba(0,0,0,0.05)] bg-[#f5f5f7]">
                    <th className="text-left px-3 py-2.5 font-semibold text-[rgba(0,0,0,0.48)] w-40 sticky left-0 z-20 bg-[#f5f5f7]">
                      Employee
                    </th>
                    {DAYS_OF_WEEK.map((day) => (
                      <th
                        key={day}
                        className="text-center px-2 py-2.5 font-semibold text-[rgba(0,0,0,0.48)]"
                      >
                        {day.slice(0, 3)}
                      </th>
                    ))}
                    <th className="text-center px-2 py-2.5 font-semibold text-[rgba(0,0,0,0.48)] w-14">
                      Hrs
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => {
                    // Merge schedule entries over employee defaults
                    const empEntries = entryMap[emp.id] ?? {};
                    let totalHours = 0;
                    for (const day of DAYS_OF_WEEK) {
                      const d = empEntries[day] ?? emp.availability[day];
                      if (d?.available) {
                        totalHours +=
                          timeToDecimal(d.endTime) - timeToDecimal(d.startTime);
                      }
                    }
                    const hoursConflict = checkHoursConflict(totalHours, emp.targetHoursPerWeek);

                    return (
                      <tr
                        key={emp.id}
                        className="border-b border-[rgba(0,0,0,0.04)] last:border-b-0 hover:bg-[#f5f5f7]"
                      >
                        <td className="px-3 py-2 sticky left-0 z-10 bg-white">
                          <div className="flex items-center gap-2">
                            <EmployeeAvatar name={emp.name} />
                            <div className="min-w-0">
                              <p className="font-medium text-[12px] text-[#1d1d1f] truncate">
                                {emp.name}
                              </p>
                              <p className="text-[10px] text-[rgba(0,0,0,0.48)]">
                                {emp.targetHoursPerWeek > 0
                                  ? `${emp.targetHoursPerWeek}h target`
                                  : ""}
                                {hoursConflict && (
                                  <span
                                    className="text-[#F59E0B] ml-1"
                                    title={hoursConflict.message}
                                  >
                                    <AlertTriangle className="w-3 h-3 inline" />
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </td>

                        {DAYS_OF_WEEK.map((day) => {
                          const d = empEntries[day] ?? emp.availability[day];
                          const roleColor = d?.available ? getRoleColor(d.role) : null;
                          const toConflict =
                            d?.available
                              ? checkTimeOffConflict(emp.id, day, weekKey, timeOffRequests)
                              : null;

                          return (
                            <td
                              key={day}
                              className="px-1 py-1 text-center relative"
                            >
                              {d?.available ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditCell({
                                      employeeId: emp.id,
                                      day,
                                      avail: { ...d },
                                    })
                                  }
                                  className={`w-full rounded-lg px-1 py-1.5 text-[9px] font-medium hover:opacity-80 transition-opacity leading-tight text-white relative ${
                                    toConflict ? "ring-2 ring-[#F59E0B]" : ""
                                  }`}
                                  style={{ backgroundColor: roleColor ?? "#6B7280" }}
                                  aria-label={`Edit ${emp.name} ${day}: ${d.startTime}–${d.endTime} as ${d.role}`}
                                  title={toConflict ? toConflict.message : undefined}
                                >
                                  <span className="block">
                                    {d.startTime.replace(" ", "")}
                                  </span>
                                  <span className="block">
                                    {d.endTime.replace(" ", "")}
                                  </span>
                                  <span className="block opacity-80 text-[8px] mt-0.5">
                                    {d.role}
                                  </span>
                                  {toConflict && (
                                    <AlertTriangle className="w-3 h-3 absolute top-0.5 right-0.5 text-[#F59E0B]" />
                                  )}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditCell({
                                      employeeId: emp.id,
                                      day,
                                      avail: {
                                        available: true,
                                        startTime: "9:00 AM",
                                        endTime: "5:00 PM",
                                        role: roles[0] ?? "Filling",
                                      },
                                    })
                                  }
                                  className="w-full text-[rgba(0,0,0,0.24)] text-[10px] py-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                                  aria-label={`Schedule ${emp.name} for ${day}`}
                                >
                                  OFF
                                </button>
                              )}
                            </td>
                          );
                        })}

                        <td className="px-2 py-2 text-center">
                          <span
                            className={`font-bold text-[12px] ${
                              emp.targetHoursPerWeek > 0 &&
                              totalHours < emp.targetHoursPerWeek
                                ? "text-[#F59E0B]"
                                : emp.targetHoursPerWeek > 0 &&
                                    totalHours > emp.targetHoursPerWeek + 2
                                  ? "text-[#EF4444]"
                                  : "text-[#1d1d1f]"
                            }`}
                          >
                            {totalHours.toFixed(1).replace(/\.0$/, "")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Comments */}
          {currentSchedule.comments.length > 0 && (
            <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.05)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[rgba(0,0,0,0.48)]" aria-hidden="true" />
                <h4 className="font-semibold text-[14px] text-[#1d1d1f]">
                  Comments ({currentSchedule.comments.length})
                </h4>
              </div>
              <div className="divide-y divide-[rgba(0,0,0,0.04)]">
                {currentSchedule.comments.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <p className="text-[13px] text-[#1d1d1f]">{c.text}</p>
                    <p className="text-[11px] text-[rgba(0,0,0,0.48)] mt-1">
                      {format(new Date(c.createdAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit cell dialog */}
      {editCell && (
        <Dialog open onOpenChange={(open) => !open && setEditCell(null)}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>
                {employees.find((e) => e.id === editCell.employeeId)?.name} —{" "}
                {editCell.day.slice(0, 3)}
              </DialogTitle>
              <DialogDescription>
                {currentSchedule?.status === "Finalized"
                  ? "Finalized schedule — add a comment after saving."
                  : "Update the shift for this day."}
              </DialogDescription>
            </DialogHeader>

            {editConflicts.length > 0 && (
              <div className="bg-[#FFFBEB] border border-[#FCD34D] rounded-lg p-2.5 space-y-1">
                {editConflicts.map((c, i) => (
                  <p
                    key={i}
                    className="text-[12px] text-[#92400E] flex items-start gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {c.message}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3 py-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={editCell.avail.available}
                  onClick={() =>
                    setEditCell({
                      ...editCell,
                      avail: { ...editCell.avail, available: !editCell.avail.available },
                    })
                  }
                  className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] rounded"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      editCell.avail.available
                        ? "bg-[#0071e3] border-[#0071e3]"
                        : "bg-white border-[rgba(0,0,0,0.2)]"
                    }`}
                    aria-hidden="true"
                  >
                    {editCell.avail.available && (
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
                  <span className="text-[13px] font-medium text-[#1d1d1f]">Working</span>
                </button>
              </div>

              {editCell.avail.available && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[12px] text-[rgba(0,0,0,0.48)]">Role</Label>
                    <Select
                      value={editCell.avail.role}
                      onValueChange={(v) =>
                        v && setEditCell({ ...editCell, avail: { ...editCell.avail, role: v } })
                      }
                    >
                      <SelectTrigger className="h-8 text-[12px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r} className="text-[12px]">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[12px] text-[rgba(0,0,0,0.48)]">Start</Label>
                      <Select
                        value={editCell.avail.startTime}
                        onValueChange={(v) =>
                          v &&
                          setEditCell({ ...editCell, avail: { ...editCell.avail, startTime: v } })
                        }
                      >
                        <SelectTrigger className="h-8 text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-[12px]">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <span className="text-[12px] text-[rgba(0,0,0,0.48)] mt-5">to</span>
                    <div className="flex-1 space-y-1">
                      <Label className="text-[12px] text-[rgba(0,0,0,0.48)]">End</Label>
                      <Select
                        value={editCell.avail.endTime}
                        onValueChange={(v) =>
                          v &&
                          setEditCell({ ...editCell, avail: { ...editCell.avail, endTime: v } })
                        }
                      >
                        <SelectTrigger className="h-8 text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t} className="text-[12px]">
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={() => setEditCell(null)}
                className="px-4 py-2 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCell}
                disabled={saving}
                className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
              >
                Save shift
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Comment dialog */}
      <Dialog
        open={commentDialog}
        onOpenChange={(open) => !open && setCommentDialog(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add comment</DialogTitle>
            <DialogDescription>
              {currentSchedule?.status === "Finalized"
                ? "Explain what changed and why."
                : "Add a note about this schedule."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="What changed and why..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              autoFocus
              aria-label="Comment text"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setCommentDialog(false)}
              className="px-4 py-2 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddComment}
              disabled={!commentText.trim() || saving}
              className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              Add comment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

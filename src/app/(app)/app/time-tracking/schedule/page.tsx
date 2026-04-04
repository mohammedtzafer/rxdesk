"use client";

import { useState, useEffect, useCallback } from "react";
import { DayOfWeek, DAYS_OF_WEEK, EmployeeWithAvailability, makeDefaultAvailability, WeeklyScheduleData, ScheduleEntryData } from "@/lib/schedule-types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DailyTimeline } from "@/components/schedule/daily-timeline";
import { WeeklyOverview } from "@/components/schedule/weekly-overview";
import { EmployeeForm } from "@/components/schedule/employee-form";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface Location {
  id: string;
  name: string;
  roles?: string[];
}

export default function SchedulePage() {
  const [viewWeek, setViewWeek] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    DAYS_OF_WEEK[new Date().getDay() === 0 ? 5 : Math.min(new Date().getDay() - 1, 5)]
  );
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [employees, setEmployees] = useState<EmployeeWithAvailability[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleData[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEmployee, setEditEmployee] = useState<EmployeeWithAvailability | null>(null);

  const weekStart = format(viewWeek, "yyyy-MM-dd");
  const weekLabel = `${format(viewWeek, "MMM d")} – ${format(addDays(viewWeek, 5), "MMM d, yyyy")}`;

  useEffect(() => {
    fetchLocations();
  }, []);

  // Fetch employees + schedule whenever location or week changes
  const fetchData = useCallback(async () => {
    if (!selectedLocationId) return;
    setLoading(true);

    const [empRes, schedRes] = await Promise.all([
      fetch(`/api/employees?locationId=${selectedLocationId}`),
      fetch(`/api/schedules?locationId=${selectedLocationId}&weekStart=${weekStart}`),
    ]);

    let baseEmployees: EmployeeWithAvailability[] = [];
    let weekSchedules: WeeklyScheduleData[] = [];

    if (empRes.ok) baseEmployees = await empRes.json();
    if (schedRes.ok) {
      const data = await schedRes.json();
      weekSchedules = Array.isArray(data) ? data : [];
    }

    setSchedules(weekSchedules);

    // Merge schedule entries into employee data
    // If a schedule exists for this week, use schedule entries instead of default availability
    const merged = mergeScheduleIntoEmployees(baseEmployees, weekSchedules);
    setEmployees(merged);
    setLoading(false);
  }, [selectedLocationId, weekStart]);

  useEffect(() => {
    if (selectedLocationId) fetchData();
  }, [selectedLocationId, fetchData]);

  async function fetchLocations() {
    const res = await fetch("/api/locations");
    if (res.ok) {
      const data: Location[] = await res.json();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocationId(data[0].id);
        setRoles(data[0].roles ?? ["Pharmacist", "Technician", "Filling"]);
      }
    }
    setLoading(false);
  }

  function handleLocationChange(id: string) {
    setSelectedLocationId(id);
    const loc = locations.find((l) => l.id === id);
    setRoles(loc?.roles ?? ["Pharmacist", "Technician", "Filling"]);
  }

  async function handleSaveEmployee(
    name: string,
    targetHours: number,
    availability: EmployeeWithAvailability["availability"]
  ) {
    if (!editEmployee) return;
    const res = await fetch("/api/employees", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: editEmployee.id,
        targetHoursPerWeek: targetHours,
        availability,
      }),
    });
    if (res.ok) {
      toast.success("Availability saved");
      setEditEmployee(null);
      fetchData();
    } else {
      toast.error("Failed to save availability");
    }
  }

  // Determine schedule status
  const currentSchedule = schedules[0];
  const scheduleStatus = currentSchedule?.status || "No schedule";

  const statusColors: Record<string, string> = {
    "Finalized": "bg-[#22C55E]/10 text-[#22C55E]",
    "In Progress": "bg-[#F59E0B]/10 text-[#F59E0B]",
    "Not Started": "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.48)]",
    "No schedule": "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.48)]",
  };

  if (loading && locations.length === 0) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Time Tracking", href: "/app/time-tracking" },
            { label: "Schedule" },
          ]}
        />
        <div className="h-8 w-48 bg-[rgba(0,0,0,0.06)] rounded-lg animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Time Tracking", href: "/app/time-tracking" },
          { label: "Schedule" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
              Schedule
            </h1>
            <Badge className={`text-[11px] ${statusColors[scheduleStatus] || statusColors["No schedule"]}`}>
              {scheduleStatus}
            </Badge>
          </div>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            {employees.length > 0
              ? `${employees.length} staff member${employees.length !== 1 ? "s" : ""} scheduled`
              : "Daily timeline view of staff coverage"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {locations.length > 1 && (
            <select
              value={selectedLocationId}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="h-9 px-3 rounded-lg border border-[rgba(0,0,0,0.08)] text-[14px] bg-white"
              aria-label="Select location"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-white rounded-lg border border-[rgba(0,0,0,0.08)] px-1">
            <button
              onClick={() => setViewWeek((w) => subWeeks(w, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-md text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-medium text-[#1d1d1f] px-2 min-w-[160px] text-center">
              {weekLabel}
            </span>
            <button
              onClick={() => setViewWeek((w) => addWeeks(w, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-md text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 bg-white rounded-xl animate-pulse" />
          <div className="h-60 bg-white rounded-xl animate-pulse" />
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
          <h2 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">No schedule for this week</h2>
          <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)] max-w-md mx-auto">
            Create a schedule in the Planner, or navigate to a week that has one.
          </p>
          <Link
            href="/app/time-tracking/planner"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED]"
          >
            Open Planner
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <WeeklyOverview
            employees={employees}
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
            weekLabel={weekLabel}
          />

          <DailyTimeline
            employees={employees}
            day={selectedDay}
            onEmployeeClick={setEditEmployee}
          />
        </div>
      )}

      {editEmployee && (
        <EmployeeForm
          open
          onClose={() => setEditEmployee(null)}
          onSave={handleSaveEmployee}
          employee={editEmployee}
          roles={roles}
          title={`Edit ${editEmployee.name}`}
        />
      )}
    </div>
  );
}

/**
 * Merge schedule entries into employee data.
 * If a schedule exists for the week, schedule entries override default availability.
 * Employees not in the schedule but in the location are still shown with defaults.
 */
function mergeScheduleIntoEmployees(
  baseEmployees: EmployeeWithAvailability[],
  schedules: WeeklyScheduleData[]
): EmployeeWithAvailability[] {
  if (schedules.length === 0) return baseEmployees;

  const allEntries = schedules.flatMap((s) => s.entries);
  if (allEntries.length === 0) return baseEmployees;

  // Build a map of schedule entries by employee
  const entryMap = new Map<string, Map<string, ScheduleEntryData>>();
  const scheduleEmployeeNames = new Map<string, string>();

  for (const entry of allEntries) {
    if (!entryMap.has(entry.employeeId)) {
      entryMap.set(entry.employeeId, new Map());
      scheduleEmployeeNames.set(entry.employeeId, entry.employeeName);
    }
    entryMap.get(entry.employeeId)!.set(entry.day, entry);
  }

  // Start with base employees, overlay schedule data
  const merged = new Map<string, EmployeeWithAvailability>();

  for (const emp of baseEmployees) {
    const schedEntries = entryMap.get(emp.id);
    if (schedEntries) {
      // Override availability with schedule entries
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

  // Add employees from schedule that aren't in the base list (e.g., from other locations helping out)
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

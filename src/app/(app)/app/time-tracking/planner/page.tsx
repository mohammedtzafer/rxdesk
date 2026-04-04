"use client";

import { useState, useEffect } from "react";
import { EmployeeWithAvailability, WeeklyScheduleData } from "@/lib/schedule-types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ScheduleEditor } from "@/components/schedule/schedule-editor";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  roles?: string[];
}

interface PtoRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  status: string;
}

export default function PlannerPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [employees, setEmployees] = useState<EmployeeWithAvailability[]>([]);
  const [schedules, setSchedules] = useState<WeeklyScheduleData[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<
    { employeeId: string; date: string; status: string; allDay: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
    fetchPto();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchEmployees();
      fetchSchedules();
    }
  }, [selectedLocationId]);

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

  async function fetchEmployees() {
    if (!selectedLocationId) return;
    const res = await fetch(`/api/employees?locationId=${selectedLocationId}`);
    if (res.ok) setEmployees(await res.json());
  }

  async function fetchSchedules() {
    if (!selectedLocationId) return;
    const res = await fetch(`/api/schedules?locationId=${selectedLocationId}`);
    if (res.ok) setSchedules(await res.json());
  }

  async function fetchPto() {
    const res = await fetch("/api/pto?status=APPROVED");
    if (res.ok) {
      const data: PtoRequest[] = await res.json();
      // Expand date ranges into individual day entries
      const expanded: { employeeId: string; date: string; status: string; allDay: boolean }[] = [];
      for (const req of data) {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        const current = new Date(start);
        while (current <= end) {
          expanded.push({
            employeeId: req.employeeId,
            date: current.toISOString().split("T")[0],
            status: req.status,
            allDay: true,
          });
          current.setDate(current.getDate() + 1);
        }
      }
      setTimeOffRequests(expanded);
    }
  }

  function handleLocationChange(id: string) {
    setSelectedLocationId(id);
    const loc = locations.find((l) => l.id === id);
    setRoles(loc?.roles ?? ["Pharmacist", "Technician", "Filling"]);
  }

  async function handleSaveSchedule(schedule: WeeklyScheduleData) {
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locationId: schedule.locationId,
        weekStart: schedule.weekStart,
        status: schedule.status,
        entries: schedule.entries,
      }),
    });

    if (res.ok) {
      const saved: WeeklyScheduleData = await res.json();
      setSchedules((prev) => {
        const without = prev.filter(
          (s) => !(s.locationId === saved.locationId && s.weekStart === saved.weekStart)
        );
        return [...without, saved];
      });
      toast.success("Schedule saved");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save schedule");
      throw new Error(data.error);
    }
  }

  if (loading) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Time tracking", href: "/app/time-tracking" },
            { label: "Planner" },
          ]}
        />
        <div className="h-8 w-48 bg-[rgba(0,0,0,0.06)] rounded-lg animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Time tracking", href: "/app/time-tracking" },
          { label: "Planner" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Planner
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            Build and finalize weekly schedules
          </p>
        </div>

        {locations.length > 1 && (
          <select
            value={selectedLocationId}
            onChange={(e) => handleLocationChange(e.target.value)}
            className="h-9 px-3 rounded-lg border border-[rgba(0,0,0,0.08)] text-[14px] bg-white text-[#1d1d1f] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            aria-label="Select location"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {employees.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <p className="text-[17px] text-[rgba(0,0,0,0.48)]">
            No employees found for{" "}
            {selectedLocation?.name ?? "this location"}. Add team members first.
          </p>
        </div>
      ) : (
        <ScheduleEditor
          schedules={schedules}
          employees={employees}
          roles={roles}
          locationId={selectedLocationId}
          locationName={selectedLocation?.name ?? ""}
          timeOffRequests={timeOffRequests}
          onSaveSchedule={handleSaveSchedule}
        />
      )}
    </div>
  );
}

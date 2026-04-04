"use client";

import { useState, useEffect } from "react";
import { DayOfWeek, DAYS_OF_WEEK, EmployeeWithAvailability } from "@/lib/schedule-types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DailyTimeline } from "@/components/schedule/daily-timeline";
import { WeeklyOverview } from "@/components/schedule/weekly-overview";
import { EmployeeForm } from "@/components/schedule/employee-form";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfWeek, addWeeks, subWeeks, addDays } from "date-fns";
import { toast } from "sonner";

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
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEmployee, setEditEmployee] = useState<EmployeeWithAvailability | null>(null);

  const weekLabel = `${format(viewWeek, "MMM d")} – ${format(addDays(viewWeek, 5), "MMM d, yyyy")}`;

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchEmployees();
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
    if (res.ok) {
      const data = await res.json();
      setEmployees(data);
    }
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
      fetchEmployees();
    } else {
      toast.error("Failed to save availability");
    }
  }

  if (loading) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Time tracking", href: "/app/time-tracking" },
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
          { label: "Time tracking", href: "/app/time-tracking" },
          { label: "Schedule" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Schedule
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            Daily timeline view of staff coverage
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Location selector */}
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

          {/* Week navigation */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-[rgba(0,0,0,0.08)] px-1">
            <button
              type="button"
              onClick={() => setViewWeek((w) => subWeeks(w, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-md text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-medium text-[#1d1d1f] px-2 min-w-[160px] text-center">
              {weekLabel}
            </span>
            <button
              type="button"
              onClick={() => setViewWeek((w) => addWeeks(w, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-md text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

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

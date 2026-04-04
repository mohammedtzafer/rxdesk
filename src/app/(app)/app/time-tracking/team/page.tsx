"use client";

import { useState, useEffect } from "react";
import { DayOfWeek, DayAvailabilityData, EmployeeWithAvailability } from "@/lib/schedule-types";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EmployeeList } from "@/components/schedule/employee-list";
import { EmployeeForm } from "@/components/schedule/employee-form";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  roles?: string[];
}

export default function TeamPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [employees, setEmployees] = useState<EmployeeWithAvailability[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editEmployee, setEditEmployee] = useState<EmployeeWithAvailability | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

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
    if (res.ok) setEmployees(await res.json());
  }

  function handleLocationChange(id: string) {
    setSelectedLocationId(id);
    const loc = locations.find((l) => l.id === id);
    setRoles(loc?.roles ?? ["Pharmacist", "Technician", "Filling"]);
  }

  async function handleSaveEmployee(
    name: string,
    targetHours: number,
    availability: Record<DayOfWeek, DayAvailabilityData>
  ) {
    if (!editEmployee && !showAddForm) return;
    const userId = editEmployee?.id;
    if (!userId) {
      // New employee — not supported via /api/employees PUT (that's for availability only).
      // Direct them to Team settings for user creation.
      toast.info("To add a new team member, use the Team settings page.");
      setShowAddForm(false);
      return;
    }

    const res = await fetch("/api/employees", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, targetHoursPerWeek: targetHours, availability }),
    });

    if (res.ok) {
      toast.success("Availability updated");
      setEditEmployee(null);
      fetchEmployees();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update availability");
    }
  }

  async function handleReorder(fromIndex: number, toIndex: number) {
    const reordered = [...employees];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setEmployees(reordered);

    // Persist reorder
    const res = await fetch("/api/employees/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userIds: reordered.map((e) => e.id),
      }),
    });
    if (!res.ok) {
      toast.error("Failed to save order");
      fetchEmployees(); // revert
    }
  }

  if (loading) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Time tracking", href: "/app/time-tracking" },
            { label: "Team" },
          ]}
        />
        <div className="h-8 w-48 bg-[rgba(0,0,0,0.06)] rounded-lg animate-pulse mb-6" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Time tracking", href: "/app/time-tracking" },
          { label: "Team" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Team
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            Manage employee availability and schedule preferences
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

      <EmployeeList
        employees={employees}
        onEdit={setEditEmployee}
        onAdd={() => setShowAddForm(true)}
        onReorder={handleReorder}
      />

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

      {showAddForm && (
        <EmployeeForm
          open
          onClose={() => setShowAddForm(false)}
          onSave={handleSaveEmployee}
          roles={roles}
          title="Add employee"
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { RoleManager } from "@/components/schedule/role-manager";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  roles?: string[];
}

export default function RolesPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    const res = await fetch("/api/locations");
    if (res.ok) {
      const data: Location[] = await res.json();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocationId(data[0].id);
        setRoles(data[0].roles ?? []);
      }
    }
    setLoading(false);
  }

  function handleLocationChange(id: string) {
    setSelectedLocationId(id);
    const loc = locations.find((l) => l.id === id);
    setRoles(loc?.roles ?? []);
  }

  async function handleRolesChange(newRoles: string[]) {
    if (!selectedLocationId) return;
    const res = await fetch(`/api/locations/${selectedLocationId}/roles`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roles: newRoles }),
    });
    if (res.ok) {
      setRoles(newRoles);
      // Update local location cache
      setLocations((prev) =>
        prev.map((l) =>
          l.id === selectedLocationId ? { ...l, roles: newRoles } : l
        )
      );
      toast.success("Roles updated");
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update roles");
      throw new Error(data.error);
    }
  }

  if (loading) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: "Time tracking", href: "/app/time-tracking" },
            { label: "Roles" },
          ]}
        />
        <div className="h-8 w-48 bg-[rgba(0,0,0,0.06)] rounded-lg animate-pulse mb-6" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Time tracking", href: "/app/time-tracking" },
          { label: "Roles" },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Roles
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            Define the shift roles used in scheduling
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

      <div className="max-w-lg">
        <RoleManager roles={roles} onRolesChange={handleRolesChange} />
        <p className="mt-3 text-[13px] text-[rgba(0,0,0,0.48)]">
          Roles are per-location. Each location can have its own set of shift
          roles. Changes apply immediately to the schedule planner.
        </p>
      </div>
    </div>
  );
}

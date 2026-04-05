"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, startOfWeek, subWeeks, addDays } from "date-fns";
import { timeToDecimal } from "@/lib/schedule-time-utils";

interface ComparisonEntry {
  employeeId: string;
  employeeName: string;
  plannedHours: number;
  actualHours: number;
  variance: number; // actual - planned
}

export default function ComparisonPage() {
  const [viewWeek, setViewWeek] = useState(() =>
    subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1)
  );
  const [entries, setEntries] = useState<ComparisonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const weekStart = format(viewWeek, "yyyy-MM-dd");
  const weekEnd = format(addDays(viewWeek, 6), "yyyy-MM-dd");
  const weekLabel = `${format(viewWeek, "MMM d")} – ${format(addDays(viewWeek, 5), "MMM d, yyyy")}`;

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? (data as Array<{ id: string; name: string }>) : [];
        setLocations(arr);
        if (arr.length > 0) setSelectedLocationId(arr[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedLocationId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/schedules?locationId=${selectedLocationId}&weekStart=${weekStart}`).then((r) =>
        r.ok ? r.json() : []
      ),
      fetch(`/api/time-entries?startDate=${weekStart}&endDate=${weekEnd}`).then((r) =>
        r.ok ? r.json() : []
      ),
    ])
      .then(([schedules, timeEntries]) => {
        const scheduleArr = Array.isArray(schedules) ? (schedules as Array<{
          entries?: Array<{
            employeeId: string;
            employeeName: string;
            available: boolean;
            startTime: string;
            endTime: string;
          }>;
        }>) : [];
        const entriesArr = Array.isArray(timeEntries) ? (timeEntries as Array<{
          userId?: string;
          employeeId?: string;
          regularHours?: number;
          overtimeHours?: number;
        }>) : [];

        // Build planned hours per employee from schedule entries
        const planned = new Map<string, { name: string; hours: number }>();
        for (const sched of scheduleArr) {
          for (const entry of sched.entries || []) {
            if (!entry.available) continue;
            const existing = planned.get(entry.employeeId) ?? { name: entry.employeeName, hours: 0 };
            const start = timeToDecimal(entry.startTime);
            const end = timeToDecimal(entry.endTime);
            if (end > start) existing.hours += end - start;
            planned.set(entry.employeeId, existing);
          }
        }

        // Build actual hours per employee from time entries
        const actual = new Map<string, number>();
        for (const te of entriesArr) {
          const id = te.userId ?? te.employeeId ?? "";
          if (!id) continue;
          const hours = (te.regularHours ?? 0) + (te.overtimeHours ?? 0);
          actual.set(id, (actual.get(id) ?? 0) + hours);
        }

        // Merge
        const allEmployeeIds = new Set([...planned.keys(), ...actual.keys()]);
        const comparison: ComparisonEntry[] = [];
        for (const empId of allEmployeeIds) {
          const p = planned.get(empId);
          const a = actual.get(empId) ?? 0;
          comparison.push({
            employeeId: empId,
            employeeName: p?.name ?? empId,
            plannedHours: Math.round((p?.hours ?? 0) * 100) / 100,
            actualHours: Math.round(a * 100) / 100,
            variance: Math.round((a - (p?.hours ?? 0)) * 100) / 100,
          });
        }

        comparison.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
        setEntries(comparison);
        setLoading(false);
      })
      .catch(() => {
        setEntries([]);
        setLoading(false);
      });
  }, [selectedLocationId, weekStart, weekEnd]);

  const totalPlanned = entries.reduce((s, e) => s + e.plannedHours, 0);
  const totalActual = entries.reduce((s, e) => s + e.actualHours, 0);
  const totalVariance = Math.round((totalActual - totalPlanned) * 100) / 100;

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-4">
        <Link href="/app/time-tracking" className="hover:text-foreground transition-colors">
          Time tracking
        </Link>
        <span>/</span>
        <span className="text-foreground">Planned vs actual</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">
            Planned vs actual
          </h1>
          <p className="mt-1 text-[17px] text-muted-foreground">
            Compare scheduled hours against logged hours
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {locations.length > 1 && (
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="h-9 px-3 rounded-lg border border-border text-[14px] bg-card focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
            >
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 bg-card rounded-lg border border-border px-1">
            <button
              onClick={() => setViewWeek((w) => subWeeks(w, 1))}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-medium text-foreground px-2 min-w-[160px] text-center select-none">
              {weekLabel}
            </span>
            <button
              onClick={() => setViewWeek((w) => addDays(w, 7))}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl p-5">
          <p className="text-[13px] text-muted-foreground font-medium">Planned hours</p>
          <p className="text-[28px] font-normal text-foreground mt-1">{totalPlanned.toFixed(1)}h</p>
        </div>
        <div className="bg-card rounded-xl p-5">
          <p className="text-[13px] text-muted-foreground font-medium">Actual hours</p>
          <p className="text-[28px] font-normal text-foreground mt-1">{totalActual.toFixed(1)}h</p>
        </div>
        <div className="bg-card rounded-xl p-5">
          <p className="text-[13px] text-muted-foreground font-medium">Variance</p>
          <div className="flex items-center gap-2 mt-1">
            <p
              className={`text-[28px] font-normal ${
                totalVariance > 0
                  ? "text-[#EF4444]"
                  : totalVariance < 0
                    ? "text-[#22C55E]"
                    : "text-foreground"
              }`}
            >
              {totalVariance > 0 ? "+" : ""}
              {totalVariance.toFixed(1)}h
            </p>
            {totalVariance > 1 && <TrendingUp className="w-5 h-5 text-[#EF4444]" />}
            {totalVariance < -1 && <TrendingDown className="w-5 h-5 text-[#22C55E]" />}
            {Math.abs(totalVariance) <= 1 && <Minus className="w-5 h-5 text-[#9CA3AF]" />}
          </div>
          <p className="text-[12px] text-muted-foreground mt-1">
            {totalVariance > 0
              ? "Over scheduled"
              : totalVariance < 0
                ? "Under scheduled"
                : "On target"}
          </p>
        </div>
      </div>

      {/* Employee comparison table */}
      <div className="bg-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[17px] font-semibold text-foreground">No data for this week</p>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Navigate to a week with schedule and time entry data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Employee
                  </th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Planned
                  </th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Actual
                  </th>
                  <th className="text-right px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide w-40">
                    Comparison
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const maxHours = Math.max(entry.plannedHours, entry.actualHours, 1);
                  return (
                    <tr key={entry.employeeId} className="border-b border-border/50">
                      <td className="px-4 py-3 text-[14px] font-medium text-foreground">
                        {entry.employeeName}
                      </td>
                      <td className="px-4 py-3 text-[14px] text-right text-muted-foreground">
                        {entry.plannedHours.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3 text-[14px] text-right text-foreground font-medium">
                        {entry.actualHours.toFixed(1)}h
                      </td>
                      <td
                        className={`px-4 py-3 text-[14px] text-right font-medium ${
                          entry.variance > 0.5
                            ? "text-[#EF4444]"
                            : entry.variance < -0.5
                              ? "text-[#22C55E]"
                              : "text-muted-foreground"
                        }`}
                      >
                        {entry.variance > 0 ? "+" : ""}
                        {entry.variance.toFixed(1)}h
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-0.5 items-stretch h-5">
                          <div className="w-1/2 flex justify-end items-end">
                            <div
                              className="bg-[#0071e3]/30 rounded-sm"
                              style={{
                                width: `${(entry.plannedHours / maxHours) * 100}%`,
                                height: "100%",
                              }}
                            />
                          </div>
                          <div className="w-1/2 flex items-end">
                            <div
                              className="bg-[#0071e3] rounded-sm"
                              style={{
                                width: `${(entry.actualHours / maxHours) * 100}%`,
                                height: "100%",
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-0.5">
                          <span>Plan</span>
                          <span>Actual</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border">
                  <td className="px-4 py-3 text-[14px] font-semibold text-foreground">Total</td>
                  <td className="px-4 py-3 text-[14px] text-right text-muted-foreground">
                    {totalPlanned.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 text-[14px] text-right font-semibold text-foreground">
                    {totalActual.toFixed(1)}h
                  </td>
                  <td
                    className={`px-4 py-3 text-[14px] text-right font-semibold ${
                      totalVariance > 0
                        ? "text-[#EF4444]"
                        : totalVariance < 0
                          ? "text-[#22C55E]"
                          : "text-muted-foreground"
                    }`}
                  >
                    {totalVariance > 0 ? "+" : ""}
                    {totalVariance.toFixed(1)}h
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

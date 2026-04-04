"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Pill,
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  UserPlus,
  UserX,
  Bell,
  MapPin,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/error-state";
import { WeeklyOverview } from "@/components/schedule/weekly-overview";
import { DailyTimeline } from "@/components/schedule/daily-timeline";
import {
  DayOfWeek,
  DAYS_OF_WEEK,
  EmployeeWithAvailability,
  WeeklyScheduleData,
  makeDefaultAvailability,
} from "@/lib/schedule-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardData {
  totalRx: number;
  trend: { direction: string; percentChange: number };
  topPrescribers: Array<{ npi: string; name: string; count: number }>;
  concentrationRisk: { topN: number; percentOfTotal: number };
  activeProviders: number;
}

interface AlertData {
  newPrescribers: Array<{ npi: string; name: string; specialty: string | null }>;
  dormantPrescribers: Array<{ npi: string; name: string; specialty: string | null }>;
}

interface NotificationData {
  unreadCount: number;
}

interface LocationItem {
  id: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "UP") return <TrendingUp className="w-4 h-4 text-[#22C55E]" />;
  if (direction === "DOWN") return <TrendingDown className="w-4 h-4 text-[#EF4444]" />;
  return <Minus className="w-4 h-4 text-[#9CA3AF]" />;
};

const trendColor = (d: string) =>
  d === "UP" ? "text-[#22C55E]" : d === "DOWN" ? "text-[#EF4444]" : "text-[#9CA3AF]";

/** Get the Monday of the current week as YYYY-MM-DD */
function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

/** Advance a YYYY-MM-DD date by N days */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Format a week start date as a display label, e.g. "Apr 7 – Apr 12" */
function weekRangeLabel(weekStart: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 5); // Monday–Saturday
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Convert flat WeeklyScheduleData entries into EmployeeWithAvailability[]
 * so WeeklyOverview and DailyTimeline can consume them.
 */
function buildEmployees(schedules: WeeklyScheduleData[]): EmployeeWithAvailability[] {
  const allEntries = schedules.flatMap((s) => s.entries);
  const byEmployee = new Map<string, EmployeeWithAvailability>();

  for (const entry of allEntries) {
    if (!byEmployee.has(entry.employeeId)) {
      byEmployee.set(entry.employeeId, {
        id: entry.employeeId,
        name: entry.employeeName,
        targetHoursPerWeek: 40,
        sortOrder: byEmployee.size,
        locationId: "",
        availability: makeDefaultAvailability(),
      });
    }
    const emp = byEmployee.get(entry.employeeId)!;
    const day = entry.day as DayOfWeek;
    if (DAYS_OF_WEEK.includes(day)) {
      emp.availability[day] = {
        available: entry.available,
        startTime: entry.startTime,
        endTime: entry.endTime,
        role: entry.role,
      };
    }
  }

  return Array.from(byEmployee.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Today's day of week as DayOfWeek, defaulting to Monday for Sunday */
function todayAsDayOfWeek(): DayOfWeek {
  const map: Record<number, DayOfWeek> = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
  };
  return map[new Date().getDay()] ?? "Monday";
}

/** Build the location query param fragment from an array of IDs */
function locationQs(ids: string[]): string {
  if (ids.length === 0) return "";
  return ids.map((id) => `locationId=${id}`).join("&");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  // --- Prescription / alert / notification state ---
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // --- Location filter state ---
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const locationFilterRef = useRef<HTMLDivElement>(null);

  // --- Schedule state ---
  const [weekStart, setWeekStart] = useState<string>(getCurrentWeekMonday);
  const [schedules, setSchedules] = useState<WeeklyScheduleData[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayAsDayOfWeek);

  // ---------------------------------------------------------------------------
  // Fetch locations once on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown) => setLocations(Array.isArray(d) ? (d as LocationItem[]) : []));
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch prescription dashboard + alerts
  // ---------------------------------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const qs = locationQs(selectedLocationIds);
      const baseQs = qs ? `&${qs}` : "";
      const alertsQs = qs ? `?${qs}` : "";
      const [d, a, n] = await Promise.all([
        fetch(`/api/prescriptions/dashboard?days=90${baseQs}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`/api/prescriptions/alerts${alertsQs}`).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch("/api/notifications?unread=true&limit=1").then((r) =>
          r.ok ? r.json() : null
        ),
      ]);
      setData(d);
      setAlerts(a);
      setNotifications(n);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedLocationIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------------------------------------------------------------------------
  // Fetch schedule whenever weekStart or location filter changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setScheduleLoading(true);
    const qs = locationQs(selectedLocationIds);
    const url = `/api/schedules?weekStart=${weekStart}${qs ? `&${qs}` : ""}`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then((d: unknown) => {
        setSchedules(Array.isArray(d) ? (d as WeeklyScheduleData[]) : []);
        setScheduleLoading(false);
      })
      .catch(() => {
        setSchedules([]);
        setScheduleLoading(false);
      });
  }, [weekStart, selectedLocationIds]);

  // ---------------------------------------------------------------------------
  // Close location filter when clicking outside
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        locationFilterRef.current &&
        !locationFilterRef.current.contains(e.target as Node)
      ) {
        setShowLocationFilter(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const hasData = data && data.totalRx > 0;
  const employees = buildEmployees(schedules);
  const hasSchedule = employees.length > 0;

  const locationFilterLabel =
    selectedLocationIds.length === 0
      ? "All locations"
      : selectedLocationIds.length === 1
        ? (locations.find((l) => l.id === selectedLocationIds[0])?.name ?? "1 location")
        : `${selectedLocationIds.length} locations`;

  // ---------------------------------------------------------------------------
  // Location filter toggle helpers
  // ---------------------------------------------------------------------------
  function toggleLocation(id: string) {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAllLocations() {
    setSelectedLocationIds([]);
  }

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div>
        <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
          Dashboard
        </h1>
        <div className="mt-8">
          <ErrorState onRetry={fetchData} />
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
              Dashboard
            </h1>
            <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">Your pharmacy at a glance</p>
          </div>

          {/* Location filter */}
          <div className="relative mb-0.5" ref={locationFilterRef}>
            <button
              type="button"
              onClick={() => setShowLocationFilter((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[rgba(0,0,0,0.1)] rounded-lg text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-1"
              aria-haspopup="listbox"
              aria-expanded={showLocationFilter}
            >
              <MapPin className="w-3.5 h-3.5 text-[rgba(0,0,0,0.48)]" />
              <span>{locationFilterLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[rgba(0,0,0,0.48)] transition-transform ${showLocationFilter ? "rotate-180" : ""}`}
              />
            </button>

            {showLocationFilter && (
              <div
                className="absolute top-full mt-1.5 left-0 z-50 w-56 bg-white rounded-xl shadow-lg border border-[rgba(0,0,0,0.08)] py-1.5 overflow-hidden"
                role="listbox"
                aria-label="Filter by location"
              >
                {/* All locations option */}
                <button
                  type="button"
                  role="option"
                  aria-selected={selectedLocationIds.length === 0}
                  onClick={selectAllLocations}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors text-left"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      selectedLocationIds.length === 0
                        ? "bg-[#0071e3] border-[#0071e3]"
                        : "border-[rgba(0,0,0,0.2)]"
                    }`}
                  >
                    {selectedLocationIds.length === 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  All locations
                </button>

                {locations.length > 0 && (
                  <div className="border-t border-[rgba(0,0,0,0.06)] mt-1 pt-1">
                    {locations.map((loc) => {
                      const checked = selectedLocationIds.includes(loc.id);
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          role="option"
                          aria-selected={checked}
                          onClick={() => toggleLocation(loc.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors text-left"
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked
                                ? "bg-[#0071e3] border-[#0071e3]"
                                : "border-[rgba(0,0,0,0.2)]"
                            }`}
                          >
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="truncate">{loc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {locations.length === 0 && (
                  <p className="px-3 py-2 text-[13px] text-[rgba(0,0,0,0.48)]">
                    No locations found
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notification badge */}
        {notifications && notifications.unreadCount > 0 && (
          <Link
            href="/app/profile"
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7]"
          >
            <Bell className="w-4 h-4" />
            <Badge className="bg-[#0071e3] text-white text-[10px]">
              {notifications.unreadCount}
            </Badge>
          </Link>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stat cards                                                          */}
      {/* ------------------------------------------------------------------ */}
      {loading ? (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : !hasData ? (
        <>
          {/* Empty state stat cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Rx", value: "—", sub: "Upload prescriptions to begin" },
              {
                label: "Active providers",
                value: String(data?.activeProviders || 0),
                sub: "In your directory",
              },
              { label: "Drug rep visits", value: "0", sub: "This month" },
              {
                label: "Notifications",
                value: String(notifications?.unreadCount || 0),
                sub: "Unread",
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg p-5">
                <p className="text-[12px] text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                  {stat.label}
                </p>
                <p className="text-[28px] font-normal leading-[1.14] text-[#1d1d1f] mt-1">
                  {stat.value}
                </p>
                <p className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Onboarding CTA */}
          <div className="mt-8 bg-white rounded-xl p-8 text-center">
            <Pill className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
            <h2 className="mt-4 text-[21px] font-bold leading-[1.19] text-[#1d1d1f]">
              Get started with RxDesk
            </h2>
            <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)] max-w-md mx-auto">
              Upload your prescription data to see analytics, or add providers to start tracking
              prescriber relationships.
            </p>
            <div className="mt-6 flex gap-3 justify-center">
              <Link
                href="/app/prescriptions/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED]"
              >
                <Upload className="w-4 h-4" /> Upload prescriptions
              </Link>
              <Link
                href="/app/providers/search"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[17px] hover:bg-[#f5f5f7]"
              >
                <Users className="w-4 h-4" /> Add providers
              </Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Live stat cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-5">
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Total Rx (90d)
              </p>
              <p className="text-[28px] font-normal leading-[1.14] text-[#1d1d1f] mt-1">
                {data!.totalRx.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon direction={data!.trend.direction} />
                <span className={`text-[12px] ${trendColor(data!.trend.direction)}`}>
                  {data!.trend.percentChange > 0 ? "+" : ""}
                  {data!.trend.percentChange}% vs prior
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-5">
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Active providers
              </p>
              <p className="text-[28px] font-normal leading-[1.14] text-[#1d1d1f] mt-1">
                {data!.activeProviders}
              </p>
            </div>
            <div className="bg-white rounded-lg p-5">
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Concentration
              </p>
              <p className="text-[28px] font-normal leading-[1.14] text-[#1d1d1f] mt-1">
                {data!.concentrationRisk.percentOfTotal}%
              </p>
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">
                Top {data!.concentrationRisk.topN} providers
              </p>
            </div>
            <div className="bg-white rounded-lg p-5">
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Notifications
              </p>
              <p className="text-[28px] font-normal leading-[1.14] text-[#1d1d1f] mt-1">
                {notifications?.unreadCount || 0}
              </p>
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">Unread</p>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Weekly Overview                                                   */}
          {/* ---------------------------------------------------------------- */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Weekly schedule</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWeekStart((w) => shiftDate(w, -7))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-[13px] text-[rgba(0,0,0,0.48)] min-w-[140px] text-center select-none">
                  {weekRangeLabel(weekStart)}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekStart((w) => shiftDate(w, 7))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white transition-colors text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {scheduleLoading ? (
              <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] h-48 animate-pulse" />
            ) : !hasSchedule ? (
              <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] p-8 text-center">
                <p className="text-[14px] text-[rgba(0,0,0,0.48)]">No schedule for this week</p>
                <Link
                  href="/app/schedule"
                  className="mt-3 inline-block text-[14px] text-[#0066cc] hover:underline"
                >
                  Create a schedule
                </Link>
              </div>
            ) : (
              <WeeklyOverview
                employees={employees}
                selectedDay={selectedDay}
                onDaySelect={setSelectedDay}
                weekLabel={weekRangeLabel(weekStart)}
              />
            )}
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Daily Timeline                                                    */}
          {/* ---------------------------------------------------------------- */}
          {hasSchedule && !scheduleLoading && (
            <div className="mt-6 overflow-x-auto">
              <DailyTimeline
                employees={employees}
                day={selectedDay}
                onEmployeeClick={(emp) => {
                  window.location.href = `/app/team/${emp.id}`;
                }}
              />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Top prescribers + alerts                                          */}
          {/* ---------------------------------------------------------------- */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top prescribers */}
            <div className="bg-white rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Top prescribers</h2>
                <Link
                  href="/app/prescriptions"
                  className="text-[14px] text-[#0066cc] hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {data!.topPrescribers.slice(0, 5).map((p, i) => {
                  const max = data!.topPrescribers[0]?.count || 1;
                  return (
                    <div key={p.npi} className="flex items-center gap-3">
                      <span className="w-5 text-right text-[12px] text-[rgba(0,0,0,0.3)]">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-[14px] text-[#1d1d1f]">{p.name}</span>
                          <span className="text-[14px] font-medium">{p.count}</span>
                        </div>
                        <div className="h-1 bg-[#f5f5f7] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0071e3] rounded-full"
                            style={{ width: `${(p.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alerts + quick actions */}
            <div className="space-y-4">
              {alerts && alerts.newPrescribers.length > 0 && (
                <div className="bg-white rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="w-4 h-4 text-[#22C55E]" />
                    <h2 className="text-[17px] font-semibold text-[#1d1d1f]">New prescribers</h2>
                  </div>
                  {alerts.newPrescribers.slice(0, 3).map((p) => (
                    <div key={p.npi} className="text-[14px] py-1">
                      <span className="text-[#1d1d1f]">{p.name}</span>
                      {p.specialty && (
                        <span className="text-[rgba(0,0,0,0.48)]"> &middot; {p.specialty}</span>
                      )}
                    </div>
                  ))}
                  {alerts.newPrescribers.length > 3 && (
                    <Link
                      href="/app/prescriptions"
                      className="text-[14px] text-[#0066cc] hover:underline mt-2 inline-block"
                    >
                      +{alerts.newPrescribers.length - 3} more
                    </Link>
                  )}
                </div>
              )}

              {alerts && alerts.dormantPrescribers.length > 0 && (
                <div className="bg-white rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <UserX className="w-4 h-4 text-[#EF4444]" />
                    <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                      Dormant prescribers
                    </h2>
                  </div>
                  {alerts.dormantPrescribers.slice(0, 3).map((p) => (
                    <div key={p.npi} className="text-[14px] py-1">
                      <span className="text-[#1d1d1f]">{p.name}</span>
                      {p.specialty && (
                        <span className="text-[rgba(0,0,0,0.48)]"> &middot; {p.specialty}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick actions */}
              <div className="bg-white rounded-xl p-5">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-3">Quick actions</h2>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/app/prescriptions/upload"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#f5f5f7] hover:bg-[rgba(0,0,0,0.06)] text-[14px] text-[#1d1d1f] transition-colors"
                  >
                    <Upload className="w-4 h-4 text-[rgba(0,0,0,0.48)]" /> Upload Rx
                  </Link>
                  <Link
                    href="/app/providers/search"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#f5f5f7] hover:bg-[rgba(0,0,0,0.06)] text-[14px] text-[#1d1d1f] transition-colors"
                  >
                    <Users className="w-4 h-4 text-[rgba(0,0,0,0.48)]" /> Search NPI
                  </Link>
                  <Link
                    href="/app/drug-reps"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#f5f5f7] hover:bg-[rgba(0,0,0,0.06)] text-[14px] text-[#1d1d1f] transition-colors"
                  >
                    <Briefcase className="w-4 h-4 text-[rgba(0,0,0,0.48)]" /> Log visit
                  </Link>
                  <Link
                    href="/app/time-tracking"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#f5f5f7] hover:bg-[rgba(0,0,0,0.06)] text-[14px] text-[#1d1d1f] transition-colors"
                  >
                    <Clock className="w-4 h-4 text-[rgba(0,0,0,0.48)]" /> Clock in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

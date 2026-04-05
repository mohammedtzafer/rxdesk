"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Play, Square, Plus, Calendar, CalendarDays, LayoutGrid, Users, Tag, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string | null;
  durationMinutes: number | null;
  regularHours: number;
  overtimeHours: number;
  breakMinutes: number;
  note: string | null;
  isClockIn: boolean;
}

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockLoading, setClockLoading] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);

  const [entryForm, setEntryForm] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    breakMinutes: "30",
    note: "",
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const res = await fetch(
      `/api/time-entries?startDate=${weekAgo.toISOString()}&endDate=${now.toISOString()}`
    );
    if (res.ok) {
      const data = await res.json();
      setEntries(data);
      setClockedIn(data.some((e: TimeEntry) => e.isClockIn && !e.endTime));
    }
    setLoading(false);
  };

  const handleClock = async () => {
    setClockLoading(true);
    const res = await fetch("/api/time-entries/clock", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      toast.success(data.action === "clock_in" ? "Clocked in" : "Clocked out");
      setClockedIn(data.action === "clock_in");
      fetchEntries();
    } else {
      toast.error("Failed to clock in/out");
    }
    setClockLoading(false);
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const date = entryForm.date;
    const startTime = new Date(`${date}T${entryForm.startTime}:00`).toISOString();
    const endTime = new Date(`${date}T${entryForm.endTime}:00`).toISOString();

    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        startTime,
        endTime,
        breakMinutes: parseInt(entryForm.breakMinutes) || 0,
        note: entryForm.note || undefined,
      }),
    });

    if (res.ok) {
      toast.success("Time entry added");
      setShowAddEntry(false);
      setEntryForm({
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "17:00",
        breakMinutes: "30",
        note: "",
      });
      fetchEntries();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add entry");
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatHours = (mins: number | null) => {
    if (!mins) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m > 0 ? `${m}m` : ""}`.trim();
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">
            Time Tracking
          </h1>
          <p className="mt-1 text-[17px] text-muted-foreground">
            Clock in/out and manage your time entries
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/time-tracking/time-off"
            className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-lg text-[14px] hover:bg-card transition-colors"
          >
            <Calendar className="w-4 h-4" /> Time off
          </Link>
          <button
            onClick={() => setShowAddEntry(true)}
            className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground rounded-lg text-[14px] hover:bg-card transition-colors"
          >
            <Plus className="w-4 h-4" /> Add entry
          </button>
        </div>
      </div>

      {/* Clock in/out */}
      <div className="mt-6 bg-card rounded-xl p-6 text-center">
        <button
          onClick={handleClock}
          disabled={clockLoading}
          className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-[21px] font-semibold transition-colors disabled:opacity-50 ${
            clockedIn
              ? "bg-[#EF4444] text-white hover:bg-[#DC2626]"
              : "bg-[#0071e3] text-white hover:bg-[#0077ED]"
          }`}
        >
          {clockedIn ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          {clockLoading ? "..." : clockedIn ? "Clock out" : "Clock in"}
        </button>
        <p className="mt-2 text-[14px] text-muted-foreground">
          {clockedIn ? "You are currently clocked in" : "You are not clocked in"}
        </p>
      </div>

      {/* Recent entries */}
      <div className="mt-6">
        <h2 className="text-[17px] font-semibold text-foreground">Recent entries (last 7 days)</h2>
        <div className="mt-3 bg-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/30" />
              <h3 className="mt-4 text-[21px] font-bold text-foreground">No time entries</h3>
              <p className="mt-2 text-[17px] text-muted-foreground">
                Clock in or add a manual entry to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase">
                    Date
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase">
                    Start
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase">
                    End
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase">
                    Duration
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase hidden md:table-cell">
                    Break
                  </th>
                  <th className="text-left px-4 py-2.5 text-[12px] font-semibold text-muted-foreground uppercase hidden lg:table-cell">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/50">
                    <td className="px-4 py-2.5 text-[14px] text-foreground">
                      {new Date(entry.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-foreground font-mono">
                      {formatTime(entry.startTime)}
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-foreground font-mono">
                      {entry.endTime ? (
                        formatTime(entry.endTime)
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#22C55E]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-foreground">
                      {formatHours(entry.durationMinutes)}
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-muted-foreground hidden md:table-cell">
                      {entry.breakMinutes > 0 ? `${entry.breakMinutes}m` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[14px] text-muted-foreground hidden lg:table-cell truncate max-w-[200px]">
                      {entry.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {/* Schedule management */}
      <div className="mt-8">
        <h2 className="text-[17px] font-semibold text-foreground">Schedule management</h2>
        <p className="mt-0.5 text-[14px] text-muted-foreground">Build schedules, manage your team, and track time off</p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            {
              href: "/app/time-tracking/schedule",
              icon: CalendarDays,
              label: "Schedule",
              desc: "Daily timeline view",
            },
            {
              href: "/app/time-tracking/planner",
              icon: LayoutGrid,
              label: "Planner",
              desc: "Build weekly schedules",
            },
            {
              href: "/app/time-tracking/team",
              icon: Users,
              label: "Team",
              desc: "Availability & preferences",
            },
            {
              href: "/app/time-tracking/time-off",
              icon: Calendar,
              label: "Time off",
              desc: "Requests & approvals",
            },
            {
              href: "/app/time-tracking/roles",
              icon: Tag,
              label: "Roles",
              desc: "Manage shift roles",
            },
            {
              href: "/app/time-tracking/comparison",
              icon: BarChart3,
              label: "Planned vs actual",
              desc: "Scheduled vs logged hours",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-card rounded-xl p-4 border border-border/70 hover:border-[#0071e3] hover:shadow-sm transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#f0f6ff] flex items-center justify-center mb-3 group-hover:bg-[#0071e3] transition-colors">
                <item.icon className="w-4.5 h-4.5 text-[#0071e3] group-hover:text-white transition-colors" aria-hidden="true" />
              </div>
              <p className="text-[14px] font-semibold text-foreground">{item.label}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{item.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Add entry modal */}
      {showAddEntry && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddEntry(false)}
        >
          <div
            className="bg-card rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[21px] font-bold text-foreground mb-4">Add time entry</h2>
            <form onSubmit={handleAddEntry} className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-muted-foreground mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                  required
                  className="w-full h-11 rounded-lg border border-border px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-muted-foreground mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={entryForm.startTime}
                    onChange={(e) => setEntryForm({ ...entryForm, startTime: e.target.value })}
                    required
                    className="w-full h-11 rounded-lg border border-border px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-muted-foreground mb-1">
                    End time
                  </label>
                  <input
                    type="time"
                    value={entryForm.endTime}
                    onChange={(e) => setEntryForm({ ...entryForm, endTime: e.target.value })}
                    required
                    className="w-full h-11 rounded-lg border border-border px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted-foreground mb-1">
                  Break (minutes)
                </label>
                <input
                  type="number"
                  value={entryForm.breakMinutes}
                  onChange={(e) => setEntryForm({ ...entryForm, breakMinutes: e.target.value })}
                  min="0"
                  className="w-full h-11 rounded-lg border border-border px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-muted-foreground mb-1">
                  Note
                </label>
                <textarea
                  value={entryForm.note}
                  onChange={(e) => setEntryForm({ ...entryForm, note: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-[14px] h-16 resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddEntry(false)}
                  className="flex-1 h-10 border border-border text-foreground rounded-lg text-[14px] hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
                >
                  Add entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

// Field Rep Dashboard — single-screen visit log interface
// The drug rep logs in and sees only this page

import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  UtensilsCrossed,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  FileText,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";

interface Provider {
  id: string;
  firstName: string;
  lastName: string;
  practiceName: string | null;
  specialty: string | null;
  npi: string;
}

interface Visit {
  id: string;
  visitDate: string;
  notes: string | null;
  providers: Array<{ provider: { id: string; firstName: string; lastName: string; practiceName: string | null } }>;
  drugRep: { id: string; firstName: string; lastName: string; company: string };
}

const TIME_OPTIONS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM", "9:30 AM",
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM",
];

function parseNotesHeader(notes: string | null): { startTime: string | null; endTime: string | null; lunchProvided: boolean } {
  if (!notes) return { startTime: null, endTime: null, lunchProvided: false };
  const match = notes.match(/^\[(.+?) – (.+?)\] \[Lunch: (Yes|No)\]/);
  if (!match) return { startTime: null, endTime: null, lunchProvided: false };
  return { startTime: match[1], endTime: match[2], lunchProvided: match[3] === "Yes" };
}

function buildNotesWithHeader(startTime: string, endTime: string, lunchProvided: boolean, body: string): string {
  const header = `[${startTime} – ${endTime}] [Lunch: ${lunchProvided ? "Yes" : "No"}]`;
  return body ? `${header}\n${body}` : header;
}

function stripNotesHeader(notes: string | null): string {
  if (!notes) return "";
  return notes.replace(/^\[.+? – .+?\] \[Lunch: (?:Yes|No)\]\n?/, "");
}

export default function DrugRepsPage() {
  const [viewMonth, setViewMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogVisit, setShowLogVisit] = useState(false);

  // Provider search
  const [providerSearch, setProviderSearch] = useState("");
  const [providerResults, setProviderResults] = useState<Provider[]>([]);
  const [searchingProviders, setSearchingProviders] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>([]);
  const [favorites, setFavorites] = useState<Provider[]>([]);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Visit form
  const [visitDate, setVisitDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("10:00 AM");
  const [endTime, setEndTime] = useState("12:00 PM");
  const [lunchProvided, setLunchProvided] = useState(false);
  const [visitNotes, setVisitNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Calendar math
  const monthStart = startOfMonth(viewMonth);
  const monthEnd = endOfMonth(viewMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drug-reps/visits?limit=200");
      if (res.ok) {
        const data = await res.json();
        setVisits(data.visits || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [fetchVisits]);

  // Build favorites from most-visited providers
  useEffect(() => {
    if (visits.length === 0) return;
    const counts = new Map<string, { provider: Provider; count: number }>();
    for (const v of visits) {
      for (const vp of v.providers) {
        const p = vp.provider;
        const existing = counts.get(p.id);
        if (existing) {
          existing.count++;
        } else {
          counts.set(p.id, {
            provider: {
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              practiceName: p.practiceName,
              specialty: null,
              npi: "",
            },
            count: 1,
          });
        }
      }
    }
    const sorted = Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((x) => x.provider);
    setFavorites(sorted);
  }, [visits]);

  // Visits for selected date
  const visitsForDate = visits.filter((v) => isSameDay(new Date(v.visitDate), selectedDate));

  // Days that have visits
  const daysWithVisits = new Set(visits.map((v) => format(new Date(v.visitDate), "yyyy-MM-dd")));

  // Monthly stats
  const thisMonthVisits = visits.filter((v) => isSameMonth(new Date(v.visitDate), new Date()));
  const uniqueProvidersThisMonth = new Set(
    thisMonthVisits.flatMap((v) => v.providers.map((vp) => vp.provider.id))
  ).size;
  const lunchesThisMonth = thisMonthVisits.filter((v) => {
    const { lunchProvided } = parseNotesHeader(v.notes);
    return lunchProvided;
  }).length;

  // Provider typeahead
  useEffect(() => {
    if (!providerSearch.trim()) {
      setProviderResults([]);
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearchingProviders(true);
      try {
        const res = await fetch(`/api/providers/search-for-visit?search=${encodeURIComponent(providerSearch)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setProviderResults(data.providers || []);
        }
      } catch {
        // silent
      } finally {
        setSearchingProviders(false);
      }
    }, 250);
  }, [providerSearch]);

  const toggleProviderSelection = (provider: Provider) => {
    setSelectedProviders((prev) => {
      const exists = prev.find((p) => p.id === provider.id);
      if (exists) return prev.filter((p) => p.id !== provider.id);
      return [...prev, provider];
    });
  };

  const openLogVisit = () => {
    setVisitDate(format(selectedDate, "yyyy-MM-dd"));
    setStartTime("10:00 AM");
    setEndTime("12:00 PM");
    setLunchProvided(false);
    setVisitNotes("");
    setSelectedProviders([]);
    setProviderSearch("");
    setProviderResults([]);
    setShowLogVisit(true);
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProviders.length === 0) {
      toast.error("Select at least one provider");
      return;
    }
    setSubmitting(true);
    try {
      // We need a drugRepId — for now use the first available rep or create one
      // The API requires drugRepId. We'll fetch the first rep for this org.
      const repsRes = await fetch("/api/drug-reps?limit=1");
      let drugRepId = "";
      if (repsRes.ok) {
        const repsData = await repsRes.json();
        drugRepId = repsData[0]?.id || "";
      }

      if (!drugRepId) {
        toast.error("No drug rep profile found. Contact your administrator.");
        setSubmitting(false);
        return;
      }

      const notes = buildNotesWithHeader(startTime, endTime, lunchProvided, visitNotes);

      const res = await fetch("/api/drug-reps/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drugRepId,
          visitDate,
          providerIds: selectedProviders.map((p) => p.id),
          notes,
        }),
      });

      if (res.ok) {
        toast.success("Visit logged");
        setShowLogVisit(false);
        fetchVisits();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to log visit");
      }
    } catch {
      toast.error("Failed to log visit");
    } finally {
      setSubmitting(false);
    }
  };

  const displayResults = providerSearch.trim()
    ? providerResults
    : favorites.length > 0
    ? favorites
    : [];

  const showFavoritesLabel = !providerSearch.trim() && favorites.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">
            Visit log
          </h1>
          <p className="mt-1 text-[17px] text-muted-foreground">
            Log office visits and track provider relationships
          </p>
        </div>
        <button
          onClick={openLogVisit}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Log visit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Left: Calendar + visit list */}
        <div className="space-y-4">
          {/* Calendar */}
          <div className="bg-card rounded-xl p-4 border border-border/70">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4 text-foreground" />
              </button>
              <h2 className="text-[16px] font-semibold text-foreground">
                {format(viewMonth, "MMMM yyyy")}
              </h2>
              <button
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4 text-foreground" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground/80 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-0.5">
              {calDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const hasVisit = daysWithVisits.has(key);
                const isSelected = isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, viewMonth);
                const todayDay = isToday(day);

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className={[
                      "relative flex flex-col items-center justify-start pt-1 pb-2 rounded-lg min-h-[44px] transition-colors",
                      isSelected
                        ? "bg-[#0071e3] text-white"
                        : todayDay
                        ? "bg-[#0071e3]/10 text-[#0071e3]"
                        : inMonth
                        ? "hover:bg-muted text-foreground"
                        : "text-muted-foreground/40",
                    ].join(" ")}
                    aria-label={format(day, "MMMM d, yyyy")}
                    aria-pressed={isSelected}
                  >
                    <span className="text-[13px] font-medium">{format(day, "d")}</span>
                    {hasVisit && (
                      <span
                        className={[
                          "w-1.5 h-1.5 rounded-full mt-0.5",
                          isSelected ? "bg-card" : "bg-[#0071e3]",
                        ].join(" ")}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visits for selected day */}
          <div className="bg-card rounded-xl border border-border/70 overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-foreground">
                {format(selectedDate, "EEEE, MMMM d")}
              </h3>
              <button
                onClick={openLogVisit}
                className="inline-flex items-center gap-1 text-[13px] text-[#0071e3] hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Add visit
              </button>
            </div>

            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : visitsForDate.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-[14px] text-muted-foreground/80">No visits on this day</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {visitsForDate.map((v) => {
                  const { startTime, endTime, lunchProvided } = parseNotesHeader(v.notes);
                  const noteBody = stripNotesHeader(v.notes);
                  return (
                    <div key={v.id} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* Providers */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {v.providers.map((vp) => (
                              <span key={vp.provider.id} className="text-[14px] font-medium text-foreground">
                                {vp.provider.practiceName || `${vp.provider.firstName} ${vp.provider.lastName}`}
                              </span>
                            ))}
                            {v.providers.length === 0 && (
                              <span className="text-[14px] text-muted-foreground/80">No providers</span>
                            )}
                          </div>
                          {/* Doctors list */}
                          {v.providers.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Users className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                              <p className="text-[12px] text-muted-foreground truncate">
                                {v.providers.map((vp) => `${vp.provider.firstName} ${vp.provider.lastName}`).join(", ")}
                              </p>
                            </div>
                          )}
                          {noteBody && (
                            <p className="mt-1 text-[12px] text-muted-foreground line-clamp-1">
                              {noteBody}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {startTime && endTime && (
                            <span className="flex items-center gap-1 text-[12px] text-muted-foreground/80">
                              <Clock className="w-3 h-3" />
                              {startTime} – {endTime}
                            </span>
                          )}
                          {lunchProvided && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-[#F59E0B]/10 text-[#B45309] border-0">
                              <UtensilsCrossed className="w-2.5 h-2.5 mr-1" />
                              Lunch
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats sidebar */}
        <div className="space-y-4">
          <h3 className="text-[13px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
            This month
          </h3>

          <div className="bg-card rounded-xl border border-border/70 overflow-hidden divide-y divide-border/50">
            <div className="px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0071e3]/10 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-[#0071e3]" />
              </div>
              <div>
                <p className="text-[24px] font-bold text-foreground leading-none">
                  {thisMonthVisits.length}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Total visits
                </p>
              </div>
            </div>

            <div className="px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-[#22C55E]" />
              </div>
              <div>
                <p className="text-[24px] font-bold text-foreground leading-none">
                  {uniqueProvidersThisMonth}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Providers visited
                </p>
              </div>
            </div>

            <div className="px-4 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-[24px] font-bold text-foreground leading-none">
                  {lunchesThisMonth}
                </p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  Lunches provided
                </p>
              </div>
            </div>
          </div>

          {/* Recent visits summary */}
          {visits.slice(0, 5).length > 0 && (
            <div className="bg-card rounded-xl border border-border/70 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[13px] font-semibold text-muted-foreground/80 uppercase tracking-wide">
                  Recent visits
                </p>
              </div>
              <div className="divide-y divide-border/50">
                {visits.slice(0, 5).map((v) => (
                  <div key={v.id} className="px-4 py-2.5">
                    <p className="text-[13px] font-medium text-foreground truncate">
                      {v.providers[0]?.provider.practiceName ||
                        v.providers.map((vp) => `${vp.provider.lastName}`).join(", ") ||
                        "No providers"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/80">
                      {format(new Date(v.visitDate), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Log Visit Modal */}
      {showLogVisit && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLogVisit(false)}
        >
          <div
            className="bg-card rounded-xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/70 sticky top-0 bg-card z-10">
              <h2 className="text-[18px] font-semibold text-foreground">Log visit</h2>
              <button
                onClick={() => setShowLogVisit(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogVisit} className="p-5 space-y-5">
              {/* Provider search */}
              <div>
                <Label className="text-[13px] font-medium text-foreground mb-1.5 block">
                  Providers visited
                </Label>

                {/* Selected providers chips */}
                {selectedProviders.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedProviders.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-[#0071e3]/10 text-[#0071e3] rounded-full text-[12px] font-medium"
                      >
                        {p.lastName}, {p.firstName}
                        <button
                          type="button"
                          onClick={() => toggleProviderSelection(p)}
                          aria-label={`Remove ${p.firstName} ${p.lastName}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <Input
                    placeholder="Search provider by name or NPI..."
                    value={providerSearch}
                    onChange={(e) => setProviderSearch(e.target.value)}
                    className="pl-9 h-10 bg-muted dark:bg-[#2c2c2e] border-0 text-[14px]"
                  />
                  {searchingProviders && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground/80">
                      Searching...
                    </span>
                  )}
                </div>

                {/* Results dropdown */}
                {displayResults.length > 0 && (
                  <div className="mt-1.5 border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {showFavoritesLabel && (
                      <div className="px-3 py-1.5 bg-muted dark:bg-[#2c2c2e] border-b border-border dark:border-white/5">
                        <span className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wide flex items-center gap-1">
                          <Star className="w-3 h-3" /> Frequently visited
                        </span>
                      </div>
                    )}
                    {displayResults.map((provider) => {
                      const isSelected = selectedProviders.some((p) => p.id === provider.id);
                      return (
                        <label
                          key={provider.id}
                          className={[
                            "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                            isSelected
                              ? "bg-[#0071e3]/5 dark:bg-[#0071e3]/10"
                              : "hover:bg-muted dark:hover:bg-card/5",
                          ].join(" ")}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleProviderSelection(provider)}
                            className="rounded w-4 h-4 accent-[#0071e3]"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground truncate">
                              {provider.lastName}, {provider.firstName}
                            </p>
                            <p className="text-[11px] text-muted-foreground/80 truncate">
                              {provider.practiceName || provider.specialty || "—"}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="text-[#0071e3] text-[11px] font-medium shrink-0">Selected</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <Label className="text-[13px] font-medium text-foreground mb-1.5 block">
                  Visit date
                </Label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  required
                  className="w-full h-10 rounded-lg border border-border px-3 text-[14px] bg-card dark:bg-[#2c2c2e] text-foreground"
                />
              </div>

              {/* Time range */}
              <div>
                <Label className="text-[13px] font-medium text-foreground mb-1.5 block">
                  Time range
                </Label>
                <div className="flex items-center gap-2">
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 h-10 rounded-lg border border-border px-3 text-[14px] bg-card dark:bg-[#2c2c2e] text-foreground"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground/80 text-[13px]">to</span>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 h-10 rounded-lg border border-border px-3 text-[14px] bg-card dark:bg-[#2c2c2e] text-foreground"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lunch toggle */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-muted-foreground/80" />
                  <Label className="text-[14px] text-foreground cursor-pointer" htmlFor="lunch-toggle">
                    Lunch provided
                  </Label>
                </div>
                <button
                  type="button"
                  id="lunch-toggle"
                  role="switch"
                  aria-checked={lunchProvided}
                  onClick={() => setLunchProvided(!lunchProvided)}
                  className={[
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    lunchProvided ? "bg-[#0071e3]" : "bg-[rgba(0,0,0,0.12)] dark:bg-card/20",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "inline-block h-4 w-4 rounded-full bg-card shadow transition-transform",
                      lunchProvided ? "translate-x-6" : "translate-x-1",
                    ].join(" ")}
                  />
                </button>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-[13px] font-medium text-foreground mb-1.5 block">
                  Notes
                </Label>
                <textarea
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  rows={4}
                  placeholder={
                    selectedProviders.length > 0
                      ? `Visited ${selectedProviders[0].practiceName || selectedProviders[0].lastName + " office"}, spoke with ${selectedProviders.map((p) => `Dr. ${p.lastName}`).join(" and ")}, discussed specific drugs, and additional notes for future reference.`
                      : "Visited [Provider Office], spoke with [Doctor(s)], discussed [specific drugs], and additional notes for future reference."
                  }
                  className="w-full rounded-lg border border-border px-3 py-2.5 text-[14px] resize-none bg-card dark:bg-[#2c2c2e] text-foreground placeholder:text-muted-foreground/60 dark:placeholder:text-white/30"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || selectedProviders.length === 0}
                className="w-full h-11 bg-[#0071e3] text-white rounded-lg text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? "Logging visit..." : "Log visit"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

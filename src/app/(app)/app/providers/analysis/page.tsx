"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Users, ArrowUp, ArrowDown } from "lucide-react";

interface ProviderTrend {
  providerId: string;
  name: string;
  specialty: string | null;
  npi: string;
  currentVolume: number;
  priorVolume: number;
  absoluteChange: number;
  percentChange: number;
  trend: "UP" | "DOWN" | "STABLE";
  location?: string | null;
}

interface AnalysisData {
  providers: ProviderTrend[];
  summary: {
    total: number;
    growing: number;
    declining: number;
    stable: number;
    overallTrend: "UP" | "DOWN" | "STABLE";
  };
}

const SORT_OPTIONS = [
  { value: "change", label: "Biggest changes" },
  { value: "growers", label: "Top growers" },
  { value: "decliners", label: "Top decliners" },
  { value: "volume", label: "By volume" },
] as const;

const DAY_OPTIONS = [7, 14, 30, 60, 90] as const;

type SortBy = (typeof SORT_OPTIONS)[number]["value"];

function TrendIcon({ trend }: { trend: "UP" | "DOWN" | "STABLE" }) {
  if (trend === "UP") return <TrendingUp className="w-4 h-4 text-[#22C55E]" />;
  if (trend === "DOWN") return <TrendingDown className="w-4 h-4 text-[#EF4444]" />;
  return <Minus className="w-4 h-4 text-[#9CA3AF]" />;
}

function TrendBadge({ trend }: { trend: "UP" | "DOWN" | "STABLE" }) {
  const config = {
    UP: { label: "Growing", bg: "bg-[#22C55E]/10", text: "text-[#16A34A]" },
    DOWN: { label: "Declining", bg: "bg-[#EF4444]/10", text: "text-[#DC2626]" },
    STABLE: { label: "Stable", bg: "bg-[#9CA3AF]/10", text: "text-[#6B7280]" },
  }[trend];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bg} ${config.text}`}>
      <TrendIcon trend={trend} />
      {config.label}
    </span>
  );
}

function VolumeBars({ current, prior, max }: { current: number; prior: number; max: number }) {
  if (max === 0) return <div className="w-24 h-5" />;
  const currentPct = Math.round((current / max) * 100);
  const priorPct = Math.round((prior / max) * 100);
  return (
    <div className="w-28 flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div className="h-2 rounded-full bg-[#0071e3]" style={{ width: `${currentPct}%`, minWidth: current > 0 ? "2px" : "0" }} />
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{current}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 rounded-full bg-[rgba(0,113,227,0.2)]" style={{ width: `${priorPct}%`, minWidth: prior > 0 ? "2px" : "0" }} />
        <span className="text-[10px] text-[rgba(0,0,0,0.32)] whitespace-nowrap">{prior}</span>
      </div>
    </div>
  );
}

export default function ProviderAnalysisPage() {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [days, setDays] = useState<number>(90);
  const [sortBy, setSortBy] = useState<SortBy>("change");
  const [locationFilter, setLocationFilter] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [customMode, setCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ days: String(days), sortBy });
      const res = await fetch(`/api/providers/analysis?${params}`);
      if (res.ok) {
        const json: AnalysisData = await res.json();
        setData(json);
        // Extract unique non-null locations
        const locs = Array.from(
          new Set(json.providers.map((p) => p.location).filter(Boolean) as string[])
        ).sort();
        setLocations(locs);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [days, sortBy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const providers = data?.providers ?? [];

  const filtered = locationFilter
    ? providers.filter((p) => p.location === locationFilter)
    : providers;

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "growers":
        return b.absoluteChange - a.absoluteChange;
      case "decliners":
        return a.absoluteChange - b.absoluteChange;
      case "volume":
        return b.currentVolume - a.currentVolume;
      case "change":
      default:
        return Math.abs(b.absoluteChange) - Math.abs(a.absoluteChange);
    }
  });

  const maxVolume = Math.max(...providers.map((p) => Math.max(p.currentVolume, p.priorVolume)), 1);

  const summary = data?.summary;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">
            Provider Trend Analysis
          </h1>
          <p className="mt-1 text-[17px] text-muted-foreground">
            Rx volume changes by provider over time
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total providers",
            value: summary?.total ?? "—",
            icon: Users,
            color: "text-[#0071e3]",
            bg: "bg-[#0071e3]/10",
          },
          {
            label: "Growing",
            value: summary?.growing ?? "—",
            icon: TrendingUp,
            color: "text-[#22C55E]",
            bg: "bg-[#22C55E]/10",
          },
          {
            label: "Declining",
            value: summary?.declining ?? "—",
            icon: TrendingDown,
            color: "text-[#EF4444]",
            bg: "bg-[#EF4444]/10",
          },
          {
            label: "Stable",
            value: summary?.stable ?? "—",
            icon: Minus,
            color: "text-[#9CA3AF]",
            bg: "bg-[#9CA3AF]/10",
          },
          {
            label: "Overall trend",
            value: summary
              ? summary.overallTrend.charAt(0) + summary.overallTrend.slice(1).toLowerCase()
              : "—",
            icon:
              summary?.overallTrend === "UP"
                ? TrendingUp
                : summary?.overallTrend === "DOWN"
                ? TrendingDown
                : Minus,
            color:
              summary?.overallTrend === "UP"
                ? "text-[#22C55E]"
                : summary?.overallTrend === "DOWN"
                ? "text-[#EF4444]"
                : "text-[#9CA3AF]",
            bg:
              summary?.overallTrend === "UP"
                ? "bg-[#22C55E]/10"
                : summary?.overallTrend === "DOWN"
                ? "bg-[#EF4444]/10"
                : "bg-[#9CA3AF]/10",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card rounded-xl border border-[rgba(0,0,0,0.06)] px-4 py-3"
            >
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-[22px] font-bold text-foreground leading-none">
                {loading ? <span className="inline-block w-12 h-6 bg-muted rounded animate-pulse" /> : card.value}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-wrap gap-2 items-center">
        {/* Time range */}
        <div className="flex gap-1 bg-card dark:bg-[#1c1c1e] rounded-lg p-1 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => { setDays(d); setCustomMode(false); }}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
                !customMode && days === d
                  ? "bg-[#0071e3] text-white"
                  : "text-[rgba(0,0,0,0.56)] dark:text-white/56 hover:text-foreground dark:hover:text-white"
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => setCustomMode(true)}
            className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors ${
              customMode
                ? "bg-[#0071e3] text-white"
                : "text-[rgba(0,0,0,0.56)] dark:text-white/56 hover:text-foreground dark:hover:text-white"
            }`}
          >
            Custom
          </button>
        </div>

        {/* Custom date range */}
        {customMode && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-9 rounded-lg border border-border dark:border-white/10 px-2 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              aria-label="Start date"
            />
            <span className="text-[13px] text-[rgba(0,0,0,0.40)] dark:text-white/40">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-9 rounded-lg border border-border dark:border-white/10 px-2 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              aria-label="End date"
            />
            {customStart && customEnd && (
              <button
                onClick={() => {
                  const start = new Date(customStart);
                  const end = new Date(customEnd);
                  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                  if (diffDays > 0) setDays(diffDays);
                }}
                className="h-9 px-3 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors"
              >
                Apply
              </button>
            )}
          </div>
        )}

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="h-9 px-3 rounded-lg border border-border dark:border-white/10 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Location filter */}
        {locations.length > 0 && (
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-border dark:border-white/10 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="mt-4 bg-card dark:bg-[#1c1c1e] rounded-xl border border-[rgba(0,0,0,0.06)] dark:border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 py-2 animate-pulse">
                <div className="w-40 h-4 bg-muted rounded" />
                <div className="w-24 h-4 bg-muted/50 rounded hidden sm:block" />
                <div className="flex-1" />
                <div className="w-20 h-4 bg-muted/50 rounded" />
                <div className="w-16 h-4 bg-muted/50 rounded hidden md:block" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <h3 className="mt-4 text-[17px] font-semibold text-foreground">Failed to load analysis</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">Check your connection and try again.</p>
            <button
              onClick={fetchData}
              className="mt-4 px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <h3 className="mt-4 text-[17px] font-semibold text-foreground">No providers found</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">
              Upload prescription data to see trend analysis.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Provider
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                    Specialty
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Current
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Prior
                  </th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Change
                  </th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Trend
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Volume
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => (
                  <tr
                    key={p.providerId}
                    className="border-b border-border/50 last:border-0 hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => (window.location.href = `/app/providers/${p.providerId}`)}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/app/providers/${p.providerId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[14px] font-medium text-[#0071e3] hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.npi && (
                        <p className="text-[11px] text-[rgba(0,0,0,0.40)] font-mono mt-0.5">
                          NPI {p.npi}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[rgba(0,0,0,0.56)] hidden sm:table-cell">
                      {p.specialty || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] font-semibold text-foreground">
                      {p.currentVolume.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-[14px] text-muted-foreground hidden md:table-cell">
                      {p.priorVolume.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.absoluteChange > 0 ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                        ) : p.absoluteChange < 0 ? (
                          <ArrowDown className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                        ) : null}
                        <span
                          className={`text-[14px] font-medium ${
                            p.absoluteChange > 0
                              ? "text-[#22C55E]"
                              : p.absoluteChange < 0
                              ? "text-[#EF4444]"
                              : "text-[#9CA3AF]"
                          }`}
                        >
                          {p.absoluteChange > 0 ? "+" : ""}
                          {p.absoluteChange}
                        </span>
                        <span
                          className={`text-[12px] ${
                            p.percentChange > 0
                              ? "text-[#22C55E]"
                              : p.percentChange < 0
                              ? "text-[#EF4444]"
                              : "text-[#9CA3AF]"
                          }`}
                        >
                          ({p.percentChange > 0 ? "+" : ""}
                          {p.percentChange}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <TrendBadge trend={p.trend} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <VolumeBars
                        current={p.currentVolume}
                        prior={p.priorVolume}
                        max={maxVolume}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && sorted.length > 0 && (
        <p className="mt-2 text-[12px] text-[rgba(0,0,0,0.40)]">
          {sorted.length.toLocaleString()} provider{sorted.length !== 1 ? "s" : ""} · comparing current {days} days vs prior {days} days
        </p>
      )}
    </div>
  );
}

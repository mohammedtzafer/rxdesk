"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Pill,
  Users,
  Briefcase,
  Clock,
  Activity,
  ChevronDown,
  ChevronRight,
  Download,
  ArrowLeft,
  AlertCircle,
  Inbox,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────

interface ReportDef {
  id: string;
  label: string;
  desc: string;
}

interface ReportCategory {
  name: string;
  icon: React.ElementType;
  reports: ReportDef[];
}

interface Location {
  id: string;
  name: string;
}

interface SortState {
  key: string;
  dir: "asc" | "desc";
}

// ─── Report categories ────────────────────────────────────────────

const reportCategories: ReportCategory[] = [
  {
    name: "Prescription & Clinical",
    icon: Pill,
    reports: [
      { id: "rx-volume", label: "Rx Volume Trend", desc: "Daily/weekly/monthly prescription counts" },
      { id: "top-drugs", label: "Top Drugs", desc: "Most dispensed medications" },
      { id: "payer-mix", label: "Payer Mix", desc: "Insurance type breakdown" },
      { id: "gdr", label: "Generic Rate", desc: "Generic vs brand dispensing" },
    ],
  },
  {
    name: "Provider & Prescriber",
    icon: Users,
    reports: [
      { id: "provider-scorecard", label: "Provider Scorecard", desc: "Per-provider performance metrics" },
      { id: "prescriber-trends", label: "Prescriber Trends", desc: "Volume changes by provider" },
    ],
  },
  {
    name: "Drug Rep",
    icon: Briefcase,
    reports: [
      { id: "rep-activity", label: "Rep Activity", desc: "Visit frequency and coverage" },
    ],
  },
  {
    name: "Workforce & Labor",
    icon: Clock,
    reports: [
      { id: "hours-summary", label: "Hours Summary", desc: "Hours worked per employee" },
      { id: "overtime", label: "Overtime Analysis", desc: "OT hours and costs" },
      { id: "schedule-vs-actual", label: "Schedule vs Actual", desc: "Planned vs logged hours" },
      { id: "pto-summary", label: "PTO Summary", desc: "Time off by type and employee" },
    ],
  },
  {
    name: "Operational",
    icon: Activity,
    reports: [
      { id: "fill-to-pickup", label: "Fill-to-Pickup Time", desc: "Avg time from ready to pickup" },
    ],
  },
];

// ─── KPI card config per report ───────────────────────────────────

function getSummaryCards(
  reportId: string,
  data: Record<string, unknown>
): Array<{ label: string; value: string | number; sub?: string }> {
  const totals = (data.totals as Record<string, unknown>) || {};
  const summary = (data.summary as Record<string, unknown>) || {};
  const combined = { ...totals, ...summary };

  const fmt = (n: unknown, decimals = 0) => {
    const num = Number(n);
    if (isNaN(num)) return "—";
    return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
  };

  switch (reportId) {
    case "rx-volume":
      return [
        { label: "Total Rx", value: fmt(combined.total) },
        { label: "Avg per day", value: fmt(combined.avg, 1) },
        { label: "Period change", value: `${fmt(combined.change, 1)}%`, sub: "vs prior period" },
      ];
    case "top-drugs":
      return [
        { label: "Total Rx", value: fmt(data.total) },
        { label: "Unique drugs shown", value: fmt((data.drugs as unknown[])?.length) },
      ];
    case "payer-mix":
      return (data.mix as Array<{ type: string; count: number; percent: number }>)?.map((m) => ({
        label: m.type,
        value: `${m.percent}%`,
        sub: `${fmt(m.count)} Rx`,
      })) || [];
    case "gdr":
      return [
        { label: "Overall GDR", value: `${fmt(data.gdr, 1)}%` },
        { label: "Providers tracked", value: fmt((data.byProvider as unknown[])?.length) },
      ];
    case "provider-scorecard":
      return [
        { label: "Total Rx", value: fmt(combined.totalRx) },
        { label: "Active providers", value: fmt(combined.providerCount) },
      ];
    case "prescriber-trends":
      return [
        { label: "Total Rx", value: fmt(combined.totalRx) },
        { label: "Active providers", value: fmt(combined.activeProviders) },
        { label: "Avg Rx per provider", value: fmt(combined.avgPerProvider, 1) },
      ];
    case "rep-activity":
      return [
        { label: "Total visits", value: fmt(combined.totalVisits) },
        { label: "Unique reps", value: fmt(combined.uniqueReps) },
        { label: "Avg visits per rep", value: fmt(combined.avgVisitsPerRep, 1) },
      ];
    case "hours-summary":
      return [
        { label: "Total hours", value: fmt(combined.totalHours, 1) },
        { label: "Regular hours", value: fmt(combined.totalRegular, 1) },
        { label: "Overtime hours", value: fmt(combined.totalOvertime, 1) },
        { label: "Employees", value: fmt(combined.employeeCount) },
      ];
    case "overtime":
      return [
        { label: "Total OT hours", value: fmt(combined.totalOtHours, 1) },
        { label: "Est. OT cost", value: `$${fmt(combined.totalEstCost, 2)}` },
        { label: "Employees with OT", value: fmt(combined.employeesWithOt) },
      ];
    case "schedule-vs-actual":
      return [
        { label: "Scheduled hours", value: fmt(combined.totalScheduled, 1) },
        { label: "Actual hours", value: fmt(combined.totalActual, 1) },
        { label: "Variance", value: fmt(combined.totalVariance, 1), sub: "hours" },
      ];
    case "pto-summary":
      return [
        { label: "Total PTO days", value: fmt(combined.totalDays) },
        { label: "Approved", value: fmt(combined.approvedCount) },
        { label: "Pending", value: fmt(combined.pendingCount) },
      ];
    case "fill-to-pickup":
      return [
        { label: "Avg wait (min)", value: fmt(combined.avgMinutes, 1) },
        { label: "Median wait (min)", value: fmt(combined.medianMinutes, 1) },
        { label: "Total fills", value: fmt(combined.totalEvents) },
        { label: "Under 1 hour", value: fmt(combined.under1Hour), sub: "fills" },
      ];
    default:
      return [];
  }
}

// ─── Table column config ──────────────────────────────────────────

function getTableRows(reportId: string, data: Record<string, unknown>): unknown[] {
  switch (reportId) {
    case "rx-volume":
      return (data.data as unknown[]) || [];
    case "top-drugs":
      return (data.drugs as unknown[]) || [];
    case "payer-mix":
      return (data.mix as unknown[]) || [];
    case "gdr":
      return (data.byProvider as unknown[]) || [];
    case "provider-scorecard":
    case "prescriber-trends":
    case "rep-activity":
    case "hours-summary":
    case "overtime":
    case "schedule-vs-actual":
    case "pto-summary":
    case "fill-to-pickup":
      return (data.rows as unknown[]) || [];
    default:
      return [];
  }
}

function getColumnLabels(reportId: string): Record<string, string> {
  const common: Record<string, Record<string, string>> = {
    "rx-volume": { period: "Period", count: "Rx Count", change: "Change %" },
    "top-drugs": { name: "Drug", count: "Fills", quantity: "Units", genericRate: "Generic %", percentOfTotal: "% of Total" },
    "payer-mix": { type: "Payer", count: "Rx Count", percent: "Share %" },
    "gdr": { name: "Provider", npi: "NPI", gdr: "GDR %", count: "Total Rx" },
    "provider-scorecard": { name: "Provider", specialty: "Specialty", rxCount: "Rx Count", sharePercent: "Share %", gdr: "GDR %", topPayer: "Top Payer" },
    "prescriber-trends": { name: "Provider", specialty: "Specialty", currentCount: "Current", priorCount: "Prior", change: "Change %" },
    "rep-activity": { name: "Rep", company: "Company", territory: "Territory", visitCount: "Visits", avgDurationMin: "Avg Min", uniqueDrugs: "Drugs", lastVisit: "Last Visit" },
    "hours-summary": { name: "Employee", role: "Role", regularHours: "Regular Hrs", overtimeHours: "OT Hrs", totalHours: "Total Hrs", daysWorked: "Days" },
    "overtime": { name: "Employee", role: "Role", otHours: "OT Hours", estimatedCost: "Est. Cost" },
    "schedule-vs-actual": { name: "Employee", role: "Role", scheduledHours: "Scheduled", actualHours: "Actual", variance: "Variance", variancePercent: "Variance %" },
    "pto-summary": { name: "Employee", role: "Role", vacationDays: "Vacation", sickDays: "Sick", personalDays: "Personal", otherDays: "Other", totalDays: "Total Days" },
    "fill-to-pickup": { drugName: "Drug", avgWaitMinutes: "Avg Wait (min)", fillCount: "Fill Count" },
  };
  return common[reportId] || {};
}

function getHiddenColumns(reportId: string): string[] {
  const hidden: Record<string, string[]> = {
    "gdr": ["npi"],
    "provider-scorecard": ["npi"],
    "prescriber-trends": ["npi"],
    "rep-activity": ["repId"],
  };
  return hidden[reportId] || [];
}

// ─── Component ────────────────────────────────────────────────────

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(reportCategories.map((c) => c.name))
  );
  const [sort, setSort] = useState<SortState | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  const selectedReportDef = reportCategories
    .flatMap((c) => c.reports)
    .find((r) => r.id === selectedReport);

  // Load locations once
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data: Location[]) => setLocations(data))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    if (!selectedReport) return;
    setLoading(true);
    setError(null);
    setReportData(null);
    setSort(null);

    const params = new URLSearchParams({ startDate, endDate });
    if (locationId) params.set("locationId", locationId);

    try {
      const res = await fetch(`/api/reports/${selectedReport}?${params}`);
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as Record<string, unknown>;
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [selectedReport, startDate, endDate, locationId]);

  useEffect(() => {
    if (selectedReport) fetchReport();
  }, [selectedReport, startDate, endDate, locationId, fetchReport]);

  const handleSelectReport = (id: string) => {
    setSelectedReport(id);
    setReportData(null);
    setError(null);
    setMobileView("detail");
  };

  const handleExport = () => {
    if (!selectedReport) return;
    const params = new URLSearchParams({ startDate, endDate, format: "csv" });
    if (locationId) params.set("locationId", locationId);
    window.open(`/api/reports/${selectedReport}?${params}`, "_blank");
  };

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "desc" };
    });
  };

  // Derive sorted table data
  const rawRows = reportData ? getTableRows(selectedReport!, reportData) : [];
  const columnLabels = selectedReport ? getColumnLabels(selectedReport) : {};
  const hiddenColumns = selectedReport ? getHiddenColumns(selectedReport) : [];

  const columns = rawRows.length > 0
    ? Object.keys(rawRows[0] as object).filter(
        (k) => !hiddenColumns.includes(k) && columnLabels[k] !== undefined
      )
    : [];

  const tableRows = sort
    ? [...rawRows].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sort.key];
        const bv = (b as Record<string, unknown>)[sort.key];
        const an = Number(av);
        const bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) {
          return sort.dir === "asc" ? an - bn : bn - an;
        }
        const as_ = String(av ?? "");
        const bs_ = String(bv ?? "");
        return sort.dir === "asc"
          ? as_.localeCompare(bs_)
          : bs_.localeCompare(as_);
      })
    : rawRows;

  const summaryCards = reportData && selectedReport
    ? getSummaryCards(selectedReport, reportData)
    : [];

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="flex flex-col md:flex-row gap-0 -m-4 md:-m-6 min-h-[calc(100vh-56px)]">

      {/* Left sidebar — report list */}
      <aside
        className={cn(
          "w-full md:w-64 md:min-w-64 md:max-w-64 border-r border-black/5 bg-white",
          "md:block",
          mobileView === "detail" ? "hidden" : "block"
        )}
      >
        <div className="sticky top-0 bg-white border-b border-black/5 px-4 py-3">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
            Reports
          </h1>
        </div>

        <nav className="py-2">
          {reportCategories.map((cat) => {
            const Icon = cat.icon;
            const isExpanded = expandedCategories.has(cat.name);

            return (
              <div key={cat.name}>
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-[13px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide hover:text-[#1d1d1f] transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">{cat.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mb-1">
                    {cat.reports.map((report) => {
                      const isActive = selectedReport === report.id;
                      return (
                        <button
                          key={report.id}
                          onClick={() => handleSelectReport(report.id)}
                          className={cn(
                            "w-full text-left px-4 py-2 transition-colors group",
                            isActive
                              ? "bg-[#0071e3]/8"
                              : "hover:bg-[#f5f5f7]"
                          )}
                        >
                          <p
                            className={cn(
                              "text-[14px] font-medium leading-snug",
                              isActive
                                ? "text-[#0071e3]"
                                : "text-[#1d1d1f] group-hover:text-[#0071e3]"
                            )}
                          >
                            {report.label}
                          </p>
                          <p className="text-[12px] text-[rgba(0,0,0,0.48)] mt-0.5 leading-snug">
                            {report.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* Right panel — report content */}
      <main
        className={cn(
          "flex-1 min-w-0 bg-[#f5f5f7]",
          "md:block",
          mobileView === "list" ? "hidden" : "block"
        )}
      >
        {/* Mobile back button */}
        <div className="md:hidden border-b border-black/5 bg-white px-4 py-3">
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1.5 text-[#0071e3] text-[14px] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to reports
          </button>
        </div>

        {!selectedReport ? (
          <EmptySelection />
        ) : (
          <div className="p-4 md:p-6 space-y-5 max-w-5xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f]">
                  {selectedReportDef?.label}
                </h2>
                <p className="text-[14px] text-[rgba(0,0,0,0.48)] mt-0.5">
                  {selectedReportDef?.desc}
                </p>
              </div>
              <Button
                onClick={handleExport}
                variant="outline"
                size="sm"
                disabled={loading || !reportData}
                className="shrink-0 gap-1.5 text-[13px] h-8"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-xl border border-black/5">
              <label className="flex items-center gap-1.5 text-[13px] text-[rgba(0,0,0,0.48)]">
                From
                <input
                  type="date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 px-2 rounded-md border border-black/10 text-[13px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[13px] text-[rgba(0,0,0,0.48)]">
                To
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 px-2 rounded-md border border-black/10 text-[13px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
                />
              </label>
              {locations.length > 0 && (
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="h-8 px-2 rounded-md border border-black/10 text-[13px] text-[#1d1d1f] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]/40"
                >
                  <option value="">All locations</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
              {loading && (
                <Loader2 className="w-4 h-4 animate-spin text-[rgba(0,0,0,0.32)]" />
              )}
            </div>

            {/* Loading state */}
            {loading && <KpiSkeleton />}

            {/* Error state */}
            {!loading && error && <ErrorState message={error} onRetry={fetchReport} />}

            {/* Data */}
            {!loading && !error && reportData && (
              <>
                {/* KPI cards */}
                {summaryCards.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {summaryCards.map((card) => (
                      <div
                        key={card.label}
                        className="bg-white rounded-xl border border-black/5 px-4 py-3"
                      >
                        <p className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                          {card.label}
                        </p>
                        <p className="text-[22px] font-semibold text-[#1d1d1f] mt-1 leading-tight">
                          {card.value}
                        </p>
                        {card.sub && (
                          <p className="text-[12px] text-[rgba(0,0,0,0.32)] mt-0.5">
                            {card.sub}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Table */}
                {tableRows.length === 0 ? (
                  <EmptyData />
                ) : (
                  <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-black/5">
                            {columns.map((col) => (
                              <th
                                key={col}
                                className="px-4 py-3 text-left font-semibold text-[rgba(0,0,0,0.48)] whitespace-nowrap"
                              >
                                <button
                                  onClick={() => handleSort(col)}
                                  className="flex items-center gap-1 hover:text-[#1d1d1f] transition-colors"
                                >
                                  {columnLabels[col] || col}
                                  <SortIcon sortKey={col} sort={sort} />
                                </button>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-black/5 last:border-0 hover:bg-[#f5f5f7] transition-colors"
                            >
                              {columns.map((col) => {
                                const val = (row as Record<string, unknown>)[col];
                                return (
                                  <td
                                    key={col}
                                    className="px-4 py-2.5 text-[#1d1d1f] whitespace-nowrap"
                                  >
                                    <CellValue col={col} value={val} />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="px-4 py-2 border-t border-black/5 text-[12px] text-[rgba(0,0,0,0.32)]">
                      {tableRows.length.toLocaleString()} row{tableRows.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function SortIcon({ sortKey, sort }: { sortKey: string; sort: SortState | null }) {
  if (!sort || sort.key !== sortKey) {
    return <ArrowUpDown className="w-3 h-3 opacity-40" />;
  }
  return sort.dir === "asc"
    ? <ArrowUp className="w-3 h-3 text-[#0071e3]" />
    : <ArrowDown className="w-3 h-3 text-[#0071e3]" />;
}

function CellValue({ col, value }: { col: string; value: unknown }) {
  if (value === null || value === undefined) return <span className="text-[rgba(0,0,0,0.32)]">—</span>;

  const numericCols = [
    "count", "quantity", "genericRate", "percentOfTotal", "percent",
    "rxCount", "sharePercent", "gdr", "change", "currentCount", "priorCount",
    "visitCount", "avgDurationMin", "uniqueDrugs", "regularHours", "overtimeHours",
    "totalHours", "daysWorked", "otHours", "scheduledHours", "actualHours",
    "variance", "variancePercent", "vacationDays", "sickDays", "personalDays",
    "otherDays", "totalDays", "totalRequests", "avgWaitMinutes", "fillCount",
    "avgPerProvider", "medianMinutes",
  ];

  const pctCols = ["genericRate", "percentOfTotal", "percent", "sharePercent", "gdr", "variancePercent"];
  const costCols = ["estimatedCost"];
  const changeCols = ["change"];

  const num = Number(value);

  if (costCols.includes(col) && !isNaN(num)) {
    return <span>${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
  }

  if (pctCols.includes(col) && !isNaN(num)) {
    return <span>{num}%</span>;
  }

  if (changeCols.includes(col) && !isNaN(num)) {
    const color = num > 0 ? "text-green-600" : num < 0 ? "text-red-600" : "text-[rgba(0,0,0,0.48)]";
    return <span className={color}>{num > 0 ? "+" : ""}{num}%</span>;
  }

  if (numericCols.includes(col) && !isNaN(num)) {
    return <span>{num.toLocaleString()}</span>;
  }

  // role badge
  if (col === "role") {
    const roleColors: Record<string, string> = {
      OWNER: "bg-purple-100 text-purple-700",
      PHARMACIST: "bg-blue-100 text-blue-700",
      TECHNICIAN: "bg-gray-100 text-gray-600",
    };
    const str = String(value);
    return (
      <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium", roleColors[str] || "bg-gray-100 text-gray-600")}>
        {str.charAt(0) + str.slice(1).toLowerCase()}
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

function EmptySelection() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
      <div className="w-12 h-12 rounded-full bg-[#0071e3]/8 flex items-center justify-center mb-4">
        <Activity className="w-6 h-6 text-[#0071e3]" />
      </div>
      <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Select a report</h3>
      <p className="text-[14px] text-[rgba(0,0,0,0.48)] mt-1 max-w-xs">
        Choose a report from the left panel to view data, set filters, and export results.
      </p>
    </div>
  );
}

function EmptyData() {
  return (
    <div className="bg-white rounded-xl border border-black/5 flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="w-10 h-10 text-[rgba(0,0,0,0.16)] mb-3" />
      <p className="text-[15px] font-medium text-[#1d1d1f]">No data for this period</p>
      <p className="text-[13px] text-[rgba(0,0,0,0.48)] mt-1">
        Try adjusting the date range or location filter.
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-red-200 flex flex-col items-center justify-center py-12 text-center px-6">
      <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
      <p className="text-[15px] font-semibold text-[#1d1d1f]">Failed to load report</p>
      <p className="text-[13px] text-[rgba(0,0,0,0.48)] mt-1 mb-4">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-black/5 px-4 py-3 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-black/5 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-6 px-4 py-3 border-b border-black/5 last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

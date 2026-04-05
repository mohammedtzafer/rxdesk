"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users, TrendingUp, TrendingDown, Minus, Upload } from "lucide-react";
import { ErrorState } from "@/components/error-state";

interface Provider {
  id: string;
  npi: string;
  firstName: string;
  lastName: string;
  specialty: string | null;
  practiceName: string | null;
  practiceCity: string | null;
  practiceState: string | null;
  tags: string[];
  _count: { prescriptionRecords: number };
}

type TrendValue = "UP" | "DOWN" | "STABLE";

interface TrendProvider {
  providerId: string;
  npi: string;
  trend: TrendValue;
}

function TrendIndicator({ trend }: { trend: TrendValue }) {
  if (trend === "UP") return <TrendingUp className="w-4 h-4 text-[#22C55E]" aria-label="Growing" />;
  if (trend === "DOWN") return <TrendingDown className="w-4 h-4 text-[#EF4444]" aria-label="Declining" />;
  return <Minus className="w-4 h-4 text-[#9CA3AF]" aria-label="Stable" />;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [trendMap, setTrendMap] = useState<Map<string, TrendValue>>(new Map());

  // Fetch trend data once on mount
  useEffect(() => {
    fetch("/api/providers/analysis?days=90")
      .then((r) => r.json())
      .then((data: { providers?: TrendProvider[] }) => {
        const map = new Map<string, TrendValue>();
        (data.providers ?? []).forEach((p) => {
          map.set(p.npi, p.trend);
        });
        setTrendMap(map);
      })
      .catch(() => {});
  }, []);

  const fetchProviders = async (searchVal = search, pageVal = page) => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(pageVal), limit: "25" });
      if (searchVal) params.set("search", searchVal);
      const res = await fetch(`/api/providers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers);
        setTotal(data.total);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => fetchProviders(search, page), 300);
    return () => clearTimeout(debounce);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">
            Providers
          </h1>
          <p className="mt-1 text-[17px] text-muted-foreground">
            {total} provider{total !== 1 ? "s" : ""} in your directory
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/app/providers/analysis"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#22C55E] text-white rounded-lg text-[14px] hover:bg-[#16A34A] transition-colors w-full sm:w-auto"
          >
            <TrendingUp className="w-4 h-4" /> Analyze Trends
          </Link>
          <Link
            href="/app/providers/search"
            className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
          >
            <Search className="w-4 h-4" />
            Search NPI
          </Link>
          <Link
            href="/app/providers/upload"
            className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground dark:text-white dark:border-white/10 rounded-lg text-[14px] hover:bg-card dark:hover:bg-card/10 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Rx Data
          </Link>
          <Link
            href="/app/providers/import"
            className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground dark:text-white dark:border-white/10 rounded-lg text-[14px] hover:bg-card dark:hover:bg-card/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Import providers
          </Link>
        </div>
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
        <Input
          placeholder="Search by name, NPI, or practice..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-10 h-11 bg-card"
        />
      </div>

      {error && (
        <div className="mt-4"><ErrorState onRetry={() => fetchProviders(search, page)} /></div>
      )}

      <div className="mt-4 bg-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                <div className="w-24 h-4 bg-muted/50 rounded animate-pulse" />
                <div className="flex-1" />
                <div className="w-12 h-4 bg-muted/50 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <h2 className="mt-4 text-[21px] font-bold text-foreground">No providers yet</h2>
            <p className="mt-2 text-[17px] text-muted-foreground">
              Search the NPI registry or import a CSV to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Provider
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  NPI
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Specialty
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  Location
                </th>
                <th className="text-center px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  Trend
                </th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Rx count
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 hover:bg-muted transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/providers/${p.id}`}
                      className="text-[#0066cc] hover:underline font-medium text-[14px]"
                    >
                      {p.lastName}, {p.firstName}
                    </Link>
                    {p.tags && (p.tags as string[]).length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {(p.tags as string[]).slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground hidden md:table-cell font-mono">
                    {p.npi}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground hidden lg:table-cell">
                    {p.specialty || "—"}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-muted-foreground hidden lg:table-cell">
                    {p.practiceCity && p.practiceState
                      ? `${p.practiceCity}, ${p.practiceState}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {trendMap.has(p.npi) ? (
                      <span className="inline-flex justify-center">
                        <TrendIndicator trend={trendMap.get(p.npi)!} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] font-medium text-foreground">
                    {p._count.prescriptionRecords}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {total > 25 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[14px] text-muted-foreground">
            Page {page} of {Math.ceil(total / 25)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-border rounded-lg text-[14px] disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 25)}
              className="px-3 py-1.5 border border-border rounded-lg text-[14px] disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

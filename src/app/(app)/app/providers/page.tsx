"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Users } from "lucide-react";

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

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);

      const res = await fetch(`/api/providers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers);
        setTotal(data.total);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchProviders, 300);
    return () => clearTimeout(debounce);
  }, [search, page]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Providers
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            {total} provider{total !== 1 ? "s" : ""} in your directory
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/app/providers/search"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
          >
            <Search className="w-4 h-4" />
            Search NPI
          </Link>
          <Link
            href="/app/providers/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[14px] hover:bg-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Import CSV
          </Link>
        </div>
      </div>

      <div className="mt-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,0,0,0.3)]" />
        <Input
          placeholder="Search by name, NPI, or practice..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="pl-10 h-11 bg-white"
        />
      </div>

      <div className="mt-4 bg-white rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[rgba(0,0,0,0.48)]">Loading...</div>
        ) : providers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
            <h2 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">No providers yet</h2>
            <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
              Search the NPI registry or import a CSV to get started.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.05)]">
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                  Provider
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide hidden md:table-cell">
                  NPI
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide hidden lg:table-cell">
                  Specialty
                </th>
                <th className="text-left px-4 py-3 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide hidden lg:table-cell">
                  Location
                </th>
                <th className="text-right px-4 py-3 text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                  Rx count
                </th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-[rgba(0,0,0,0.03)] hover:bg-[#f5f5f7] transition-colors"
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
                  <td className="px-4 py-3 text-[14px] text-[rgba(0,0,0,0.48)] hidden md:table-cell font-mono">
                    {p.npi}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[rgba(0,0,0,0.48)] hidden lg:table-cell">
                    {p.specialty || "—"}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-[rgba(0,0,0,0.48)] hidden lg:table-cell">
                    {p.practiceCity && p.practiceState
                      ? `${p.practiceCity}, ${p.practiceState}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[14px] font-medium text-[#1d1d1f]">
                    {p._count.prescriptionRecords}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {total > 25 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[14px] text-[rgba(0,0,0,0.48)]">
            Page {page} of {Math.ceil(total / 25)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border border-[rgba(0,0,0,0.08)] rounded-lg text-[14px] disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(total / 25)}
              className="px-3 py-1.5 border border-[rgba(0,0,0,0.08)] rounded-lg text-[14px] disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

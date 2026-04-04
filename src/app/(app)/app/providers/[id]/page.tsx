"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Pill, MapPin, Phone, Building2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Provider {
  id: string;
  npi: string;
  firstName: string;
  lastName: string;
  suffix: string | null;
  credential: string | null;
  specialty: string | null;
  practiceName: string | null;
  practiceAddress: string | null;
  practiceCity: string | null;
  practiceState: string | null;
  practiceZip: string | null;
  practicePhone: string | null;
  tags: string[];
  notes: string | null;
  isActive: boolean;
  enrichedFromNppes: boolean;
  lastEnrichedAt: string | null;
  createdAt: string;
  _count: { prescriptionRecords: number };
}

interface Analytics {
  rxVolume: number;
  priorRxVolume: number;
  trendDirection: string;
  percentChange: number;
  rxPerWeek: number;
  topDrugs: Array<{ name: string; count: number }>;
  brandGenericRatio: { brand: number; generic: number; brandPercent: number };
  payerMix: Array<{ type: string; count: number; percent: number }>;
  newDrugs: string[];
}

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "UP") return <TrendingUp className="w-4 h-4 text-[#22C55E]" />;
  if (direction === "DOWN") return <TrendingDown className="w-4 h-4 text-[#EF4444]" />;
  return <Minus className="w-4 h-4 text-[#9CA3AF]" />;
};

const trendColor = (d: string) =>
  d === "UP" ? "text-[#22C55E]" : d === "DOWN" ? "text-[#EF4444]" : "text-[#9CA3AF]";

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"analytics" | "drugs" | "notes">("analytics");
  const [days, setDays] = useState(90);

  useEffect(() => {
    Promise.all([
      fetch(`/api/providers/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/providers/${id}/analytics?days=${days}`).then((r) => (r.ok ? r.json() : null)),
    ]).then(([p, a]) => {
      setProvider(p);
      setAnalytics(a);
      setLoading(false);
    });
  }, [id, days]);

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 bg-white rounded animate-pulse" />
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-20">
        <h1 className="text-[28px] font-normal text-[#1d1d1f]">Provider not found</h1>
        <Link href="/app/providers" className="mt-4 inline-block text-[#0066cc] hover:underline">
          Back to providers
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Link
        href="/app/providers"
        className="inline-flex items-center gap-1 text-[14px] text-[#0066cc] hover:underline mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Providers
      </Link>

      <div className="bg-white rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-[#1d1d1f]">
              Dr. {provider.firstName} {provider.lastName}
              {provider.suffix ? `, ${provider.suffix}` : ""}
              {provider.credential && (
                <span className="text-[rgba(0,0,0,0.48)] ml-1">{provider.credential}</span>
              )}
            </h1>
            <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">NPI {provider.npi}</p>
          </div>
          {!provider.isActive && <Badge variant="destructive">Inactive</Badge>}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[14px]">
          {provider.specialty && (
            <div className="flex items-center gap-2 text-[rgba(0,0,0,0.48)]">
              <Pill className="w-4 h-4" /> {provider.specialty}
            </div>
          )}
          {provider.practiceName && (
            <div className="flex items-center gap-2 text-[rgba(0,0,0,0.48)]">
              <Building2 className="w-4 h-4" /> {provider.practiceName}
            </div>
          )}
          {provider.practiceCity && provider.practiceState && (
            <div className="flex items-center gap-2 text-[rgba(0,0,0,0.48)]">
              <MapPin className="w-4 h-4" /> {provider.practiceCity}, {provider.practiceState}{" "}
              {provider.practiceZip}
            </div>
          )}
          {provider.practicePhone && (
            <div className="flex items-center gap-2 text-[rgba(0,0,0,0.48)]">
              <Phone className="w-4 h-4" /> {provider.practicePhone}
            </div>
          )}
        </div>

        {(provider.tags as string[]).length > 0 && (
          <div className="mt-3 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-[rgba(0,0,0,0.3)]" />
            {(provider.tags as string[]).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-1 bg-white rounded-lg p-1">
          {(["analytics", "drugs", "notes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-[14px] capitalize transition-colors ${
                tab === t ? "bg-[#0071e3] text-white" : "text-[rgba(0,0,0,0.48)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "analytics" && (
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="h-8 rounded-lg border border-[rgba(0,0,0,0.08)] px-2 text-[13px] bg-white"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        )}
      </div>

      {tab === "analytics" && analytics && (
        <div className="mt-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-[13px] text-[rgba(0,0,0,0.48)] font-medium">Rx volume ({days}d)</p>
              <p className="text-[28px] font-normal text-[#1d1d1f] mt-1">{analytics.rxVolume}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon direction={analytics.trendDirection} />
                <span className={`text-[12px] ${trendColor(analytics.trendDirection)}`}>
                  {analytics.percentChange > 0 ? "+" : ""}
                  {analytics.percentChange}%
                </span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-[13px] text-[rgba(0,0,0,0.48)] font-medium">Rx per week</p>
              <p className="text-[28px] font-normal text-[#1d1d1f] mt-1">{analytics.rxPerWeek}</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-[13px] text-[rgba(0,0,0,0.48)] font-medium">Brand %</p>
              <p className="text-[28px] font-normal text-[#1d1d1f] mt-1">
                {analytics.brandGenericRatio.brandPercent}%
              </p>
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">
                {analytics.brandGenericRatio.brand} brand / {analytics.brandGenericRatio.generic} generic
              </p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-[13px] text-[rgba(0,0,0,0.48)] font-medium">Prior volume</p>
              <p className="text-[28px] font-normal text-[#1d1d1f] mt-1">{analytics.priorRxVolume}</p>
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">Previous {days} days</p>
            </div>
          </div>

          {/* Payer mix */}
          {analytics.payerMix.length > 0 && (
            <div className="mt-4 bg-white rounded-xl p-5">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Payer mix</h3>
              <div className="mt-3 flex gap-1 h-3 rounded-full overflow-hidden bg-[#f5f5f7]">
                {analytics.payerMix.map((p) => {
                  const colors: Record<string, string> = {
                    COMMERCIAL: "#0071e3",
                    MEDICARE: "#22C55E",
                    MEDICAID: "#F59E0B",
                    CASH: "#9CA3AF",
                    OTHER: "#D4D4D8",
                  };
                  return (
                    <div
                      key={p.type}
                      style={{ width: `${p.percent}%`, background: colors[p.type] || "#D4D4D8" }}
                      className="h-full"
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-4">
                {analytics.payerMix.map((p) => (
                  <span key={p.type} className="text-[12px] text-[rgba(0,0,0,0.48)]">
                    {p.type} {p.percent}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* New drugs */}
          {analytics.newDrugs.length > 0 && (
            <div className="mt-4 bg-white rounded-xl p-5">
              <h3 className="text-[14px] font-semibold text-[#1d1d1f]">
                New drugs (not in prior period)
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {analytics.newDrugs.map((d) => (
                  <Badge key={d} variant="secondary">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "drugs" && analytics && (
        <div className="mt-4 bg-white rounded-xl p-5">
          <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Top drugs</h3>
          {analytics.topDrugs.length === 0 ? (
            <p className="mt-3 text-[14px] text-[rgba(0,0,0,0.48)]">
              No prescription data for this provider.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {analytics.topDrugs.map((drug, i) => {
                const max = analytics.topDrugs[0]?.count || 1;
                return (
                  <div key={drug.name} className="flex items-center gap-3">
                    <span className="w-6 text-right text-[12px] text-[rgba(0,0,0,0.3)]">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[14px] text-[#1d1d1f]">{drug.name}</span>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">{drug.count}</span>
                      </div>
                      <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0071e3] rounded-full"
                          style={{ width: `${(drug.count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "notes" && (
        <div className="mt-4 bg-white rounded-xl p-5">
          <h3 className="text-[14px] font-semibold text-[#1d1d1f]">Notes</h3>
          {provider.notes ? (
            <p className="mt-2 text-[14px] text-[rgba(0,0,0,0.8)] whitespace-pre-wrap">
              {provider.notes}
            </p>
          ) : (
            <p className="mt-2 text-[14px] text-[rgba(0,0,0,0.48)]">No notes for this provider.</p>
          )}
          {provider.enrichedFromNppes && (
            <p className="mt-4 text-[12px] text-[rgba(0,0,0,0.3)]">
              Enriched from NPPES{" "}
              {provider.lastEnrichedAt
                ? `on ${new Date(provider.lastEnrichedAt).toLocaleDateString()}`
                : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

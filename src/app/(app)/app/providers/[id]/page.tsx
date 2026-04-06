"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Pill, MapPin, Phone, Building2, Tag, Upload, Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
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
  addresses: Array<{
    id: string;
    label: string | null;
    address: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    isPrimary: boolean;
    source: string;
  }>;
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

const PRESET_DAYS = [7, 14, 30, 60, 90] as const;

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"analytics" | "drugs" | "notes">("analytics");
  const [days, setDays] = useState(90);
  const [customMode, setCustomMode] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: "", address: "", city: "", state: "", zip: "" });
  const [savingAddress, setSavingAddress] = useState(false);

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
        <div className="h-8 w-48 bg-card dark:bg-[#1c1c1e] rounded animate-pulse" />
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card dark:bg-[#1c1c1e] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-20">
        <h1 className="text-[28px] font-normal text-foreground dark:text-white">Provider not found</h1>
        <Link href="/app/providers" className="mt-4 inline-block text-[#0066cc] hover:underline">
          Back to providers
        </Link>
      </div>
    );
  }

  const buildMapUrl = (addr: { address: string; city: string | null; state: string | null; zip: string | null }) => {
    const full = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
    return {
      apple: `https://maps.apple.com/?address=${encodeURIComponent(full)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`,
    };
  };

  const handleAddAddress = async () => {
    if (!addressForm.address.trim()) return;
    setSavingAddress(true);
    try {
      const res = await fetch(`/api/providers/${id}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      if (res.ok) {
        const p = await fetch(`/api/providers/${id}`).then((r) => r.json());
        setProvider(p);
        setShowAddAddress(false);
        setAddressForm({ label: "", address: "", city: "", state: "", zip: "" });
      }
    } catch {
      // silent
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const res = await fetch(`/api/providers/${id}/addresses/${addressId}`, { method: "DELETE" });
      if (res.ok) {
        const p = await fetch(`/api/providers/${id}`).then((r) => r.json());
        setProvider(p);
      }
    } catch {
      // silent
    }
  };

  return (
    <div>
      {/* Header */}
      <Link
        href="/app/providers"
        className="inline-flex items-center gap-1 text-[14px] text-[#0066cc] hover:underline mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Providers
      </Link>

      <div className="bg-card dark:bg-[#1c1c1e] rounded-xl p-6 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-normal leading-[1.14] tracking-[0.196px] text-foreground dark:text-white">
              Dr. {provider.firstName} {provider.lastName}
              {provider.suffix ? `, ${provider.suffix}` : ""}
              {provider.credential && (
                <span className="text-muted-foreground dark:text-white/48 ml-1">{provider.credential}</span>
              )}
            </h1>
            <p className="mt-1 text-[17px] text-muted-foreground dark:text-white/48">NPI {provider.npi}</p>
          </div>
          <div className="flex items-center gap-2">
            {!provider.isActive && <Badge variant="destructive">Inactive</Badge>}
            <Link
              href="/app/providers/upload"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border dark:border-white/10 text-foreground dark:text-white rounded-lg text-[13px] hover:bg-muted dark:hover:bg-card/10 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Rx data
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[14px]">
          {provider.specialty && (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-white/48">
              <Pill className="w-4 h-4" /> {provider.specialty}
            </div>
          )}
          {provider.practiceName && (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-white/48">
              <Building2 className="w-4 h-4" /> {provider.practiceName}
            </div>
          )}
          {provider.practiceCity && provider.practiceState && (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-white/48">
              <MapPin className="w-4 h-4" /> {provider.practiceCity}, {provider.practiceState}{" "}
              {provider.practiceZip}
            </div>
          )}
          {provider.practicePhone && (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-white/48">
              <Phone className="w-4 h-4" /> {provider.practicePhone}
            </div>
          )}
        </div>

        {(provider.tags as string[]).length > 0 && (
          <div className="mt-3 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-muted-foreground/60 dark:text-white/30" />
            {(provider.tags as string[]).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[11px]">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Addresses */}
      <div className="mt-4 bg-card dark:bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">Addresses</h3>
          <button
            onClick={() => setShowAddAddress(!showAddAddress)}
            className="inline-flex items-center gap-1 text-[13px] text-[#0071e3] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add address
          </button>
        </div>

        {provider.addresses && provider.addresses.length > 0 ? (
          <div className="space-y-3">
            {provider.addresses.map((addr) => {
              const maps = buildMapUrl(addr);
              const fullAddr = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
              return (
                <div key={addr.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 dark:bg-card/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="text-[14px] text-foreground dark:text-white">{fullAddr}</span>
                      {addr.isPrimary && (
                        <span className="px-1.5 py-0.5 bg-[#0071e3]/10 text-[#0071e3] rounded text-[10px] font-medium">Primary</span>
                      )}
                      {addr.label && (
                        <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-medium">{addr.label}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 mt-0.5 block capitalize">{addr.source.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={maps.apple}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      title="Open in Apple Maps"
                    >
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <a
                      href={maps.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground dark:text-white/48">No addresses on file.</p>
        )}

        {showAddAddress && (
          <div className="mt-3 p-3 rounded-lg border border-border dark:border-white/10 space-y-2">
            <input
              placeholder="Label (e.g., Main Office)"
              value={addressForm.label}
              onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
              className="w-full h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
            />
            <input
              placeholder="Street address"
              value={addressForm.address}
              onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
              className="w-full h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              required
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="City"
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                className="h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              />
              <input
                placeholder="State"
                value={addressForm.state}
                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                className="h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              />
              <input
                placeholder="ZIP"
                value={addressForm.zip}
                onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                className="h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddAddress}
                disabled={savingAddress || !addressForm.address.trim()}
                className="px-4 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-50"
              >
                {savingAddress ? "Saving..." : "Add"}
              </button>
              <button
                onClick={() => setShowAddAddress(false)}
                className="px-4 py-1.5 border border-border rounded-lg text-[13px] text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs + date filter */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-card dark:bg-[#1c1c1e] rounded-lg p-1 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
          {(["analytics", "drugs", "notes"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-[14px] capitalize transition-colors ${
                tab === t
                  ? "bg-[#0071e3] text-white"
                  : "text-muted-foreground dark:text-white/48 hover:text-foreground dark:hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "analytics" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Preset day buttons */}
            <div className="flex gap-1 bg-card dark:bg-[#1c1c1e] rounded-lg p-1 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
              {PRESET_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => { setDays(d); setCustomMode(false); }}
                  className={`px-2.5 py-1 rounded-md text-[13px] font-medium transition-colors ${
                    !customMode && days === d
                      ? "bg-[#0071e3] text-white"
                      : "text-muted-foreground dark:text-white/48 hover:text-foreground dark:hover:text-white"
                  }`}
                >
                  {d}d
                </button>
              ))}
              <button
                onClick={() => setCustomMode(true)}
                className={`px-2.5 py-1 rounded-md text-[13px] font-medium transition-colors ${
                  customMode
                    ? "bg-[#0071e3] text-white"
                    : "text-muted-foreground dark:text-white/48 hover:text-foreground dark:hover:text-white"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom date inputs */}
            {customMode && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 rounded-lg border border-border dark:border-white/10 px-2 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
                  aria-label="Start date"
                />
                <span className="text-[13px] text-[rgba(0,0,0,0.40)] dark:text-white/40">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 rounded-lg border border-border dark:border-white/10 px-2 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
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
                    className="h-8 px-3 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors"
                  >
                    Apply
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {tab === "analytics" && analytics && (
        <div className="mt-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card dark:bg-[#1c1c1e] rounded-lg p-4 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
              <p className="text-[13px] text-muted-foreground dark:text-white/48 font-medium">
                Rx volume ({days}d)
              </p>
              <p className="text-[28px] font-normal text-foreground dark:text-white mt-1">{analytics.rxVolume}</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendIcon direction={analytics.trendDirection} />
                <span className={`text-[12px] ${trendColor(analytics.trendDirection)}`}>
                  {analytics.percentChange > 0 ? "+" : ""}
                  {analytics.percentChange}%
                </span>
              </div>
            </div>
            <div className="bg-card dark:bg-[#1c1c1e] rounded-lg p-4 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
              <p className="text-[13px] text-muted-foreground dark:text-white/48 font-medium">Rx per week</p>
              <p className="text-[28px] font-normal text-foreground dark:text-white mt-1">{analytics.rxPerWeek}</p>
            </div>
            <div className="bg-card dark:bg-[#1c1c1e] rounded-lg p-4 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
              <p className="text-[13px] text-muted-foreground dark:text-white/48 font-medium">Brand %</p>
              <p className="text-[28px] font-normal text-foreground dark:text-white mt-1">
                {analytics.brandGenericRatio.brandPercent}%
              </p>
              <p className="text-[12px] text-muted-foreground dark:text-white/48 mt-1">
                {analytics.brandGenericRatio.brand} brand / {analytics.brandGenericRatio.generic} generic
              </p>
            </div>
            <div className="bg-card dark:bg-[#1c1c1e] rounded-lg p-4 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
              <p className="text-[13px] text-muted-foreground dark:text-white/48 font-medium">Prior volume</p>
              <p className="text-[28px] font-normal text-foreground dark:text-white mt-1">{analytics.priorRxVolume}</p>
              <p className="text-[12px] text-muted-foreground dark:text-white/48 mt-1">Previous {days} days</p>
            </div>
          </div>

          {/* Payer mix */}
          {analytics.payerMix.length > 0 && (
            <div className="mt-4 bg-card dark:bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
              <h3 className="text-[14px] font-semibold text-foreground dark:text-white">Payer mix</h3>
              <div className="mt-3 flex gap-1 h-3 rounded-full overflow-hidden bg-muted dark:bg-card/10">
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
                  <span key={p.type} className="text-[12px] text-muted-foreground dark:text-white/48">
                    {p.type} {p.percent}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* New drugs */}
          {analytics.newDrugs.length > 0 && (
            <div className="mt-4 bg-card dark:bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
              <h3 className="text-[14px] font-semibold text-foreground dark:text-white">
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
        <div className="mt-4 bg-card dark:bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">Top drugs</h3>
          {analytics.topDrugs.length === 0 ? (
            <p className="mt-3 text-[14px] text-muted-foreground dark:text-white/48">
              No prescription data for this provider.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {analytics.topDrugs.map((drug, i) => {
                const max = analytics.topDrugs[0]?.count || 1;
                return (
                  <div key={drug.name} className="flex items-center gap-3">
                    <span className="w-6 text-right text-[12px] text-muted-foreground/60 dark:text-white/30">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[14px] text-foreground dark:text-white">{drug.name}</span>
                        <span className="text-[14px] font-medium text-foreground dark:text-white">{drug.count}</span>
                      </div>
                      <div className="h-1.5 bg-muted dark:bg-card/10 rounded-full overflow-hidden">
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
        <div className="mt-4 bg-card dark:bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">Notes</h3>
          {provider.notes ? (
            <p className="mt-2 text-[14px] text-foreground/80 dark:text-white/80 whitespace-pre-wrap">
              {provider.notes}
            </p>
          ) : (
            <p className="mt-2 text-[14px] text-muted-foreground dark:text-white/48">No notes for this provider.</p>
          )}
          {provider.enrichedFromNppes && (
            <p className="mt-4 text-[12px] text-muted-foreground/60 dark:text-white/30">
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

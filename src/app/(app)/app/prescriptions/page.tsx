"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Upload, TrendingUp, TrendingDown, Minus, UserPlus, UserX } from "lucide-react";

interface DashboardData {
  totalRx: number;
  priorTotalRx: number;
  trend: { direction: string; percentChange: number };
  topPrescribers: Array<{ npi: string; name: string; count: number }>;
  concentrationRisk: { topN: number; percentOfTotal: number };
  activeProviders: number;
  days: number;
}

interface AlertData {
  newPrescribers: Array<{ npi: string; name: string; specialty: string | null }>;
  dormantPrescribers: Array<{ npi: string; name: string; specialty: string | null }>;
  newPrescriberNpis: string[];
}

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "UP") return <TrendingUp className="w-4 h-4 text-[#22C55E]" />;
  if (direction === "DOWN") return <TrendingDown className="w-4 h-4 text-[#EF4444]" />;
  return <Minus className="w-4 h-4 text-[#9CA3AF]" />;
};

const trendColor = (direction: string) => {
  if (direction === "UP") return "text-[#22C55E]";
  if (direction === "DOWN") return "text-[#EF4444]";
  return "text-[#9CA3AF]";
};

export default function PrescriptionsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [dashRes, alertRes] = await Promise.all([
        fetch(`/api/prescriptions/dashboard?days=${days}`),
        fetch("/api/prescriptions/alerts"),
      ]);

      if (dashRes.ok) setData(await dashRes.json());
      if (alertRes.ok) setAlerts(await alertRes.json());
      setLoading(false);
    };
    fetchData();
  }, [days]);

  if (loading) {
    return (
      <div>
        <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
          Prescriptions
        </h1>
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg p-5 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const hasData = data && data.totalRx > 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Prescriptions
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            Prescription analytics and insights
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="h-9 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <Link
            href="/app/prescriptions/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload CSV
          </Link>
        </div>
      </div>

      {!hasData ? (
        <div className="mt-8 bg-white rounded-xl p-12 text-center">
          <Upload className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
          <h2 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">No prescription data yet</h2>
          <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)] max-w-md mx-auto">
            Upload a CSV file with your prescription data to see analytics, trends, and insights.
          </p>
          <Link
            href="/app/prescriptions/upload"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071e3] text-white rounded-lg text-[17px] hover:bg-[#0077ED] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload prescriptions
          </Link>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-5">
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Total Rx ({days}d)
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
                Concentration risk
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
                New prescribers
              </p>
              <p className="text-[28px] font-normal leading-[1.14] text-[#1d1d1f] mt-1">
                {(alerts?.newPrescribers.length || 0) + (alerts?.newPrescriberNpis.length || 0)}
              </p>
              <p className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">Last 30 days</p>
            </div>
          </div>

          {/* Top prescribers */}
          <div className="mt-6 bg-white rounded-xl p-5">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Top prescribers</h2>
            <div className="mt-4 space-y-2">
              {data!.topPrescribers.map((p, i) => {
                const maxCount = data!.topPrescribers[0]?.count || 1;
                return (
                  <div key={p.npi} className="flex items-center gap-3">
                    <span className="w-6 text-[12px] text-[rgba(0,0,0,0.3)] text-right">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[14px] text-[#1d1d1f]">{p.name}</span>
                        <span className="text-[14px] font-medium text-[#1d1d1f]">{p.count}</span>
                      </div>
                      <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0071e3] rounded-full"
                          style={{ width: `${(p.count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          {alerts &&
            (alerts.newPrescribers.length > 0 || alerts.dormantPrescribers.length > 0) && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {alerts.newPrescribers.length > 0 && (
                  <div className="bg-white rounded-xl p-5">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-[#22C55E]" />
                      <h2 className="text-[17px] font-semibold text-[#1d1d1f]">New prescribers</h2>
                    </div>
                    <div className="mt-3 space-y-2">
                      {alerts.newPrescribers.slice(0, 5).map((p) => (
                        <div key={p.npi} className="text-[14px]">
                          <span className="text-[#1d1d1f]">{p.name}</span>
                          {p.specialty && (
                            <span className="text-[rgba(0,0,0,0.48)]"> &middot; {p.specialty}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {alerts.dormantPrescribers.length > 0 && (
                  <div className="bg-white rounded-xl p-5">
                    <div className="flex items-center gap-2">
                      <UserX className="w-4 h-4 text-[#EF4444]" />
                      <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                        Dormant prescribers
                      </h2>
                    </div>
                    <div className="mt-3 space-y-2">
                      {alerts.dormantPrescribers.slice(0, 5).map((p) => (
                        <div key={p.npi} className="text-[14px]">
                          <span className="text-[#1d1d1f]">{p.name}</span>
                          {p.specialty && (
                            <span className="text-[rgba(0,0,0,0.48)]"> &middot; {p.specialty}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
        </>
      )}
    </div>
  );
}

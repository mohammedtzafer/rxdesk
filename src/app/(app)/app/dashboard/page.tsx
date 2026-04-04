"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pill, Users, Briefcase, Clock, TrendingUp, TrendingDown, Minus, Upload, UserPlus, UserX, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "UP") return <TrendingUp className="w-4 h-4 text-[#22C55E]" />;
  if (direction === "DOWN") return <TrendingDown className="w-4 h-4 text-[#EF4444]" />;
  return <Minus className="w-4 h-4 text-[#9CA3AF]" />;
};

const trendColor = (d: string) =>
  d === "UP" ? "text-[#22C55E]" : d === "DOWN" ? "text-[#EF4444]" : "text-[#9CA3AF]";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<AlertData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/prescriptions/dashboard?days=90").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/prescriptions/alerts").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/notifications?unread=true&limit=1").then((r) => (r.ok ? r.json() : null)),
    ]).then(([d, a, n]) => {
      setData(d);
      setAlerts(a);
      setNotifications(n);
      setLoading(false);
    });
  }, []);

  const hasData = data && data.totalRx > 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Dashboard
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">Your pharmacy at a glance</p>
        </div>
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
              { label: "Active providers", value: String(data?.activeProviders || 0), sub: "In your directory" },
              { label: "Drug rep visits", value: "0", sub: "This month" },
              { label: "Notifications", value: String(notifications?.unreadCount || 0), sub: "Unread" },
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

          {/* Top prescribers + alerts row */}
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
                    <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Dormant prescribers</h2>
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

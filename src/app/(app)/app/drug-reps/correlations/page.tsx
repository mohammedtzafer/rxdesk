"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, Pill, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Correlation {
  visitId: string;
  visitDate: string;
  repName: string;
  company: string;
  providerId: string;
  preVisitVolume: number;
  postVisitVolume: number;
  volumeChange: number;
  percentChange: number;
  newDrugsAfterVisit: string[];
  brandShift: { preBrandPercent: number; postBrandPercent: number; shift: number } | null;
}

export default function CorrelationsPage() {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(180);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const res = await fetch(`/api/drug-reps/correlations?days=${days}`);
      if (res.ok) {
        const data = await res.json();
        setCorrelations(data.correlations || []);
      }
      setLoading(false);
    };
    fetchData();
  }, [days]);

  const significantCorrelations = correlations.filter(
    (c) => Math.abs(c.percentChange) > 10 || c.newDrugsAfterVisit.length > 0 || (c.brandShift && Math.abs(c.brandShift.shift) > 5)
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f] dark:text-white">
            Field rep visit correlations
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)] dark:text-white/48">
            Rx volume changes within 4 weeks of field rep visits to provider offices
          </p>
        </div>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))} className="h-9 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white">
          <option value={90}>90 days</option>
          <option value={180}>180 days</option>
          <option value={365}>1 year</option>
        </select>
      </div>

      {loading ? (
        <div className="mt-8 space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-lg p-5 h-24 animate-pulse" />)}
        </div>
      ) : significantCorrelations.length === 0 ? (
        <div className="mt-8 bg-white rounded-xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
          <h2 className="mt-4 text-[21px] font-bold text-[#1d1d1f] dark:text-white">No significant correlations</h2>
          <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)] dark:text-white/48 max-w-md mx-auto">
            Log field rep visits to provider offices and upload prescription data to see how visit activity correlates with prescription volume changes.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {significantCorrelations.map((c, i) => (
            <div key={`${c.visitId}-${c.providerId}-${i}`} className="bg-white rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[14px] font-medium text-[#1d1d1f]">
                    {c.repName} <span className="text-[rgba(0,0,0,0.48)]">({c.company})</span>
                  </p>
                  <p className="text-[12px] text-[rgba(0,0,0,0.48)]">
                    Visit on {new Date(c.visitDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {c.volumeChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-[#22C55E]" />
                  ) : c.volumeChange < 0 ? (
                    <TrendingDown className="w-4 h-4 text-[#EF4444]" />
                  ) : (
                    <Minus className="w-4 h-4 text-[#9CA3AF]" />
                  )}
                  <span className={`text-[14px] font-medium ${
                    c.volumeChange > 0 ? "text-[#22C55E]" : c.volumeChange < 0 ? "text-[#EF4444]" : "text-[#9CA3AF]"
                  }`}>
                    {c.percentChange > 0 ? "+" : ""}{c.percentChange}%
                  </span>
                </div>
              </div>

              <div className="mt-3 flex gap-6 text-[12px]">
                <div>
                  <span className="text-[rgba(0,0,0,0.48)]">Pre-visit (4 wks):</span>{" "}
                  <span className="font-medium text-[#1d1d1f]">{c.preVisitVolume} Rx</span>
                </div>
                <div>
                  <span className="text-[rgba(0,0,0,0.48)]">Post-visit (4 wks):</span>{" "}
                  <span className="font-medium text-[#1d1d1f]">{c.postVisitVolume} Rx</span>
                </div>
              </div>

              {c.newDrugsAfterVisit.length > 0 && (
                <div className="mt-2 flex items-center gap-1">
                  <Pill className="w-3 h-3 text-[#0071e3]" />
                  <span className="text-[12px] text-[#0071e3]">
                    New drug{c.newDrugsAfterVisit.length > 1 ? "s" : ""} after visit:
                  </span>
                  {c.newDrugsAfterVisit.map((d) => (
                    <Badge key={d} variant="secondary" className="text-[10px] px-1.5 py-0">{d}</Badge>
                  ))}
                </div>
              )}

              {c.brandShift && Math.abs(c.brandShift.shift) > 5 && (
                <p className="mt-1 text-[12px] text-[rgba(0,0,0,0.48)]">
                  Brand shift: {c.brandShift.preBrandPercent}% → {c.brandShift.postBrandPercent}% ({c.brandShift.shift > 0 ? "+" : ""}{c.brandShift.shift}%)
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

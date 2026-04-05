"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Briefcase, Calendar, Clock, Pill, Package, FileText, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RxByDrug {
  name: string;
  count: number;
  totalQty: number;
  isGeneric: boolean;
}

interface ProviderDetail {
  provider: {
    id: string;
    firstName: string;
    lastName: string;
    npi: string;
    specialty: string | null;
  };
  previousVisitDate: string | null;
  totalRxSinceLastVisit: number;
  rxByDrug: RxByDrug[];
}

interface VisitDetail {
  id: string;
  visitDate: string;
  durationMinutes: number | null;
  drugRep: { firstName: string; lastName: string; company: string };
  drugsPromoted: Array<{ name: string }>;
  samplesLeft: Array<{ name: string; quantity: number }>;
  notes: string | null;
  providerDetails: ProviderDetail[];
}

export default function DrugRepVisitDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [visit, setVisit] = useState<VisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchVisit = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/drug-reps/visits/${id}`);
        if (res.ok) {
          setVisit(await res.json());
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchVisit();
  }, [id]);

  const promotedDrugNames = new Set(
    (visit?.drugsPromoted ?? []).map((d) => d.name.toUpperCase())
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-5 w-32 bg-[rgba(0,0,0,0.06)] rounded" />
        <div className="h-36 bg-white rounded-xl" />
        <div className="h-48 bg-white rounded-xl" />
      </div>
    );
  }

  if (error || !visit) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Briefcase className="w-12 h-12 text-[rgba(0,0,0,0.15)] mb-4" />
        <h2 className="text-[21px] font-bold text-[#1d1d1f]">Visit not found</h2>
        <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
          This visit may have been deleted or the link is incorrect.
        </p>
        <Link
          href="/app/drug-reps"
          className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to visit log
        </Link>
      </div>
    );
  }

  const visitDate = new Date(visit.visitDate);
  const formattedDate = visitDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back link */}
      <Link
        href="/app/drug-reps"
        className="inline-flex items-center gap-1.5 text-[14px] text-[#0071e3] hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Visit log
      </Link>

      {/* Visit header card */}
      <div className="bg-white rounded-xl p-6 border border-[rgba(0,0,0,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#0071e3]/10 flex items-center justify-center shrink-0">
              <Briefcase className="w-6 h-6 text-[#0071e3]" />
            </div>
            <div>
              <h1 className="text-[28px] sm:text-[32px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
                {visit.drugRep.firstName} {visit.drugRep.lastName}
              </h1>
              <p className="mt-0.5 text-[17px] text-[rgba(0,0,0,0.48)]">{visit.drugRep.company}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-[14px] text-[rgba(0,0,0,0.56)] sm:text-right">
            <span className="flex items-center gap-1.5 sm:justify-end">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </span>
            {visit.durationMinutes && (
              <span className="flex items-center gap-1.5 sm:justify-end">
                <Clock className="w-4 h-4" />
                {visit.durationMinutes} minutes
              </span>
            )}
          </div>
        </div>

        {/* Drugs promoted */}
        {visit.drugsPromoted.length > 0 && (
          <div className="mt-5 pt-5 border-t border-[rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 mb-2">
              <Pill className="w-4 h-4 text-[rgba(0,0,0,0.48)]" />
              <span className="text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Drugs Promoted
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visit.drugsPromoted.map((drug, i) => (
                <Badge
                  key={i}
                  className="bg-[#0071e3]/10 text-[#0071e3] border-0 text-[13px] px-3 py-1 rounded-full font-medium"
                >
                  {drug.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Samples left */}
        {visit.samplesLeft.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-[rgba(0,0,0,0.48)]" />
              <span className="text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Samples Left
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {visit.samplesLeft.map((sample, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[13px]"
                >
                  <span className="font-medium text-[#1d1d1f]">{sample.name}</span>
                  <span className="text-[rgba(0,0,0,0.48)]">×{sample.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {visit.notes && (
          <div className="mt-4 pt-4 border-t border-[rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-[rgba(0,0,0,0.48)]" />
              <span className="text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                Notes
              </span>
            </div>
            <p className="text-[14px] text-[#1d1d1f] leading-relaxed whitespace-pre-line">
              {visit.notes}
            </p>
          </div>
        )}
      </div>

      {/* Per-provider sections */}
      {visit.providerDetails.length > 0 && (
        <div>
          <h2 className="text-[21px] font-semibold text-[#1d1d1f] mb-3">
            Referral impact — Rx since this visit
          </h2>
          <div className="space-y-4">
            {visit.providerDetails.map((pd) => {
              const sinceLabel = pd.previousVisitDate
                ? `Since last visit on ${new Date(pd.previousVisitDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "Last 90 days (no prior visit)";

              return (
                <div
                  key={pd.provider.id}
                  className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] overflow-hidden"
                >
                  {/* Provider header */}
                  <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[rgba(0,0,0,0.06)] flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-[rgba(0,0,0,0.32)]" />
                      </div>
                      <div>
                        <Link
                          href={`/app/providers/${pd.provider.id}`}
                          className="text-[16px] font-semibold text-[#0071e3] hover:underline"
                        >
                          Dr. {pd.provider.firstName} {pd.provider.lastName}
                        </Link>
                        <p className="text-[13px] text-[rgba(0,0,0,0.48)] mt-0.5">
                          {pd.provider.specialty || "Unknown Specialty"}
                          <span className="mx-1.5">·</span>
                          NPI {pd.provider.npi}
                        </p>
                        <p className="text-[12px] text-[rgba(0,0,0,0.40)] mt-0.5">{sinceLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end shrink-0">
                      <span className="text-[40px] font-bold text-[#1d1d1f] leading-none">
                        {pd.totalRxSinceLastVisit}
                      </span>
                      <span className="text-[12px] text-[rgba(0,0,0,0.48)] mt-1">total Rx filled</span>
                    </div>
                  </div>

                  {/* Drug breakdown table */}
                  {pd.rxByDrug.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px]">
                        <thead>
                          <tr className="border-b border-[rgba(0,0,0,0.04)]">
                            <th className="text-left px-5 py-2.5 text-[11px] font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wide">
                              Drug
                            </th>
                            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wide">
                              Fills
                            </th>
                            <th className="text-right px-5 py-2.5 text-[11px] font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wide">
                              Total Qty
                            </th>
                            <th className="px-5 py-2.5 text-[11px] font-semibold text-[rgba(0,0,0,0.40)] uppercase tracking-wide">
                              Type
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pd.rxByDrug.map((drug, i) => {
                            const isPromoted = promotedDrugNames.has(drug.name.toUpperCase());
                            return (
                              <tr
                                key={i}
                                className={`border-b border-[rgba(0,0,0,0.03)] last:border-0 transition-colors ${
                                  isPromoted
                                    ? "bg-[#0071e3]/[0.04] hover:bg-[#0071e3]/[0.07]"
                                    : "hover:bg-[#f5f5f7]"
                                }`}
                              >
                                <td className="px-5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-medium text-[#1d1d1f]">
                                      {drug.name}
                                    </span>
                                    {isPromoted && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#0071e3]/10 text-[#0071e3] rounded text-[10px] font-medium">
                                        <Pill className="w-2.5 h-2.5" />
                                        Promoted
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-5 py-2.5 text-right text-[14px] font-semibold text-[#1d1d1f]">
                                  {drug.count.toLocaleString()}
                                </td>
                                <td className="px-5 py-2.5 text-right text-[14px] text-[rgba(0,0,0,0.56)]">
                                  {drug.totalQty.toLocaleString()}
                                </td>
                                <td className="px-5 py-2.5">
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                                      drug.isGeneric
                                        ? "bg-[#22C55E]/10 text-[#16A34A]"
                                        : "bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.56)]"
                                    }`}
                                  >
                                    {drug.isGeneric ? "Generic" : "Brand"}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="px-5 py-6 text-center text-[14px] text-[rgba(0,0,0,0.40)]">
                      No prescription data available for this period
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {visit.providerDetails.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center border border-[rgba(0,0,0,0.06)]">
          <User className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
          <h3 className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">No providers linked</h3>
          <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)]">
            No providers were associated with this visit.
          </p>
        </div>
      )}
    </div>
  );
}

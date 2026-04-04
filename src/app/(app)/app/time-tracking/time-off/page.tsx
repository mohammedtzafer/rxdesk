"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PtoRequest {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  type: string;
  note: string | null;
  status: string;
  responseNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-[#0071e3]/10 text-[#0071e3]",
  APPROVED: "bg-[#22C55E]/10 text-[#22C55E]",
  DENIED: "bg-[#EF4444]/10 text-[#EF4444]",
};

const typeLabels: Record<string, string> = {
  VACATION: "Vacation",
  SICK: "Sick",
  PERSONAL: "Personal",
  OTHER: "Other",
};

export default function TimeOffPage() {
  const [requests, setRequests] = useState<PtoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("all");
  const [confirmDenyId, setConfirmDenyId] = useState<string | null>(null);

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    type: "VACATION" as string,
    note: "",
  });

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter !== "all") params.set("status", filter);
    const res = await fetch(`/api/pto?${params}`);
    if (res.ok) setRequests(await res.json());
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/pto", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success("Time off request submitted");
      setShowCreate(false);
      setForm({ startDate: "", endDate: "", type: "VACATION", note: "" });
      fetchRequests();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to submit request");
    }
  };

  const handleReview = async (id: string, action: "approve" | "deny") => {
    const res = await fetch(`/api/pto/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success(action === "approve" ? "Request approved" : "Request denied");
      fetchRequests();
    } else {
      toast.error("Failed to review request");
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Time off
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            Request and manage time off
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
        >
          <Plus className="w-4 h-4" /> Request time off
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-1 bg-white rounded-lg p-1 w-fit">
        {["all", "PENDING", "APPROVED", "DENIED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-md text-[14px] transition-colors ${
              filter === f ? "bg-[#0071e3] text-white" : "text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f]"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Requests list */}
      <div className="mt-4 bg-white rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-32 h-4 bg-[rgba(0,0,0,0.06)] rounded animate-pulse" />
                <div className="w-24 h-4 bg-[rgba(0,0,0,0.04)] rounded animate-pulse" />
                <div className="flex-1" />
                <div className="w-12 h-4 bg-[rgba(0,0,0,0.04)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
            <h3 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">No time off requests</h3>
            <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">
              Submit a request when you need time off.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.03)]">
            {requests.map((req) => (
              <div key={req.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      {new Date(req.startDate).toLocaleDateString()} –{" "}
                      {new Date(req.endDate).toLocaleDateString()}
                    </p>
                    <Badge variant="secondary" className="text-[10px]">
                      {typeLabels[req.type] || req.type}
                    </Badge>
                    <span
                      className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        statusColors[req.status] || ""
                      }`}
                    >
                      {req.status.charAt(0) + req.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  {req.note && (
                    <p className="mt-0.5 text-[12px] text-[rgba(0,0,0,0.48)]">{req.note}</p>
                  )}
                  {req.responseNote && (
                    <p className="mt-0.5 text-[12px] text-[rgba(0,0,0,0.48)]">
                      Response: {req.responseNote}
                    </p>
                  )}
                </div>
                {req.status === "PENDING" && (
                  <div className="flex gap-1 shrink-0 items-center">
                    <button
                      onClick={() => handleReview(req.id, "approve")}
                      aria-label="Approve request"
                      className="p-2 rounded-lg bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    {confirmDenyId === req.id ? (
                      <button
                        onClick={() => { handleReview(req.id, "deny"); setConfirmDenyId(null); }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#EF4444] text-white text-[12px] transition-colors"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDenyId(req.id)}
                        className="p-2 rounded-lg bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors"
                        aria-label="Deny request"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[21px] font-bold text-[#1d1d1f] mb-4">Request time off</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[rgba(0,0,0,0.48)] mb-1">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full h-11 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-[rgba(0,0,0,0.48)] mb-1">
                    End date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full h-11 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[rgba(0,0,0,0.48)] mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full h-11 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                >
                  <option value="VACATION">Vacation</option>
                  <option value="SICK">Sick</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[rgba(0,0,0,0.48)] mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[14px] h-16 resize-none focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 h-10 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[14px] hover:bg-[#f5f5f7] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
                >
                  Submit request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

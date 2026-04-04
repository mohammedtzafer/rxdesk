"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Briefcase, Calendar, Users, X } from "lucide-react";
import { toast } from "sonner";

interface DrugRep {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string | null;
  phone: string | null;
  territory: string | null;
  _count: { visits: number };
}

interface Visit {
  id: string;
  visitDate: string;
  durationMinutes: number | null;
  drugsPromoted: Array<{ name: string }>;
  notes: string | null;
  drugRep: { id: string; firstName: string; lastName: string; company: string };
  providers: Array<{ provider: { id: string; firstName: string; lastName: string } }>;
}

export default function DrugRepsPage() {
  const [reps, setReps] = useState<DrugRep[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddRep, setShowAddRep] = useState(false);
  const [showLogVisit, setShowLogVisit] = useState(false);
  const [tab, setTab] = useState<"reps" | "visits">("reps");

  // Add rep form
  const [newRep, setNewRep] = useState({ firstName: "", lastName: "", company: "", email: "", phone: "", territory: "" });

  // Log visit form
  const [visitForm, setVisitForm] = useState({ drugRepId: "", visitDate: new Date().toISOString().split("T")[0], durationMinutes: "", notes: "" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const [repsRes, visitsRes] = await Promise.all([
        fetch(`/api/drug-reps?${params}`),
        fetch("/api/drug-reps/visits?limit=20"),
      ]);

      if (repsRes.ok) setReps(await repsRes.json());
      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setVisits(data.visits || []);
      }
      setLoading(false);
    };

    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleAddRep = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/drug-reps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRep),
    });
    if (res.ok) {
      toast.success("Drug rep added");
      setShowAddRep(false);
      setNewRep({ firstName: "", lastName: "", company: "", email: "", phone: "", territory: "" });
      // Refresh
      const r = await fetch("/api/drug-reps");
      if (r.ok) setReps(await r.json());
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to add rep");
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/drug-reps/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...visitForm,
        durationMinutes: visitForm.durationMinutes ? parseInt(visitForm.durationMinutes) : undefined,
      }),
    });
    if (res.ok) {
      toast.success("Visit logged");
      setShowLogVisit(false);
      setVisitForm({ drugRepId: "", visitDate: new Date().toISOString().split("T")[0], durationMinutes: "", notes: "" });
      const r = await fetch("/api/drug-reps/visits?limit=20");
      if (r.ok) { const d = await r.json(); setVisits(d.visits || []); }
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to log visit");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">Drug reps</h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">Track pharmaceutical rep visits and activity</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLogVisit(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors">
            <Calendar className="w-4 h-4" /> Log visit
          </button>
          <button onClick={() => setShowAddRep(true)} className="inline-flex items-center gap-2 px-4 py-2.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[14px] hover:bg-white transition-colors">
            <Plus className="w-4 h-4" /> Add rep
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 bg-white rounded-lg p-1 w-fit">
        <button onClick={() => setTab("reps")} className={`px-4 py-1.5 rounded-md text-[14px] transition-colors ${tab === "reps" ? "bg-[#0071e3] text-white" : "text-[rgba(0,0,0,0.48)]"}`}>
          Reps ({reps.length})
        </button>
        <button onClick={() => setTab("visits")} className={`px-4 py-1.5 rounded-md text-[14px] transition-colors ${tab === "visits" ? "bg-[#0071e3] text-white" : "text-[rgba(0,0,0,0.48)]"}`}>
          Recent visits ({visits.length})
        </button>
      </div>

      {tab === "reps" && (
        <>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,0,0,0.3)]" />
            <Input placeholder="Search by name or company..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-11 bg-white" />
          </div>

          <div className="mt-4 bg-white rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-[rgba(0,0,0,0.48)]">Loading...</div>
            ) : reps.length === 0 ? (
              <div className="p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
                <h2 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">No drug reps yet</h2>
                <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">Add a drug rep to start tracking visits.</p>
              </div>
            ) : (
              <div className="divide-y divide-[rgba(0,0,0,0.03)]">
                {reps.map((rep) => (
                  <div key={rep.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#f5f5f7] transition-colors">
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">{rep.lastName}, {rep.firstName}</p>
                      <p className="text-[12px] text-[rgba(0,0,0,0.48)]">{rep.company}{rep.territory ? ` · ${rep.territory}` : ""}</p>
                    </div>
                    <Badge variant="secondary" className="text-[12px]">{rep._count.visits} visit{rep._count.visits !== 1 ? "s" : ""}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "visits" && (
        <div className="mt-4 bg-white rounded-xl overflow-hidden">
          {visits.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.15)]" />
              <h2 className="mt-4 text-[21px] font-bold text-[#1d1d1f]">No visits logged</h2>
              <p className="mt-2 text-[17px] text-[rgba(0,0,0,0.48)]">Log your first drug rep visit to start tracking.</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(0,0,0,0.03)]">
              {visits.map((v) => (
                <div key={v.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">
                      {v.drugRep.firstName} {v.drugRep.lastName} <span className="text-[rgba(0,0,0,0.48)]">({v.drugRep.company})</span>
                    </p>
                    <p className="text-[12px] text-[rgba(0,0,0,0.48)]">{new Date(v.visitDate).toLocaleDateString()}</p>
                  </div>
                  {v.providers.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[12px] text-[rgba(0,0,0,0.48)]">
                      <Users className="w-3 h-3" />
                      {v.providers.map((p) => `${p.provider.firstName} ${p.provider.lastName}`).join(", ")}
                    </div>
                  )}
                  {(v.drugsPromoted as Array<{ name: string }>).length > 0 && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {(v.drugsPromoted as Array<{ name: string }>).map((d, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{d.name}</Badge>
                      ))}
                    </div>
                  )}
                  {v.notes && <p className="mt-1 text-[12px] text-[rgba(0,0,0,0.48)]">{v.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Rep Modal */}
      {showAddRep && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddRep(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[21px] font-bold text-[#1d1d1f]">Add drug rep</h2>
              <button onClick={() => setShowAddRep(false)} className="text-[rgba(0,0,0,0.48)]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddRep} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-[12px]">First name</Label><Input value={newRep.firstName} onChange={(e) => setNewRep({ ...newRep, firstName: e.target.value })} required className="h-9" /></div>
                <div><Label className="text-[12px]">Last name</Label><Input value={newRep.lastName} onChange={(e) => setNewRep({ ...newRep, lastName: e.target.value })} required className="h-9" /></div>
              </div>
              <div><Label className="text-[12px]">Company</Label><Input value={newRep.company} onChange={(e) => setNewRep({ ...newRep, company: e.target.value })} required className="h-9" placeholder="Pfizer, Merck, etc." /></div>
              <div><Label className="text-[12px]">Email</Label><Input type="email" value={newRep.email} onChange={(e) => setNewRep({ ...newRep, email: e.target.value })} className="h-9" /></div>
              <div><Label className="text-[12px]">Phone</Label><Input value={newRep.phone} onChange={(e) => setNewRep({ ...newRep, phone: e.target.value })} className="h-9" /></div>
              <div><Label className="text-[12px]">Territory</Label><Input value={newRep.territory} onChange={(e) => setNewRep({ ...newRep, territory: e.target.value })} className="h-9" /></div>
              <button type="submit" className="w-full h-10 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED]">Add rep</button>
            </form>
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {showLogVisit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowLogVisit(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[21px] font-bold text-[#1d1d1f]">Log visit</h2>
              <button onClick={() => setShowLogVisit(false)} className="text-[rgba(0,0,0,0.48)]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLogVisit} className="space-y-3">
              <div>
                <Label className="text-[12px]">Drug rep</Label>
                <select value={visitForm.drugRepId} onChange={(e) => setVisitForm({ ...visitForm, drugRepId: e.target.value })} required className="w-full h-9 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white">
                  <option value="">Select a rep...</option>
                  {reps.map((r) => (
                    <option key={r.id} value={r.id}>{r.lastName}, {r.firstName} ({r.company})</option>
                  ))}
                </select>
              </div>
              <div><Label className="text-[12px]">Visit date</Label><Input type="date" value={visitForm.visitDate} onChange={(e) => setVisitForm({ ...visitForm, visitDate: e.target.value })} required className="h-9" /></div>
              <div><Label className="text-[12px]">Duration (minutes)</Label><Input type="number" value={visitForm.durationMinutes} onChange={(e) => setVisitForm({ ...visitForm, durationMinutes: e.target.value })} className="h-9" placeholder="30" /></div>
              <div><Label className="text-[12px]">Notes</Label><textarea value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} className="w-full rounded-lg border border-[rgba(0,0,0,0.08)] px-3 py-2 text-[14px] h-20 resize-none" placeholder="Drugs discussed, samples left, etc." /></div>
              <button type="submit" className="w-full h-10 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED]">Log visit</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

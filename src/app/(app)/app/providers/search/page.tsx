"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface NppesResult {
  npi: string;
  firstName: string;
  lastName: string;
  suffix: string;
  credential: string;
  specialty: string;
  practiceName: string;
  practiceAddress: string;
  practiceCity: string;
  practiceState: string;
  practiceZip: string;
  practicePhone: string;
}

export default function NppesSearchPage() {
  const [npi, setNpi] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [state, setState] = useState("");
  const [results, setResults] = useState<NppesResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedNpis, setAddedNpis] = useState<Set<string>>(new Set());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    const params = new URLSearchParams();
    if (npi) params.set("npi", npi);
    if (firstName) params.set("firstName", firstName);
    if (lastName) params.set("lastName", lastName);
    if (state) params.set("state", state);

    try {
      const res = await fetch(`/api/providers/search-nppes?${params}`);
      const data = await res.json();

      if (res.ok) {
        setResults(data.results || []);
        if (data.results?.length === 0) {
          toast.info("No results found");
        }
      } else {
        toast.error(data.error || "Search failed");
      }
    } catch {
      toast.error("Failed to search");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (result: NppesResult) => {
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...result,
          enrichedFromNppes: true,
        }),
      });

      if (res.ok) {
        setAddedNpis(new Set([...addedNpis, result.npi]));
        toast.success(`Added ${result.firstName} ${result.lastName}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add provider");
      }
    } catch {
      toast.error("Failed to add provider");
    }
  };

  return (
    <div>
      <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
        Search NPI registry
      </h1>
      <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
        Find and import providers from the national NPI database.
      </p>

      <div className="mt-6 bg-white rounded-xl p-6">
        <form
          onSubmit={handleSearch}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="space-y-1.5">
            <Label className="text-[14px]">NPI number</Label>
            <Input
              value={npi}
              onChange={(e) => setNpi(e.target.value)}
              placeholder="1234567890"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[14px]">Last name</Label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[14px]">First name</Label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[14px]">State</Label>
            <Input
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="NY"
              maxLength={2}
              className="h-10"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={loading || (!npi && !lastName && !firstName)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? "Searching..." : "Search registry"}
            </button>
          </div>
        </form>
      </div>

      {results.length > 0 && (
        <div className="mt-6 bg-white rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
            <p className="text-[14px] font-semibold text-[#1d1d1f]">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-[rgba(0,0,0,0.03)]">
            {results.map((r) => (
              <div
                key={r.npi}
                className="px-4 py-3 flex items-center justify-between hover:bg-[#f5f5f7] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-[#1d1d1f]">
                    {r.lastName}, {r.firstName} {r.suffix}{" "}
                    {r.credential && (
                      <span className="text-[rgba(0,0,0,0.48)]">{r.credential}</span>
                    )}
                  </p>
                  <p className="text-[12px] text-[rgba(0,0,0,0.48)]">
                    NPI {r.npi} &middot; {r.specialty || "No specialty"} &middot;{" "}
                    {r.practiceCity}, {r.practiceState}
                  </p>
                </div>
                <button
                  onClick={() => handleAdd(r)}
                  disabled={addedNpis.has(r.npi)}
                  className={`shrink-0 ml-3 inline-flex items-center gap-1 px-4 py-2.5 rounded-lg text-[13px] transition-colors ${
                    addedNpis.has(r.npi)
                      ? "bg-[#22C55E]/10 text-[#22C55E]"
                      : "bg-[#0071e3] text-white hover:bg-[#0077ED]"
                  }`}
                >
                  {addedNpis.has(r.npi) ? (
                    <>
                      <Check className="w-3 h-3" /> Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" /> Add provider
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

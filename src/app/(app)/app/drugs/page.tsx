"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Pill, ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/error-state";

interface Drug {
  rxcui: string;
  name: string;
  form?: string;
  type?: string;
}

interface DrugDetail {
  rxcui: string;
  name: string;
  brandName: string | null;
  genericName: string | null;
  ndc: string[] | null;
  dosageForm: string | null;
  route: string | null;
  strength: string | null;
  interactions?: Array<{
    drug: string;
    severity: string;
    description: string;
  }>;
}

export default function DrugSearchPage() {
  const [query, setQuery] = useState("");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);

  const [selectedDrug, setSelectedDrug] = useState<DrugDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchDrugs = async (q: string) => {
    if (q.length < 2) {
      setDrugs([]);
      setSuggestions([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(false);
    setSearched(true);
    try {
      const res = await fetch(
        `/api/drugs/search?q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDrugs(data.drugs || []);
      setSuggestions(data.suggestions || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (query.length >= 2) searchDrugs(query);
      else {
        setDrugs([]);
        setSuggestions([]);
        setSearched(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const fetchDrugDetail = async (rxcui: string) => {
    setDetailLoading(true);
    setDetailError(false);
    try {
      const res = await fetch(`/api/drugs/${rxcui}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedDrug(data);
    } catch {
      setDetailError(true);
    } finally {
      setDetailLoading(false);
    }
  };

  if (selectedDrug || detailLoading || detailError) {
    return (
      <div>
        <button
          onClick={() => {
            setSelectedDrug(null);
            setDetailError(false);
          }}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#0071e3] hover:text-[#0077ED] transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to search
        </button>

        {detailLoading ? (
          <div className="bg-white rounded-xl p-8 animate-pulse">
            <div className="h-6 w-64 bg-[#f5f5f7] rounded" />
            <div className="mt-4 h-4 w-48 bg-[#f5f5f7] rounded" />
            <div className="mt-8 space-y-3">
              <div className="h-4 w-full bg-[#f5f5f7] rounded" />
              <div className="h-4 w-3/4 bg-[#f5f5f7] rounded" />
            </div>
          </div>
        ) : detailError ? (
          <ErrorState
            message="Failed to load drug details from RxNorm."
            onRetry={() =>
              selectedDrug
                ? fetchDrugDetail(selectedDrug.rxcui)
                : setDetailError(false)
            }
          />
        ) : selectedDrug ? (
          <div>
            <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
              {selectedDrug.name}
            </h1>
            {selectedDrug.genericName && (
              <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
                Generic: {selectedDrug.genericName}
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDrug.brandName && (
                <div className="bg-white rounded-xl p-4">
                  <p className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                    Brand name
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-[#1d1d1f]">
                    {selectedDrug.brandName}
                  </p>
                </div>
              )}
              {selectedDrug.dosageForm && (
                <div className="bg-white rounded-xl p-4">
                  <p className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                    Dosage form
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-[#1d1d1f]">
                    {selectedDrug.dosageForm}
                  </p>
                </div>
              )}
              {selectedDrug.route && (
                <div className="bg-white rounded-xl p-4">
                  <p className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                    Route
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-[#1d1d1f]">
                    {selectedDrug.route}
                  </p>
                </div>
              )}
              {selectedDrug.strength && (
                <div className="bg-white rounded-xl p-4">
                  <p className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                    Strength
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-[#1d1d1f]">
                    {selectedDrug.strength}
                  </p>
                </div>
              )}
              <div className="bg-white rounded-xl p-4">
                <p className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                  RxCUI
                </p>
                <p className="mt-1 text-[15px] font-mono text-[#1d1d1f]">
                  {selectedDrug.rxcui}
                </p>
              </div>
            </div>

            {/* NDC codes */}
            {selectedDrug.ndc && selectedDrug.ndc.length > 0 && (
              <div className="mt-6">
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                  NDC codes
                </h2>
                <div className="mt-3 bg-white rounded-xl p-4">
                  <div className="flex flex-wrap gap-2">
                    {selectedDrug.ndc.map((ndc) => (
                      <span
                        key={ndc}
                        className="px-2.5 py-1 bg-[#f5f5f7] rounded-md text-[13px] font-mono text-[#1d1d1f]"
                      >
                        {ndc}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Interactions */}
            {selectedDrug.interactions &&
              selectedDrug.interactions.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                    Drug interactions
                  </h2>
                  <div className="mt-3 space-y-2">
                    {selectedDrug.interactions.map((interaction, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-xl p-4 border border-[rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              interaction.severity === "high"
                                ? "text-[#FF3B30]"
                                : interaction.severity === "moderate"
                                ? "text-[#FF9500]"
                                : "text-[#8E8E93]"
                            }`}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-medium text-[#1d1d1f]">
                                {interaction.drug}
                              </p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  interaction.severity === "high"
                                    ? "bg-[#FF3B30]/10 text-[#FF3B30]"
                                    : interaction.severity === "moderate"
                                    ? "bg-[#FF9500]/10 text-[#FF9500]"
                                    : "bg-[#8E8E93]/10 text-[#8E8E93]"
                                }`}
                              >
                                {interaction.severity}
                              </span>
                            </div>
                            <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.48)]">
                              {interaction.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
          Drug search
        </h1>
        <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
          Search the RxNorm database for drug information
        </p>
      </div>

      <div className="mt-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(0,0,0,0.32)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drugs by name (e.g., lisinopril, metformin)..."
            className="pl-11 h-12 text-[16px]"
            autoFocus
          />
          {loading && (
            <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,0,0,0.32)] animate-spin" />
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState
            message="Failed to search RxNorm database."
            onRetry={() => searchDrugs(query)}
          />
        </div>
      )}

      {/* Spelling suggestions */}
      {!loading &&
        searched &&
        drugs.length === 0 &&
        suggestions.length > 0 && (
          <div className="mt-6 bg-white rounded-xl p-6">
            <p className="text-[14px] text-[rgba(0,0,0,0.48)]">
              No results found. Did you mean:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1.5 bg-[#0071e3]/10 text-[#0071e3] rounded-lg text-[14px] hover:bg-[#0071e3]/20 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* No results */}
      {!loading &&
        searched &&
        drugs.length === 0 &&
        suggestions.length === 0 &&
        !error && (
          <div className="mt-12 bg-white rounded-xl p-12 text-center">
            <Pill className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.24)]" />
            <h3 className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">
              No drugs found
            </h3>
            <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)]">
              Try a different spelling or search term.
            </p>
          </div>
        )}

      {/* Search results */}
      {drugs.length > 0 && (
        <div className="mt-6 space-y-2">
          {drugs.map((drug) => (
            <button
              key={drug.rxcui}
              onClick={() => fetchDrugDetail(drug.rxcui)}
              className="w-full text-left bg-white rounded-xl p-4 border border-[rgba(0,0,0,0.04)] hover:border-[#0071e3]/30 hover:bg-[#0071e3]/[0.02] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#1d1d1f] truncate">
                    {drug.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {drug.form && (
                      <span className="text-[12px] text-[rgba(0,0,0,0.48)]">
                        {drug.form}
                      </span>
                    )}
                    {drug.type && (
                      <span className="px-1.5 py-0.5 bg-[#f5f5f7] rounded text-[11px] text-[rgba(0,0,0,0.48)]">
                        {drug.type}
                      </span>
                    )}
                    <span className="text-[11px] text-[rgba(0,0,0,0.32)] font-mono">
                      RxCUI: {drug.rxcui}
                    </span>
                  </div>
                </div>
                <Search className="w-4 h-4 text-[rgba(0,0,0,0.24)] shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Initial empty state */}
      {!searched && !loading && (
        <div className="mt-12 bg-white rounded-xl p-12 text-center">
          <Search className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.24)]" />
          <h3 className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">
            Search for a drug
          </h3>
          <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)] max-w-md mx-auto">
            Type at least 2 characters to search the RxNorm database. You can
            find NDC codes, interactions, and detailed drug information.
          </p>
        </div>
      )}
    </div>
  );
}

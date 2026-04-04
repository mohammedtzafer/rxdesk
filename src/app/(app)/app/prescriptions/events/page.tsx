"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { ErrorState } from "@/components/error-state";

interface PrescriptionEvent {
  id: string;
  eventType: string;
  drugName: string;
  drugNdc: string | null;
  providerNpi: string | null;
  providerName: string | null;
  quantity: number | null;
  fillDate: string | null;
  readyAt: string | null;
  pickedUpAt: string | null;
  payerName: string | null;
  copay: number | null;
  source: string;
  createdAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
}

interface Location {
  id: string;
  name: string;
}

const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  RX_NEW: { label: "New Rx", color: "#007AFF", bg: "#007AFF/10" },
  RX_FILLED: { label: "Filled", color: "#34C759", bg: "#34C759/10" },
  RX_READY: { label: "Ready", color: "#5856D6", bg: "#5856D6/10" },
  RX_PICKED_UP: { label: "Picked up", color: "#30D158", bg: "#30D158/10" },
  RX_TRANSFERRED: { label: "Transferred", color: "#FF9500", bg: "#FF9500/10" },
  RX_REFILL_DUE: { label: "Refill due", color: "#FF3B30", bg: "#FF3B30/10" },
  RX_CANCELLED: { label: "Cancelled", color: "#8E8E93", bg: "#8E8E93/10" },
  RX_ON_HOLD: { label: "On hold", color: "#FF9500", bg: "#FF9500/10" },
  RX_PARTIAL_FILL: {
    label: "Partial fill",
    color: "#AF52DE",
    bg: "#AF52DE/10",
  },
  RX_RETURNED: { label: "Returned", color: "#FF3B30", bg: "#FF3B30/10" },
};

const EVENT_TYPES = Object.keys(EVENT_TYPE_CONFIG);

export default function PrescriptionEventsPage() {
  const [events, setEvents] = useState<PrescriptionEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (eventTypeFilter) params.set("eventType", eventTypeFilter);
      if (locationFilter) params.set("locationId", locationFilter);
      const res = await fetch(`/api/integrations/events?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents(data.events);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, eventTypeFilter, locationFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchEvents(true), 30000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const getEventConfig = (type: string) =>
    EVENT_TYPE_CONFIG[type] || { label: type, color: "#8E8E93", bg: "#8E8E93/10" };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (error) return <ErrorState onRetry={() => fetchEvents()} />;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Prescription events
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            {total} event{total !== 1 ? "s" : ""} from connected systems
          </p>
        </div>
        <button
          onClick={() => fetchEvents(true)}
          disabled={refreshing}
          className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[14px] hover:bg-white transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <select
          value={eventTypeFilter}
          onChange={(e) => {
            setEventTypeFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 border border-[rgba(0,0,0,0.08)] rounded-lg text-[14px] bg-white"
        >
          <option value="">All event types</option>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPE_CONFIG[type].label}
            </option>
          ))}
        </select>

        {locations.length > 1 && (
          <select
            value={locationFilter}
            onChange={(e) => {
              setLocationFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 border border-[rgba(0,0,0,0.08)] rounded-lg text-[14px] bg-white"
          >
            <option value="">All locations</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-16 h-6 bg-[#f5f5f7] rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-40 bg-[#f5f5f7] rounded" />
                  <div className="mt-2 h-3 w-64 bg-[#f5f5f7] rounded" />
                </div>
                <div className="h-3 w-16 bg-[#f5f5f7] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-12 bg-white rounded-xl p-12 text-center">
          <Activity className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.24)]" />
          <h3 className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">
            No prescription events yet
          </h3>
          <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)] max-w-md mx-auto">
            Events appear here when your PMS sends prescription data via the
            webhook integration. Connect a PMS in Settings to get started.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 space-y-2">
            {events.map((event) => {
              const config = getEventConfig(event.eventType);
              return (
                <div
                  key={event.id}
                  className="bg-white rounded-xl p-4 border border-[rgba(0,0,0,0.04)] hover:border-[rgba(0,0,0,0.08)] transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold w-fit"
                      style={{
                        backgroundColor: `${config.color}14`,
                        color: config.color,
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      {config.label}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#1d1d1f] truncate">
                        {event.drugName}
                        {event.quantity && (
                          <span className="text-[rgba(0,0,0,0.48)] font-normal">
                            {" "}
                            &middot; Qty {event.quantity}
                          </span>
                        )}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[12px] text-[rgba(0,0,0,0.48)]">
                        {event.patient && (
                          <span>
                            {event.patient.firstName} {event.patient.lastName}
                          </span>
                        )}
                        {event.providerName && (
                          <span>{event.providerName}</span>
                        )}
                        {event.payerName && <span>{event.payerName}</span>}
                        {event.copay !== null && (
                          <span>Copay ${event.copay.toFixed(2)}</span>
                        )}
                        <span className="text-[rgba(0,0,0,0.32)]">
                          via {event.source.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    <span className="text-[12px] text-[rgba(0,0,0,0.32)] whitespace-nowrap shrink-0">
                      {formatTime(event.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[13px] text-[rgba(0,0,0,0.48)]">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-[#f5f5f7] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-[#f5f5f7] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

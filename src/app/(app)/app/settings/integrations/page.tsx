"use client";

import { useState, useEffect, useCallback } from "react";
import { Plug, Plus, RefreshCw, Copy, Check, Wifi, WifiOff, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/error-state";

interface PmsConnection {
  id: string;
  locationId: string;
  pmsType: string;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  syncStatus: string | null;
  createdAt: string;
  location: { name: string };
}

interface Location {
  id: string;
  name: string;
}

const PMS_TYPES = [
  { value: "PIONEER_RX", label: "PioneerRx" },
  { value: "LIBERTY", label: "Liberty" },
  { value: "PRIME_RX", label: "PrimeRx" },
  { value: "QS1", label: "QS/1" },
  { value: "RX30", label: "Rx30" },
  { value: "COMPUTER_RX", label: "Computer-Rx" },
  { value: "BEST_RX", label: "BestRx" },
  { value: "DATASCAN", label: "DataScan" },
  { value: "CSV_IMPORT", label: "CSV Import" },
  { value: "OTHER", label: "Other" },
];

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<PmsConnection[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newConnection, setNewConnection] = useState<{
    webhookUrl: string;
    webhookSecret: string;
  } | null>(null);

  const [form, setForm] = useState({
    locationId: "",
    pmsType: "PIONEER_RX",
    name: "",
    apiUrl: "",
    apiKey: "",
    apiSecret: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [connRes, locRes] = await Promise.all([
        fetch("/api/integrations/connections"),
        fetch("/api/locations"),
      ]);
      if (!connRes.ok || !locRes.ok) throw new Error();
      const connData = await connRes.json();
      const locData = await locRes.json();
      setConnections(connData);
      setLocations(locData);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const body: Record<string, string> = {
        locationId: form.locationId,
        pmsType: form.pmsType,
        name: form.name,
      };
      if (form.apiUrl) body.apiUrl = form.apiUrl;
      if (form.apiKey) body.apiKey = form.apiKey;
      if (form.apiSecret) body.apiSecret = form.apiSecret;

      const res = await fetch("/api/integrations/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Failed to create connection");
        return;
      }
      const data = await res.json();
      setNewConnection({
        webhookUrl: data.webhookUrl,
        webhookSecret: data.webhookSecret,
      });
      fetchData();
    } catch {
      setCreateError("Failed to create connection");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const closeModal = () => {
    setShowModal(false);
    setNewConnection(null);
    setCreateError("");
    setForm({
      locationId: locations[0]?.id || "",
      pmsType: "PIONEER_RX",
      name: "",
      apiUrl: "",
      apiKey: "",
      apiSecret: "",
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Integrations
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            Connect your pharmacy management system
          </p>
        </div>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, locationId: locations[0]?.id || "" }));
            setShowModal(true);
          }}
          className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add connection
        </button>
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-5 w-48 bg-[#f5f5f7] rounded" />
              <div className="mt-3 h-4 w-32 bg-[#f5f5f7] rounded" />
            </div>
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="mt-12 bg-white rounded-xl p-12 text-center">
          <Plug className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.24)]" />
          <h3 className="mt-4 text-[17px] font-semibold text-[#1d1d1f]">
            No connections yet
          </h3>
          <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)] max-w-md mx-auto">
            Connect your PMS to automatically sync prescription events, patient
            data, and send notifications.
          </p>
          <button
            onClick={() => {
              setForm((f) => ({ ...f, locationId: locations[0]?.id || "" }));
              setShowModal(true);
            }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add your first connection
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-white rounded-xl p-5 border border-[rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-10 h-10 rounded-lg flex items-center justify-center ${
                      conn.isActive
                        ? "bg-[#34C759]/10 text-[#34C759]"
                        : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.24)]"
                    }`}
                  >
                    {conn.isActive ? (
                      <Wifi className="w-5 h-5" />
                    ) : (
                      <WifiOff className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                      {conn.name}
                    </h3>
                    <p className="text-[13px] text-[rgba(0,0,0,0.48)]">
                      {PMS_TYPES.find((t) => t.value === conn.pmsType)?.label ||
                        conn.pmsType}{" "}
                      &middot; {conn.location.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium ${
                      conn.isActive
                        ? "bg-[#34C759]/10 text-[#34C759]"
                        : "bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.48)]"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        conn.isActive ? "bg-[#34C759]" : "bg-[rgba(0,0,0,0.24)]"
                      }`}
                    />
                    {conn.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row gap-4 text-[13px] text-[rgba(0,0,0,0.48)]">
                <div>
                  <span className="text-[rgba(0,0,0,0.32)]">Last sync:</span>{" "}
                  {formatDate(conn.lastSyncAt)}
                </div>
                {conn.syncStatus && (
                  <div>
                    <span className="text-[rgba(0,0,0,0.32)]">Status:</span>{" "}
                    {conn.syncStatus}
                  </div>
                )}
                <div>
                  <span className="text-[rgba(0,0,0,0.32)]">Created:</span>{" "}
                  {formatDate(conn.createdAt)}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.04)]">
                <p className="text-[12px] text-[rgba(0,0,0,0.32)] mb-1">
                  Webhook URL
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[12px] bg-[#f5f5f7] px-3 py-1.5 rounded-md text-[#1d1d1f] truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/integrations/webhook`
                      : "/api/integrations/webhook"}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/api/integrations/webhook`,
                        `url-${conn.id}`
                      )
                    }
                    className="p-1.5 rounded-md hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)] transition-colors"
                  >
                    {copiedId === `url-${conn.id}` ? (
                      <Check className="w-3.5 h-3.5 text-[#34C759]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add connection modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {newConnection ? (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
                    Connection created
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-1.5 rounded-md hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[14px] text-[rgba(0,0,0,0.48)] mb-4">
                  Save these credentials. The webhook secret will not be shown
                  again.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                      Webhook URL
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-[13px] bg-[#f5f5f7] px-3 py-2 rounded-lg text-[#1d1d1f] break-all">
                        {newConnection.webhookUrl}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(newConnection.webhookUrl, "new-url")
                        }
                        className="p-2 rounded-lg hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)]"
                      >
                        {copiedId === "new-url" ? (
                          <Check className="w-4 h-4 text-[#34C759]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] font-medium text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                      Webhook secret
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="flex-1 text-[13px] bg-[#FFF3CD] px-3 py-2 rounded-lg text-[#1d1d1f] break-all font-mono">
                        {newConnection.webhookSecret}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            newConnection.webhookSecret,
                            "new-secret"
                          )
                        }
                        className="p-2 rounded-lg hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)]"
                      >
                        {copiedId === "new-secret" ? (
                          <Check className="w-4 h-4 text-[#34C759]" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="mt-6 w-full px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
                    Add PMS connection
                  </h2>
                  <button
                    onClick={closeModal}
                    className="p-1.5 rounded-md hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {createError && (
                  <div className="mb-4 px-3 py-2 bg-[#FEE2E2] text-[#DC2626] rounded-lg text-[13px]">
                    {createError}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[13px] font-medium text-[#1d1d1f]">
                      Connection name
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Main St PioneerRx"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-[#1d1d1f]">
                      PMS type
                    </label>
                    <select
                      value={form.pmsType}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, pmsType: e.target.value }))
                      }
                      className="mt-1 w-full h-10 px-3 border border-[rgba(0,0,0,0.08)] rounded-lg text-[14px] bg-white"
                    >
                      {PMS_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-[#1d1d1f]">
                      Location
                    </label>
                    <select
                      value={form.locationId}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, locationId: e.target.value }))
                      }
                      className="mt-1 w-full h-10 px-3 border border-[rgba(0,0,0,0.08)] rounded-lg text-[14px] bg-white"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-[#1d1d1f]">
                      API URL{" "}
                      <span className="text-[rgba(0,0,0,0.32)]">
                        (optional)
                      </span>
                    </label>
                    <Input
                      value={form.apiUrl}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, apiUrl: e.target.value }))
                      }
                      placeholder="https://pms.example.com/api"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-[#1d1d1f]">
                      API key{" "}
                      <span className="text-[rgba(0,0,0,0.32)]">
                        (optional)
                      </span>
                    </label>
                    <Input
                      value={form.apiKey}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, apiKey: e.target.value }))
                      }
                      placeholder="Your API key"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[13px] font-medium text-[#1d1d1f]">
                      API secret{" "}
                      <span className="text-[rgba(0,0,0,0.32)]">
                        (optional)
                      </span>
                    </label>
                    <Input
                      type="password"
                      value={form.apiSecret}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, apiSecret: e.target.value }))
                      }
                      placeholder="Your API secret"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[14px] hover:bg-[#f5f5f7] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!form.name || !form.locationId || creating}
                    className="flex-1 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {creating && (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    )}
                    Create connection
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

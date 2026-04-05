"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Plus, Search, X, RefreshCw, MessageSquare, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/error-state";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  smsOptIn: boolean;
  preferredChannel: string;
  createdAt: string;
  _count: {
    prescriptionEvents: number;
    patientNotifications: number;
  };
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    smsOptIn: true,
    voiceOptIn: false,
    emailOptIn: false,
    preferredChannel: "SMS" as "SMS" | "VOICE" | "EMAIL",
  });

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/patients?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPatients(data.patients);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const debounce = setTimeout(() => fetchPatients(), 300);
    return () => clearTimeout(debounce);
  }, [fetchPatients]);

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const body: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        smsOptIn: form.smsOptIn,
        voiceOptIn: form.voiceOptIn,
        emailOptIn: form.emailOptIn,
        preferredChannel: form.preferredChannel,
      };
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;

      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setCreateError(data.error || "Failed to add patient");
        return;
      }
      setShowModal(false);
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        smsOptIn: true,
        voiceOptIn: false,
        emailOptIn: false,
        preferredChannel: "SMS",
      });
      fetchPatients();
    } catch {
      setCreateError("Failed to add patient");
    } finally {
      setCreating(false);
    }
  };

  if (error) return <ErrorState onRetry={fetchPatients} />;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">
            Patients
          </h1>
          <p className="mt-1 text-[17px] text-muted-foreground">
            {total} patient{total !== 1 ? "s" : ""} in your directory
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add patient
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(0,0,0,0.32)]" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or phone..."
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="mt-2 h-3 w-48 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : patients.length === 0 ? (
        <div className="mt-12 bg-card rounded-xl p-12 text-center">
          <Heart className="w-12 h-12 mx-auto text-[rgba(0,0,0,0.24)]" />
          <h3 className="mt-4 text-[17px] font-semibold text-foreground">
            {search ? "No patients match your search" : "No patients yet"}
          </h3>
          <p className="mt-1 text-[14px] text-muted-foreground max-w-md mx-auto">
            {search
              ? "Try a different search term."
              : "Patients are created automatically from PMS webhook events, or you can add them manually."}
          </p>
          {!search && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add patient
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(0,0,0,0.06)]">
                  <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                    Patient
                  </th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wide py-3 px-4 hidden sm:table-cell">
                    Contact
                  </th>
                  <th className="text-left text-[12px] font-medium text-muted-foreground uppercase tracking-wide py-3 px-4 hidden md:table-cell">
                    Notifications
                  </th>
                  <th className="text-right text-[12px] font-medium text-muted-foreground uppercase tracking-wide py-3 px-4">
                    Rx events
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="border-b border-[rgba(0,0,0,0.04)] hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#0071e3]/10 flex items-center justify-center text-[#0071e3] text-[13px] font-medium shrink-0">
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-foreground">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-[12px] text-muted-foreground sm:hidden">
                            {patient.phone || patient.email || "No contact info"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {patient.phone && (
                          <p className="text-[13px] text-foreground">
                            {patient.phone}
                          </p>
                        )}
                        {patient.email && (
                          <p className="text-[13px] text-muted-foreground">
                            {patient.email}
                          </p>
                        )}
                        {!patient.phone && !patient.email && (
                          <p className="text-[13px] text-[rgba(0,0,0,0.32)]">
                            No contact info
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        {patient.smsOptIn && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#34C759]/10 text-[#34C759] rounded-full text-[11px] font-medium">
                            <MessageSquare className="w-3 h-3" />
                            SMS
                          </span>
                        )}
                        {patient.preferredChannel === "VOICE" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#007AFF]/10 text-[#007AFF] rounded-full text-[11px] font-medium">
                            <Phone className="w-3 h-3" />
                            Voice
                          </span>
                        )}
                        {patient.preferredChannel === "EMAIL" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF9500]/10 text-[#FF9500] rounded-full text-[11px] font-medium">
                            <Mail className="w-3 h-3" />
                            Email
                          </span>
                        )}
                        {!patient.smsOptIn &&
                          patient.preferredChannel === "SMS" && (
                            <span className="text-[12px] text-[rgba(0,0,0,0.32)]">
                              No opt-in
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[14px] font-medium text-foreground">
                        {patient._count.prescriptionEvents}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[13px] text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add patient modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[20px] font-semibold text-foreground">
                Add patient
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[13px] font-medium text-foreground">
                    First name
                  </label>
                  <Input
                    value={form.firstName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, firstName: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-foreground">
                    Last name
                  </label>
                  <Input
                    value={form.lastName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastName: e.target.value }))
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-[13px] font-medium text-foreground">
                  Phone
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="555-123-4567"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-foreground">
                  Email
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="patient@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-[13px] font-medium text-foreground mb-2 block">
                  Notification preferences
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[14px] text-foreground">
                    <input
                      type="checkbox"
                      checked={form.smsOptIn}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, smsOptIn: e.target.checked }))
                      }
                      className="rounded border-[rgba(0,0,0,0.16)]"
                    />
                    SMS opt-in
                  </label>
                  <label className="flex items-center gap-2 text-[14px] text-foreground">
                    <input
                      type="checkbox"
                      checked={form.voiceOptIn}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, voiceOptIn: e.target.checked }))
                      }
                      className="rounded border-[rgba(0,0,0,0.16)]"
                    />
                    Voice opt-in
                  </label>
                  <label className="flex items-center gap-2 text-[14px] text-foreground">
                    <input
                      type="checkbox"
                      checked={form.emailOptIn}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emailOptIn: e.target.checked,
                        }))
                      }
                      className="rounded border-[rgba(0,0,0,0.16)]"
                    />
                    Email opt-in
                  </label>
                </div>
              </div>

              <div>
                <label className="text-[13px] font-medium text-foreground">
                  Preferred channel
                </label>
                <select
                  value={form.preferredChannel}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      preferredChannel: e.target.value as "SMS" | "VOICE" | "EMAIL",
                    }))
                  }
                  className="mt-1 w-full h-10 px-3 border border-border rounded-lg text-[14px] bg-card"
                >
                  <option value="SMS">SMS</option>
                  <option value="VOICE">Voice</option>
                  <option value="EMAIL">Email</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-border text-foreground rounded-lg text-[14px] hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !form.firstName || !form.lastName || creating
                }
                className="flex-1 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {creating && <RefreshCw className="w-4 h-4 animate-spin" />}
                Add patient
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

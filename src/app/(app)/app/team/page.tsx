"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, X, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { MODULE_LABELS, ACCESS_OPTIONS } from "@/lib/permissions";

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean;
  lastActiveAt: string | null;
  location: { id: string; name: string } | null;
  permissions: Array<{ module: string; access: string }>;
}

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
}

const roleColors: Record<string, string> = {
  OWNER: "bg-[#0071e3]/10 text-[#0071e3]",
  PHARMACIST: "bg-[#22C55E]/10 text-[#22C55E]",
  TECHNICIAN: "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.48)]",
};

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [permissionEdits, setPermissionEdits] = useState<Record<string, string>>({});
  const [inviteForm, setInviteForm] = useState({ email: "", role: "TECHNICIAN" as string });

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    const res = await fetch("/api/team");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
      setInvites(data.invites || []);
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inviteForm),
    });
    if (res.ok) {
      toast.success(`Invitation sent to ${inviteForm.email}`);
      setShowInvite(false);
      setInviteForm({ email: "", role: "TECHNICIAN" });
      fetchTeam();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to send invite");
    }
  };

  const handleToggleActive = async (userId: string, active: boolean) => {
    const res = await fetch(`/api/team/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      toast.success(active ? "User reactivated" : "User deactivated");
      fetchTeam();
    }
  };

  const startEditPermissions = (user: TeamUser) => {
    const perms: Record<string, string> = {};
    for (const p of user.permissions) {
      perms[p.module] = p.access;
    }
    setPermissionEdits(perms);
    setEditingPermissions(user.id);
  };

  const savePermissions = async () => {
    if (!editingPermissions) return;
    const permissions = Object.entries(permissionEdits).map(([module, access]) => ({
      module,
      access,
    }));
    const res = await fetch(`/api/permissions/${editingPermissions}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });
    if (res.ok) {
      toast.success("Permissions updated");
      setEditingPermissions(null);
      fetchTeam();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update permissions");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">
            Team
          </h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">
            {users.length} member{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite member
        </button>
      </div>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide mb-2">
            Pending invitations
          </h2>
          <div className="bg-white rounded-xl divide-y divide-[rgba(0,0,0,0.03)]">
            {invites.map((inv) => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-[#1d1d1f]">{inv.email}</p>
                  <p className="text-[12px] text-[rgba(0,0,0,0.48)]">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-wide"
                >
                  {inv.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="mt-6 bg-white rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[rgba(0,0,0,0.48)] text-[14px]">
            Loading...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[17px] font-semibold text-[#1d1d1f]">No team members yet</p>
            <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)]">
              Invite your first team member to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.03)]">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[rgba(0,0,0,0.05)] flex items-center justify-center text-[14px] font-medium text-[rgba(0,0,0,0.48)] shrink-0">
                      {user.name
                        ? user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "?"}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">
                        {user.name || user.email}
                        {!user.active && (
                          <span className="ml-2 text-[12px] font-normal text-[rgba(0,0,0,0.3)]">
                            inactive
                          </span>
                        )}
                      </p>
                      <p className="text-[12px] text-[rgba(0,0,0,0.48)]">
                        {user.email}
                        {user.location ? ` · ${user.location.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${roleColors[user.role] ?? "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.48)]"}`}
                    >
                      {user.role}
                    </span>
                    {user.role !== "OWNER" && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEditPermissions(user)}
                          className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)] transition-colors"
                          title="Edit permissions"
                          aria-label={`Edit permissions for ${user.name ?? user.email}`}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user.id, !user.active)}
                          className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)] transition-colors"
                          title={user.active ? "Deactivate user" : "Reactivate user"}
                          aria-label={
                            user.active
                              ? `Deactivate ${user.name ?? user.email}`
                              : `Reactivate ${user.name ?? user.email}`
                          }
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline permission editor */}
                {editingPermissions === user.id && (
                  <div className="mt-3 p-3 bg-[#f5f5f7] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">
                        Permissions
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditingPermissions(null)}
                          className="text-[13px] text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={savePermissions}
                          className="text-[13px] font-semibold text-[#0071e3] hover:text-[#0077ED] transition-colors"
                        >
                          Save permissions
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(Object.entries(MODULE_LABELS) as [string, string][]).map(
                        ([mod, label]) => (
                          <div key={mod} className="flex items-center justify-between">
                            <span className="text-[13px] text-[#1d1d1f]">{label}</span>
                            <select
                              value={permissionEdits[mod] ?? "NONE"}
                              onChange={(e) =>
                                setPermissionEdits({
                                  ...permissionEdits,
                                  [mod]: e.target.value,
                                })
                              }
                              className="h-7 rounded-md border border-[rgba(0,0,0,0.08)] px-2 text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                              aria-label={`${label} access level`}
                            >
                              {ACCESS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setShowInvite(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-dialog-title"
        >
          <div
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id="invite-dialog-title"
                className="text-[21px] font-bold text-[#1d1d1f]"
              >
                Invite team member
              </h2>
              <button
                onClick={() => setShowInvite(false)}
                className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)] transition-colors"
                aria-label="Close invite dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email" className="text-[13px]">
                  Email address
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  required
                  className="h-10"
                  placeholder="colleague@pharmacy.com"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role" className="text-[13px]">
                  Role
                </Label>
                <select
                  id="invite-role"
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value })
                  }
                  className="w-full h-10 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-1"
                >
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="TECHNICIAN">Technician</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full h-10 bg-[#0071e3] text-white rounded-lg text-[14px] font-medium hover:bg-[#0077ED] transition-colors"
              >
                Send invitation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

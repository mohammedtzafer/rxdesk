"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, X, MoreHorizontal, Pencil, UserX, UserCheck, MapPin } from "lucide-react";
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

interface LocationOption {
  id: string;
  name: string;
}

const roleColors: Record<string, string> = {
  OWNER: "bg-[#0071e3]/10 text-[#0071e3]",
  PHARMACIST: "bg-[#22C55E]/10 text-[#22C55E]",
  TECHNICIAN: "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.48)]",
};

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [permissionEdits, setPermissionEdits] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "TECHNICIAN" as string });

  // Edit user form state
  const [editForm, setEditForm] = useState({ role: "", locationId: "" as string | null });

  useEffect(() => {
    fetchTeam();
    fetchLocations();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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

  const fetchLocations = async () => {
    const res = await fetch("/api/locations");
    if (res.ok) {
      const data = await res.json();
      setLocations(data.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })));
    }
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
      setOpenMenuId(null);
      fetchTeam();
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    const res = await fetch(`/api/team/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      toast.success(`Role updated to ${role}`);
      setOpenMenuId(null);
      fetchTeam();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update role");
    }
  };

  const startEditUser = (user: TeamUser) => {
    setEditingUser(user);
    setEditForm({
      role: user.role,
      locationId: user.location?.id || null,
    });
    setOpenMenuId(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    const updates: Record<string, unknown> = {};
    if (editForm.role !== editingUser.role) updates.role = editForm.role;
    if (editForm.locationId !== (editingUser.location?.id || null)) updates.locationId = editForm.locationId;

    if (Object.keys(updates).length === 0) {
      setEditingUser(null);
      return;
    }

    const res = await fetch(`/api/team/${editingUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      toast.success("User updated");
      setEditingUser(null);
      fetchTeam();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update user");
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
    const permissions = Object.entries(permissionEdits).map(([module, access]) => ({ module, access }));
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
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-[#1d1d1f]">Team</h1>
          <p className="mt-1 text-[17px] text-[rgba(0,0,0,0.48)]">{users.length} member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors">
          <UserPlus className="w-4 h-4" /> Invite member
        </button>
      </div>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide mb-2">Pending invitations</h2>
          <div className="bg-white rounded-xl divide-y divide-[rgba(0,0,0,0.03)]">
            {invites.map((inv) => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-[#1d1d1f]">{inv.email}</p>
                  <p className="text-[12px] text-[rgba(0,0,0,0.48)]">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{inv.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="mt-6 bg-white rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[rgba(0,0,0,0.48)] text-[14px]">Loading...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[17px] font-semibold text-[#1d1d1f]">No team members yet</p>
            <p className="mt-1 text-[14px] text-[rgba(0,0,0,0.48)]">Invite your first team member to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(0,0,0,0.03)]">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[rgba(0,0,0,0.05)] flex items-center justify-center text-[14px] font-medium text-[rgba(0,0,0,0.48)] shrink-0">
                      {user.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-[#1d1d1f]">
                        {user.name || user.email}
                        {!user.active && <span className="ml-2 text-[12px] font-normal text-[rgba(0,0,0,0.3)]">inactive</span>}
                      </p>
                      <p className="text-[12px] text-[rgba(0,0,0,0.48)]">
                        {user.email}
                        {user.location ? ` · ${user.location.name}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${roleColors[user.role] ?? "bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.48)]"}`}>
                      {user.role}
                    </span>
                    {user.role !== "OWNER" && (
                      <div className="relative" ref={openMenuId === user.id ? menuRef : undefined}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg hover:bg-[#f5f5f7] text-[rgba(0,0,0,0.48)] transition-colors"
                          aria-label={`Actions for ${user.name ?? user.email}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown menu */}
                        {openMenuId === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-[rgba(0,0,0,0.08)] py-1 z-20">
                            <button
                              onClick={() => startEditUser(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors text-left"
                            >
                              <Pencil className="w-3.5 h-3.5 text-[rgba(0,0,0,0.48)]" />
                              Edit member
                            </button>
                            <button
                              onClick={() => { startEditPermissions(user); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-[#1d1d1f] hover:bg-[#f5f5f7] transition-colors text-left"
                            >
                              <Shield className="w-3.5 h-3.5 text-[rgba(0,0,0,0.48)]" />
                              Edit permissions
                            </button>
                            <div className="my-1 border-t border-[rgba(0,0,0,0.05)]" />
                            <button
                              onClick={() => handleToggleActive(user.id, !user.active)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[14px] hover:bg-[#f5f5f7] transition-colors text-left ${user.active ? "text-[#EF4444]" : "text-[#22C55E]"}`}
                            >
                              {user.active ? (
                                <><UserX className="w-3.5 h-3.5" /> Deactivate</>
                              ) : (
                                <><UserCheck className="w-3.5 h-3.5" /> Reactivate</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline permission editor */}
                {editingPermissions === user.id && (
                  <div className="mt-3 p-3 bg-[#f5f5f7] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-semibold text-[rgba(0,0,0,0.48)] uppercase tracking-wide">Permissions</p>
                      <div className="flex gap-3">
                        <button onClick={() => setEditingPermissions(null)} className="text-[13px] text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f]">Cancel</button>
                        <button onClick={savePermissions} className="text-[13px] font-semibold text-[#0071e3] hover:text-[#0077ED]">Save</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(Object.entries(MODULE_LABELS) as [string, string][]).map(([mod, label]) => (
                        <div key={mod} className="flex items-center justify-between">
                          <span className="text-[13px] text-[#1d1d1f]">{label}</span>
                          <select
                            value={permissionEdits[mod] ?? "NONE"}
                            onChange={(e) => setPermissionEdits({ ...permissionEdits, [mod]: e.target.value })}
                            className="h-7 rounded-md border border-[rgba(0,0,0,0.08)] px-2 text-[12px] bg-white"
                            aria-label={`${label} access level`}
                          >
                            {ACCESS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit user modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[21px] font-bold text-[#1d1d1f]">Edit member</h2>
              <button onClick={() => setEditingUser(null)} className="text-[rgba(0,0,0,0.48)]"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[rgba(0,0,0,0.05)] flex items-center justify-center text-[14px] font-medium text-[rgba(0,0,0,0.48)]">
                {editingUser.name ? editingUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
              </div>
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">{editingUser.name || editingUser.email}</p>
                <p className="text-[12px] text-[rgba(0,0,0,0.48)]">{editingUser.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Role</Label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full h-10 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white"
                >
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="TECHNICIAN">Technician</option>
                </select>
                <p className="text-[12px] text-[rgba(0,0,0,0.48)]">
                  {editForm.role === "PHARMACIST"
                    ? "Full access to providers, prescriptions, drug reps, and time tracking. View-only reports."
                    : "Edit access to time tracking. View-only providers. No access to prescriptions, drug reps, or reports."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Location</Label>
                <select
                  value={editForm.locationId || ""}
                  onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value || null })}
                  className="w-full h-10 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white"
                >
                  <option value="">No location assigned</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditingUser(null)} className="flex-1 h-10 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[14px] hover:bg-[#f5f5f7]">
                  Cancel
                </button>
                <button onClick={handleSaveUser} className="flex-1 h-10 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED]">
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowInvite(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[21px] font-bold text-[#1d1d1f]">Invite team member</h2>
              <button onClick={() => setShowInvite(false)} className="text-[rgba(0,0,0,0.48)]"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Email address</Label>
                <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required className="h-10" placeholder="colleague@pharmacy.com" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Role</Label>
                <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full h-10 rounded-lg border border-[rgba(0,0,0,0.08)] px-3 text-[14px] bg-white">
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="TECHNICIAN">Technician</option>
                </select>
              </div>
              <button type="submit" className="w-full h-10 bg-[#0071e3] text-white rounded-lg text-[14px] font-medium hover:bg-[#0077ED]">Send invitation</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

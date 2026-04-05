"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Shield, X, MoreHorizontal, Pencil, UserX, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { MODULE_LABELS, ACCESS_OPTIONS } from "@/lib/permissions";

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  active: boolean;
  lastActiveAt: string | null;
  locations: Array<{ location: { id: string; name: string }; isPrimary: boolean }>;
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
  TECHNICIAN: "bg-muted text-muted-foreground",
  DRUG_REP: "bg-[#F59E0B]/10 text-[#F59E0B]",
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
  const [editForm, setEditForm] = useState({
    role: "",
    locationIds: [] as string[],
    primaryLocationId: "",
  });

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
    const locationIds = user.locations.map((l) => l.location.id);
    const primaryLocationId = user.locations.find((l) => l.isPrimary)?.location.id || locationIds[0] || "";
    setEditingUser(user);
    setEditForm({
      role: user.role,
      locationIds,
      primaryLocationId,
    });
    setOpenMenuId(null);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    const roleChanged = editForm.role !== editingUser.role;
    const currentLocationIds = editingUser.locations.map((l) => l.location.id);
    const currentPrimaryId = editingUser.locations.find((l) => l.isPrimary)?.location.id || "";
    const locationsChanged =
      JSON.stringify([...editForm.locationIds].sort()) !== JSON.stringify([...currentLocationIds].sort()) ||
      editForm.primaryLocationId !== currentPrimaryId;

    if (!roleChanged && !locationsChanged) {
      setEditingUser(null);
      return;
    }

    const promises: Promise<Response>[] = [];

    if (roleChanged) {
      promises.push(
        fetch(`/api/team/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: editForm.role }),
        })
      );
    }

    if (locationsChanged) {
      promises.push(
        fetch(`/api/team/${editingUser.id}/locations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationIds: editForm.locationIds,
            primaryLocationId: editForm.primaryLocationId,
          }),
        })
      );
    }

    const results = await Promise.all(promises);
    const allOk = results.every((r) => r.ok);

    if (allOk) {
      toast.success("User updated");
      setEditingUser(null);
      fetchTeam();
    } else {
      toast.error("Failed to update user");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[28px] sm:text-[40px] font-semibold leading-[1.1] tracking-tight text-foreground">Team</h1>
          <p className="mt-1 text-[17px] text-muted-foreground">{users.length} member{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-lg text-[14px] hover:bg-[#0077ED] transition-colors">
          <UserPlus className="w-4 h-4" /> Invite member
        </button>
      </div>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="mt-6">
          <h2 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pending invitations</h2>
          <div className="bg-card rounded-xl divide-y divide-border/50">
            {invites.map((inv) => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-foreground">{inv.email}</p>
                  <p className="text-[12px] text-muted-foreground">Expires {new Date(inv.expiresAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{inv.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team list */}
      <div className="mt-6 bg-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-32 h-4 bg-muted rounded animate-pulse" />
                <div className="w-24 h-4 bg-[rgba(0,0,0,0.04)] rounded animate-pulse" />
                <div className="flex-1" />
                <div className="w-12 h-4 bg-[rgba(0,0,0,0.04)] rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[17px] font-semibold text-foreground">No team members yet</p>
            <p className="mt-1 text-[14px] text-muted-foreground">Invite your first team member to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-[14px] font-medium text-muted-foreground shrink-0">
                      {user.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-foreground">
                        {user.name || user.email}
                        {!user.active && <span className="ml-2 text-[12px] font-normal text-muted-foreground/60">inactive</span>}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {user.email}
                        {user.locations.length > 0 && (
                          <> · {user.locations.map((l) => l.location.name).join(", ")}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${roleColors[user.role] ?? "bg-muted text-muted-foreground"}`}>
                      {user.role}
                    </span>
                    {user.role !== "OWNER" && (
                      <div className="relative" ref={openMenuId === user.id ? menuRef : undefined}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                          aria-label={`Actions for ${user.name ?? user.email}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* Dropdown menu */}
                        {openMenuId === user.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-xl shadow-lg border border-border py-1 z-20">
                            <button
                              onClick={() => startEditUser(user)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-foreground hover:bg-muted transition-colors text-left"
                            >
                              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              Edit member
                            </button>
                            <button
                              onClick={() => { startEditPermissions(user); setOpenMenuId(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-foreground hover:bg-muted transition-colors text-left"
                            >
                              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                              Edit permissions
                            </button>
                            <div className="my-1 border-t border-border" />
                            <button
                              onClick={() => handleToggleActive(user.id, !user.active)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-[14px] hover:bg-muted transition-colors text-left ${user.active ? "text-[#EF4444]" : "text-[#22C55E]"}`}
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
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Permissions</p>
                      <div className="flex gap-3">
                        <button onClick={() => setEditingPermissions(null)} className="text-[13px] text-muted-foreground hover:text-foreground">Cancel</button>
                        <button onClick={savePermissions} className="text-[13px] font-semibold text-[#0071e3] hover:text-[#0077ED]">Save</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(Object.entries(MODULE_LABELS) as [string, string][]).map(([mod, label]) => (
                        <div key={mod} className="flex items-center justify-between">
                          <span className="text-[13px] text-foreground">{label}</span>
                          <select
                            value={permissionEdits[mod] ?? "NONE"}
                            onChange={(e) => setPermissionEdits({ ...permissionEdits, [mod]: e.target.value })}
                            className="h-7 rounded-md border border-border px-2 text-[12px] bg-card"
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
          <div className="bg-card rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[21px] font-bold text-foreground">Edit member</h2>
              <button onClick={() => setEditingUser(null)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-[14px] font-medium text-muted-foreground">
                {editingUser.name ? editingUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
              </div>
              <div>
                <p className="text-[14px] font-medium text-foreground">{editingUser.name || editingUser.email}</p>
                <p className="text-[12px] text-muted-foreground">{editingUser.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Role</Label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full h-10 rounded-lg border border-border px-3 text-[14px] bg-card"
                >
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="DRUG_REP">Drug Rep</option>
                </select>
                <p className="text-[12px] text-muted-foreground">
                  {editForm.role === "PHARMACIST"
                    ? "Full access to providers, prescriptions, drug reps, and time tracking. View-only reports."
                    : editForm.role === "DRUG_REP"
                    ? "Visit log only. Sees only the Drug Rep dashboard to log provider visits."
                    : "Edit access to time tracking. View-only providers. No access to prescriptions, drug reps, or reports."}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Locations</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2.5">
                  {locations.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">No locations configured</p>
                  ) : (
                    locations.map((loc) => (
                      <label key={loc.id} className="flex items-center gap-2 text-[14px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.locationIds.includes(loc.id)}
                          onChange={(e) => {
                            const ids = e.target.checked
                              ? [...editForm.locationIds, loc.id]
                              : editForm.locationIds.filter((id) => id !== loc.id);
                            setEditForm({
                              ...editForm,
                              locationIds: ids,
                              primaryLocationId: ids.includes(editForm.primaryLocationId)
                                ? editForm.primaryLocationId
                                : ids[0] || "",
                            });
                          }}
                          className="rounded"
                        />
                        <span className="flex-1 text-foreground">{loc.name}</span>
                        {editForm.locationIds.includes(loc.id) && (
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, primaryLocationId: loc.id })}
                            className={`text-[11px] px-1.5 py-0.5 rounded transition-colors ${
                              editForm.primaryLocationId === loc.id
                                ? "bg-[#0071e3] text-white"
                                : "bg-muted text-muted-foreground hover:bg-[rgba(0,0,0,0.08)]"
                            }`}
                          >
                            {editForm.primaryLocationId === loc.id ? "Primary" : "Set primary"}
                          </button>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setEditingUser(null)} className="flex-1 h-10 border border-border text-foreground rounded-lg text-[14px] hover:bg-muted">
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
          <div className="bg-card rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[21px] font-bold text-foreground">Invite team member</h2>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Email address</Label>
                <Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required className="h-10" placeholder="colleague@pharmacy.com" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[13px]">Role</Label>
                <select value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })} className="w-full h-10 rounded-lg border border-border px-3 text-[14px] bg-card">
                  <option value="PHARMACIST">Pharmacist</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="DRUG_REP">Drug Rep</option>
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

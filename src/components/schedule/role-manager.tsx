"use client";

import { useState } from "react";
import { getRoleColor } from "@/lib/schedule-types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";

interface RoleManagerProps {
  roles: string[];
  onRolesChange: (roles: string[]) => Promise<void>;
}

export function RoleManager({ roles, onRolesChange }: RoleManagerProps) {
  const [saving, setSaving] = useState(false);
  const [addDialog, setAddDialog] = useState<{ open: boolean; value: string }>({
    open: false,
    value: "",
  });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    index: number;
    value: string;
  }>({ open: false, index: -1, value: "" });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    index: number;
  }>({ open: false, index: -1 });

  async function handleAdd() {
    const trimmed = addDialog.value.trim();
    if (!trimmed || roles.includes(trimmed)) return;
    setSaving(true);
    await onRolesChange([...roles, trimmed]);
    setSaving(false);
    setAddDialog({ open: false, value: "" });
  }

  async function handleEdit() {
    const trimmed = editDialog.value.trim();
    if (!trimmed) return;
    const updated = [...roles];
    updated[editDialog.index] = trimmed;
    setSaving(true);
    await onRolesChange(updated);
    setSaving(false);
    setEditDialog({ open: false, index: -1, value: "" });
  }

  async function handleDelete() {
    const updated = roles.filter((_, i) => i !== deleteConfirm.index);
    setSaving(true);
    await onRolesChange(updated);
    setSaving(false);
    setDeleteConfirm({ open: false, index: -1 });
  }

  return (
    <>
      <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between">
          <h3 className="font-semibold text-[15px] text-[#1d1d1f]">
            Roles ({roles.length})
          </h3>
          <button
            type="button"
            onClick={() => setAddDialog({ open: true, value: "" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Add role</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {roles.length === 0 ? (
          <div
            className="p-10 text-center text-[14px] text-[rgba(0,0,0,0.48)]"
            role="status"
          >
            No roles defined. Add your first role to get started.
          </div>
        ) : (
          <div
            className="divide-y divide-[rgba(0,0,0,0.04)]"
            role="list"
            aria-label="Schedule roles"
          >
            {roles.map((role, index) => {
              const color = getRoleColor(role);
              return (
                <div
                  key={`${role}-${index}`}
                  role="listitem"
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#f5f5f7] transition-colors"
                >
                  <GripVertical
                    className="w-4 h-4 text-[rgba(0,0,0,0.24)] flex-shrink-0"
                    aria-hidden="true"
                  />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-[13px] font-medium text-[#1d1d1f]">
                    {role}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setEditDialog({ open: true, index, value: role })
                      }
                      aria-label={`Rename ${role}`}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-[rgba(0,0,0,0.48)] hover:text-[#1d1d1f] hover:bg-[#ebebeb] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ open: true, index })}
                      aria-label={`Delete ${role}`}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-[rgba(0,0,0,0.48)] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add role dialog */}
      <Dialog
        open={addDialog.open}
        onOpenChange={(open) => !open && setAddDialog({ open: false, value: "" })}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add role</DialogTitle>
            <DialogDescription>
              Create a new role that can be assigned to employees.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Role name"
              value={addDialog.value}
              onChange={(e) =>
                setAddDialog((prev) => ({ ...prev, value: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
              aria-label="New role name"
            />
            {roles.includes(addDialog.value.trim()) && addDialog.value.trim() && (
              <p className="text-[12px] text-[#EF4444] mt-1" role="alert">
                This role already exists.
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setAddDialog({ open: false, value: "" })}
              className="px-4 py-2 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={
                !addDialog.value.trim() ||
                roles.includes(addDialog.value.trim()) ||
                saving
              }
              className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              Add role
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit role dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          !open && setEditDialog({ open: false, index: -1, value: "" })
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename role</DialogTitle>
            <DialogDescription>
              This will update the role name everywhere it is used.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Role name"
              value={editDialog.value}
              onChange={(e) =>
                setEditDialog((prev) => ({ ...prev, value: e.target.value }))
              }
              onKeyDown={(e) => e.key === "Enter" && handleEdit()}
              autoFocus
              aria-label="Role name"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setEditDialog({ open: false, index: -1, value: "" })}
              className="px-4 py-2 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleEdit}
              disabled={!editDialog.value.trim() || saving}
              className="px-4 py-2 bg-[#0071e3] text-white rounded-lg text-[13px] hover:bg-[#0077ED] transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={deleteConfirm.open}
        onOpenChange={(open) =>
          !open && setDeleteConfirm({ open: false, index: -1 })
        }
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;
              {roles[deleteConfirm.index]}&rdquo;? Employees assigned this role
              will need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteConfirm({ open: false, index: -1 })}
              className="px-4 py-2 border border-[rgba(0,0,0,0.08)] text-[#1d1d1f] rounded-lg text-[13px] hover:bg-[#f5f5f7] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 bg-[#EF4444] text-white rounded-lg text-[13px] hover:bg-[#DC2626] transition-colors disabled:opacity-50"
            >
              Delete role
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

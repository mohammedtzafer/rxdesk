import type { Role, Module, Access } from "@/generated/prisma/client";

export const ALL_MODULES: Module[] = [
  "PROVIDERS",
  "PRESCRIPTIONS",
  "DRUG_REPS",
  "TIME_TRACKING",
  "SCHEDULING",
  "TEAM",
  "REPORTS",
  "SETTINGS",
];

export const MODULE_LABELS: Record<Module, string> = {
  PROVIDERS: "Providers",
  PRESCRIPTIONS: "Prescriptions",
  DRUG_REPS: "Drug Reps",
  TIME_TRACKING: "Time Tracking",
  SCHEDULING: "Scheduling",
  TEAM: "Team",
  REPORTS: "Reports",
  SETTINGS: "Settings",
};

export const ACCESS_LABELS: Record<Access, string> = {
  NONE: "No access",
  VIEW: "View only",
  EDIT: "Can edit",
  FULL: "Full access",
};

const DEFAULT_PERMISSIONS: Record<Role, Record<Module, Access>> = {
  OWNER: {
    PROVIDERS: "FULL",
    PRESCRIPTIONS: "FULL",
    DRUG_REPS: "FULL",
    TIME_TRACKING: "FULL",
    SCHEDULING: "FULL",
    TEAM: "FULL",
    REPORTS: "FULL",
    SETTINGS: "FULL",
  },
  PHARMACIST: {
    PROVIDERS: "FULL",
    PRESCRIPTIONS: "FULL",
    DRUG_REPS: "FULL",
    TIME_TRACKING: "FULL",
    SCHEDULING: "NONE",
    TEAM: "NONE",
    REPORTS: "VIEW",
    SETTINGS: "NONE",
  },
  TECHNICIAN: {
    PROVIDERS: "VIEW",
    PRESCRIPTIONS: "NONE",
    DRUG_REPS: "NONE",
    TIME_TRACKING: "EDIT",
    SCHEDULING: "NONE",
    TEAM: "NONE",
    REPORTS: "NONE",
    SETTINGS: "NONE",
  },
  DRUG_REP: {
    PROVIDERS: "NONE",
    PRESCRIPTIONS: "NONE",
    DRUG_REPS: "FULL",
    TIME_TRACKING: "NONE",
    SCHEDULING: "NONE",
    TEAM: "NONE",
    REPORTS: "NONE",
    SETTINGS: "NONE",
  },
};

export function getDefaultPermissions(
  role: Role
): Array<{ module: Module; access: Access }> {
  const perms = DEFAULT_PERMISSIONS[role];
  return ALL_MODULES.map((module) => ({
    module,
    access: perms[module],
  }));
}

export function getDefaultAccess(role: Role, module: Module): Access {
  return DEFAULT_PERMISSIONS[role][module];
}

export function isRoleEditable(role: Role): boolean {
  return role !== "OWNER";
}

export const ACCESS_LEVEL: Record<Access, number> = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  FULL: 3,
};

export function meetsAccessLevel(
  userAccess: Access,
  requiredAccess: Access
): boolean {
  return ACCESS_LEVEL[userAccess] >= ACCESS_LEVEL[requiredAccess];
}

export const ACCESS_OPTIONS: Array<{ value: Access; label: string }> = [
  { value: "NONE", label: "No access" },
  { value: "VIEW", label: "View only" },
  { value: "EDIT", label: "Can edit" },
  { value: "FULL", label: "Full access" },
];

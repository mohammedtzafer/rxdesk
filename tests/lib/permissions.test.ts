import { describe, it, expect } from "vitest";
import {
  ALL_MODULES,
  ACCESS_LEVEL,
  ACCESS_OPTIONS,
  MODULE_LABELS,
  getDefaultPermissions,
  getDefaultAccess,
  isRoleEditable,
  meetsAccessLevel,
} from "@/lib/permissions";

describe("ACCESS_OPTIONS", () => {
  it("has exactly 4 entries (NONE, VIEW, EDIT, FULL)", () => {
    expect(ACCESS_OPTIONS).toHaveLength(4);
  });

  it("contains entries for every access level", () => {
    const values = ACCESS_OPTIONS.map((o) => o.value);
    expect(values).toContain("NONE");
    expect(values).toContain("VIEW");
    expect(values).toContain("EDIT");
    expect(values).toContain("FULL");
  });
});

describe("MODULE_LABELS", () => {
  it("has exactly 8 entries matching ALL_MODULES", () => {
    expect(Object.keys(MODULE_LABELS)).toHaveLength(8);
  });

  it("has a label for every module in ALL_MODULES", () => {
    for (const mod of ALL_MODULES) {
      expect(MODULE_LABELS).toHaveProperty(mod);
      expect(MODULE_LABELS[mod].length).toBeGreaterThan(0);
    }
  });
});

describe("ALL_MODULES", () => {
  it("has exactly 8 entries", () => {
    expect(ALL_MODULES).toHaveLength(8);
  });

  it("contains all expected modules", () => {
    expect(ALL_MODULES).toContain("PROVIDERS");
    expect(ALL_MODULES).toContain("PRESCRIPTIONS");
    expect(ALL_MODULES).toContain("DRUG_REPS");
    expect(ALL_MODULES).toContain("TIME_TRACKING");
    expect(ALL_MODULES).toContain("SCHEDULING");
    expect(ALL_MODULES).toContain("TEAM");
    expect(ALL_MODULES).toContain("REPORTS");
    expect(ALL_MODULES).toContain("SETTINGS");
  });
});

describe("ACCESS_LEVEL ordering", () => {
  it("NONE is the lowest level (0)", () => {
    expect(ACCESS_LEVEL.NONE).toBe(0);
  });

  it("VIEW is above NONE", () => {
    expect(ACCESS_LEVEL.VIEW).toBeGreaterThan(ACCESS_LEVEL.NONE);
  });

  it("EDIT is above VIEW", () => {
    expect(ACCESS_LEVEL.EDIT).toBeGreaterThan(ACCESS_LEVEL.VIEW);
  });

  it("FULL is the highest level", () => {
    expect(ACCESS_LEVEL.FULL).toBeGreaterThan(ACCESS_LEVEL.EDIT);
  });

  it("has strict ordering NONE < VIEW < EDIT < FULL", () => {
    expect(ACCESS_LEVEL.NONE).toBeLessThan(ACCESS_LEVEL.VIEW);
    expect(ACCESS_LEVEL.VIEW).toBeLessThan(ACCESS_LEVEL.EDIT);
    expect(ACCESS_LEVEL.EDIT).toBeLessThan(ACCESS_LEVEL.FULL);
  });
});

describe("getDefaultPermissions", () => {
  it("returns an entry for every module", () => {
    const perms = getDefaultPermissions("OWNER");
    expect(perms).toHaveLength(ALL_MODULES.length);
    const modules = perms.map((p) => p.module);
    for (const mod of ALL_MODULES) {
      expect(modules).toContain(mod);
    }
  });

  it("returns no duplicate modules for any role", () => {
    for (const role of ["OWNER", "PHARMACIST", "TECHNICIAN"] as const) {
      const perms = getDefaultPermissions(role);
      const modules = perms.map((p) => p.module);
      const unique = new Set(modules);
      expect(unique.size).toBe(modules.length);
    }
  });

  describe("OWNER", () => {
    it("returns FULL access on all 8 modules", () => {
      const perms = getDefaultPermissions("OWNER");
      for (const perm of perms) {
        expect(perm.access).toBe("FULL");
      }
    });
  });

  describe("PHARMACIST", () => {
    it("returns FULL on PROVIDERS", () => {
      const perms = getDefaultPermissions("PHARMACIST");
      expect(perms.find((p) => p.module === "PROVIDERS")?.access).toBe("FULL");
    });

    it("returns FULL on PRESCRIPTIONS", () => {
      const perms = getDefaultPermissions("PHARMACIST");
      expect(perms.find((p) => p.module === "PRESCRIPTIONS")?.access).toBe("FULL");
    });

    it("returns FULL on DRUG_REPS", () => {
      const perms = getDefaultPermissions("PHARMACIST");
      expect(perms.find((p) => p.module === "DRUG_REPS")?.access).toBe("FULL");
    });

    it("returns FULL on TIME_TRACKING", () => {
      const perms = getDefaultPermissions("PHARMACIST");
      expect(perms.find((p) => p.module === "TIME_TRACKING")?.access).toBe("FULL");
    });

    it("returns VIEW on REPORTS", () => {
      const perms = getDefaultPermissions("PHARMACIST");
      expect(perms.find((p) => p.module === "REPORTS")?.access).toBe("VIEW");
    });

    it("returns NONE on SETTINGS", () => {
      const perms = getDefaultPermissions("PHARMACIST");
      expect(perms.find((p) => p.module === "SETTINGS")?.access).toBe("NONE");
    });

    it("returns NONE on TEAM", () => {
      const perms = getDefaultPermissions("PHARMACIST");
      expect(perms.find((p) => p.module === "TEAM")?.access).toBe("NONE");
    });
  });

  describe("TECHNICIAN", () => {
    it("returns VIEW on PROVIDERS", () => {
      const perms = getDefaultPermissions("TECHNICIAN");
      expect(perms.find((p) => p.module === "PROVIDERS")?.access).toBe("VIEW");
    });

    it("returns EDIT on TIME_TRACKING", () => {
      const perms = getDefaultPermissions("TECHNICIAN");
      expect(perms.find((p) => p.module === "TIME_TRACKING")?.access).toBe("EDIT");
    });

    it("returns NONE on PRESCRIPTIONS", () => {
      const perms = getDefaultPermissions("TECHNICIAN");
      expect(perms.find((p) => p.module === "PRESCRIPTIONS")?.access).toBe("NONE");
    });

    it("returns NONE on DRUG_REPS", () => {
      const perms = getDefaultPermissions("TECHNICIAN");
      expect(perms.find((p) => p.module === "DRUG_REPS")?.access).toBe("NONE");
    });

    it("returns NONE on TEAM", () => {
      const perms = getDefaultPermissions("TECHNICIAN");
      expect(perms.find((p) => p.module === "TEAM")?.access).toBe("NONE");
    });

    it("returns NONE on REPORTS", () => {
      const perms = getDefaultPermissions("TECHNICIAN");
      expect(perms.find((p) => p.module === "REPORTS")?.access).toBe("NONE");
    });

    it("returns NONE on SETTINGS", () => {
      const perms = getDefaultPermissions("TECHNICIAN");
      expect(perms.find((p) => p.module === "SETTINGS")?.access).toBe("NONE");
    });
  });
});

describe("getDefaultAccess", () => {
  it("returns FULL for OWNER on any module", () => {
    for (const mod of ALL_MODULES) {
      expect(getDefaultAccess("OWNER", mod)).toBe("FULL");
    }
  });

  it("returns FULL for PHARMACIST on PROVIDERS", () => {
    expect(getDefaultAccess("PHARMACIST", "PROVIDERS")).toBe("FULL");
  });

  it("returns VIEW for PHARMACIST on REPORTS", () => {
    expect(getDefaultAccess("PHARMACIST", "REPORTS")).toBe("VIEW");
  });

  it("returns NONE for PHARMACIST on SETTINGS", () => {
    expect(getDefaultAccess("PHARMACIST", "SETTINGS")).toBe("NONE");
  });

  it("returns NONE for PHARMACIST on TEAM", () => {
    expect(getDefaultAccess("PHARMACIST", "TEAM")).toBe("NONE");
  });

  it("returns VIEW for TECHNICIAN on PROVIDERS", () => {
    expect(getDefaultAccess("TECHNICIAN", "PROVIDERS")).toBe("VIEW");
  });

  it("returns EDIT for TECHNICIAN on TIME_TRACKING", () => {
    expect(getDefaultAccess("TECHNICIAN", "TIME_TRACKING")).toBe("EDIT");
  });

  it("returns NONE for TECHNICIAN on PRESCRIPTIONS", () => {
    expect(getDefaultAccess("TECHNICIAN", "PRESCRIPTIONS")).toBe("NONE");
  });
});

describe("isRoleEditable", () => {
  it("returns false for OWNER", () => {
    expect(isRoleEditable("OWNER")).toBe(false);
  });

  it("returns true for PHARMACIST", () => {
    expect(isRoleEditable("PHARMACIST")).toBe(true);
  });

  it("returns true for TECHNICIAN", () => {
    expect(isRoleEditable("TECHNICIAN")).toBe(true);
  });
});

describe("meetsAccessLevel", () => {
  describe("FULL user access", () => {
    it("meets FULL requirement", () => {
      expect(meetsAccessLevel("FULL", "FULL")).toBe(true);
    });

    it("meets EDIT requirement", () => {
      expect(meetsAccessLevel("FULL", "EDIT")).toBe(true);
    });

    it("meets VIEW requirement", () => {
      expect(meetsAccessLevel("FULL", "VIEW")).toBe(true);
    });

    it("meets NONE requirement", () => {
      expect(meetsAccessLevel("FULL", "NONE")).toBe(true);
    });
  });

  describe("EDIT user access", () => {
    it("does not meet FULL requirement", () => {
      expect(meetsAccessLevel("EDIT", "FULL")).toBe(false);
    });

    it("meets EDIT requirement", () => {
      expect(meetsAccessLevel("EDIT", "EDIT")).toBe(true);
    });

    it("meets VIEW requirement", () => {
      expect(meetsAccessLevel("EDIT", "VIEW")).toBe(true);
    });

    it("meets NONE requirement", () => {
      expect(meetsAccessLevel("EDIT", "NONE")).toBe(true);
    });
  });

  describe("VIEW user access", () => {
    it("does not meet FULL requirement", () => {
      expect(meetsAccessLevel("VIEW", "FULL")).toBe(false);
    });

    it("does not meet EDIT requirement", () => {
      expect(meetsAccessLevel("VIEW", "EDIT")).toBe(false);
    });

    it("meets VIEW requirement", () => {
      expect(meetsAccessLevel("VIEW", "VIEW")).toBe(true);
    });

    it("meets NONE requirement", () => {
      expect(meetsAccessLevel("VIEW", "NONE")).toBe(true);
    });
  });

  describe("NONE user access", () => {
    it("does not meet FULL requirement", () => {
      expect(meetsAccessLevel("NONE", "FULL")).toBe(false);
    });

    it("does not meet EDIT requirement", () => {
      expect(meetsAccessLevel("NONE", "EDIT")).toBe(false);
    });

    it("does not meet VIEW requirement", () => {
      expect(meetsAccessLevel("NONE", "VIEW")).toBe(false);
    });

    it("meets NONE requirement", () => {
      expect(meetsAccessLevel("NONE", "NONE")).toBe(true);
    });
  });
});

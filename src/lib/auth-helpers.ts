import { auth } from "./auth";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { Module, Access } from "@/generated/prisma/client";
import { meetsAccessLevel } from "./permissions";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireOrgAccess() {
  const session = await requireAuth();
  if (!session.user.organizationId) {
    redirect("/signup");
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireOrgAccess();
  if (!roles.includes(session.user.role)) {
    redirect("/app/dashboard");
  }
  return session;
}

export async function getUserModuleAccess(
  userId: string,
  module: Module
): Promise<Access> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return "NONE";
  if (user.role === "OWNER") return "FULL";

  const permission = await db.permission.findUnique({
    where: { userId_module: { userId, module } },
  });

  return permission?.access ?? "NONE";
}

export async function requireModuleAccess(
  module: Module,
  minimumAccess: Access
) {
  const session = await requireOrgAccess();
  const access = await getUserModuleAccess(session.user.id, module);

  if (!meetsAccessLevel(access, minimumAccess)) {
    redirect("/app/dashboard");
  }

  return { session, access };
}

export async function checkApiAuth() {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return null;
  }
  return session;
}

export async function checkApiModuleAccess(
  userId: string,
  module: Module,
  minimumAccess: Access
): Promise<{ allowed: boolean; access: Access }> {
  const access = await getUserModuleAccess(userId, module);
  return {
    allowed: meetsAccessLevel(access, minimumAccess),
    access,
  };
}

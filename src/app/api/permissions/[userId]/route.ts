import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog, AuditActions } from "@/lib/audit";
import { ALL_MODULES } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;

  const permissions = await db.permission.findMany({
    where: {
      userId,
      organizationId: session.user.organizationId,
    },
    select: { module: true, access: true },
  });

  return NextResponse.json(permissions);
}

const updatePermissionsSchema = z.object({
  permissions: z.array(
    z.object({
      module: z.enum([
        "PROVIDERS",
        "PRESCRIPTIONS",
        "DRUG_REPS",
        "TIME_TRACKING",
        "TEAM",
        "REPORTS",
        "SETTINGS",
      ]),
      access: z.enum(["NONE", "VIEW", "EDIT", "FULL"]),
    })
  ),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(
    session.user.id,
    "TEAM",
    "FULL"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { userId } = await params;
    const body = await req.json();
    const { permissions } = updatePermissionsSchema.parse(body);

    // Check target user is not OWNER
    const targetUser = await db.user.findUnique({
      where: { id: userId, organizationId: session.user.organizationId },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot modify owner permissions" },
        { status: 403 }
      );
    }

    // Upsert each permission
    for (const perm of permissions) {
      await db.permission.upsert({
        where: { userId_module: { userId, module: perm.module } },
        update: { access: perm.access },
        create: {
          userId,
          organizationId: session.user.organizationId,
          module: perm.module,
          access: perm.access,
        },
      });
    }

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditActions.USER_PERMISSIONS_UPDATED,
      entityType: "user",
      entityId: userId,
      metadata: { permissions },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/permissions/[userId] error:", error);
    return NextResponse.json(
      { error: "Failed to update permissions" },
      { status: 500 }
    );
  }
}

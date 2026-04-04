import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog, AuditActions } from "@/lib/audit";

export async function GET() {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await db.organization.findUnique({
    where: { id: session.user.organizationId },
    select: {
      id: true,
      name: true,
      timezone: true,
      plan: true,
      trialEndsAt: true,
      brandColor: true,
      logoUrl: true,
      brandName: true,
      createdAt: true,
    },
  });

  return NextResponse.json(org);
}

const updateSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  timezone: z.string().optional(),
  brandColor: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  brandName: z.string().nullable().optional(),
});

export async function PUT(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(
    session.user.id,
    "SETTINGS",
    "EDIT"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = updateSettingsSchema.parse(body);

    const org = await db.organization.update({
      where: { id: session.user.organizationId },
      data,
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditActions.SETTINGS_UPDATED,
      entityType: "organization",
      entityId: session.user.organizationId,
      metadata: data,
    });

    return NextResponse.json(org);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

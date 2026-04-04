import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDefaultPermissions } from "@/lib/permissions";
import { writeAuditLog, AuditActions } from "@/lib/audit";

const setupOrgSchema = z.object({
  pharmacyName: z.string().min(1, "Pharmacy name is required"),
  timezone: z.string(),
  locationName: z.string().min(1, "Location name is required"),
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  locationZip: z.string().optional(),
  locationPhone: z.string().optional(),
  locationNpi: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = setupOrgSchema.parse(body);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const org = await db.organization.create({
      data: {
        name: data.pharmacyName,
        timezone: data.timezone,
        trialEndsAt,
      },
    });

    const location = await db.location.create({
      data: {
        organizationId: org.id,
        name: data.locationName,
        address: data.locationAddress,
        city: data.locationCity,
        state: data.locationState,
        zip: data.locationZip,
        phone: data.locationPhone,
        npiNumber: data.locationNpi,
      },
    });

    await db.user.update({
      where: { id: session.user.id },
      data: {
        organizationId: org.id,
        locationId: location.id,
        role: "OWNER",
      },
    });

    const defaultPerms = getDefaultPermissions("OWNER");
    await db.permission.createMany({
      data: defaultPerms.map((p) => ({
        userId: session.user.id,
        organizationId: org.id,
        module: p.module,
        access: p.access,
      })),
    });

    await writeAuditLog({
      organizationId: org.id,
      userId: session.user.id,
      action: AuditActions.ORGANIZATION_CREATED,
      entityType: "organization",
      entityId: org.id,
      metadata: { name: data.pharmacyName, locationName: data.locationName },
    });

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      locationId: location.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/auth/setup-org error:", error);
    return NextResponse.json(
      { error: "Failed to set up organization" },
      { status: 500 }
    );
  }
}

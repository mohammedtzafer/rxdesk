import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog, AuditActions } from "@/lib/audit";

const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  npiNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
});

export async function GET() {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locations = await db.location.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      phone: true,
      npiNumber: true,
      licenseNumber: true,
      isActive: true,
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json(locations);
}

export async function POST(req: Request) {
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
    const data = createLocationSchema.parse(body);

    // Check plan limits
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { plan: true },
    });

    const locationCount = await db.location.count({
      where: { organizationId: session.user.organizationId, isActive: true },
    });

    const limits: Record<string, number> = {
      STARTER: 1,
      GROWTH: 3,
      PRO: 999,
    };

    if (locationCount >= (limits[org?.plan ?? "STARTER"] ?? 1)) {
      return NextResponse.json(
        { error: "Location limit reached for your plan. Please upgrade." },
        { status: 403 }
      );
    }

    const location = await db.location.create({
      data: {
        organizationId: session.user.organizationId,
        ...data,
      },
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditActions.LOCATION_CREATED,
      entityType: "location",
      entityId: location.id,
      metadata: { name: data.name },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/locations error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}

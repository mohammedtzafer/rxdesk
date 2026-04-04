import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const updateLocationsSchema = z.object({
  locationIds: z.array(z.string()).min(1, "At least one location required"),
  primaryLocationId: z.string(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const userLocations = await db.userLocation.findMany({
    where: { userId: id },
    select: {
      locationId: true,
      isPrimary: true,
      location: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(userLocations);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TEAM", "EDIT");
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { locationIds, primaryLocationId } = updateLocationsSchema.parse(body);

    // Verify primary is in the list
    if (!locationIds.includes(primaryLocationId)) {
      return NextResponse.json(
        { error: "Primary location must be in the locations list" },
        { status: 400 }
      );
    }

    // Verify all locations belong to the org
    const validLocations = await db.location.findMany({
      where: {
        id: { in: locationIds },
        organizationId: session.user.organizationId,
      },
      select: { id: true },
    });

    if (validLocations.length !== locationIds.length) {
      return NextResponse.json({ error: "Invalid location IDs" }, { status: 400 });
    }

    // Verify user belongs to the org
    const targetUser = await db.user.findUnique({
      where: { id, organizationId: session.user.organizationId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete existing and recreate
    await db.userLocation.deleteMany({ where: { userId: id } });
    await db.userLocation.createMany({
      data: locationIds.map((locId) => ({
        userId: id,
        locationId: locId,
        isPrimary: locId === primaryLocationId,
      })),
    });

    // Update primary location on user
    await db.user.update({
      where: { id, organizationId: session.user.organizationId },
      data: { locationId: primaryLocationId },
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "user.locations_updated",
      entityType: "user",
      entityId: id,
      metadata: { locationIds, primaryLocationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("PUT /api/team/[id]/locations error:", error);
    return NextResponse.json({ error: "Failed to update locations" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog, AuditActions } from "@/lib/audit";

const updateUserSchema = z.object({
  role: z.enum(["PHARMACIST", "TECHNICIAN"]).optional(),
  locationId: z.string().nullable().optional(),
  active: z.boolean().optional(),
  locationIds: z.array(z.string()).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(
    session.user.id,
    "TEAM",
    "EDIT"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    // Prevent modifying OWNER
    const targetUser = await db.user.findUnique({
      where: { id, organizationId: session.user.organizationId },
      select: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot modify the owner account" },
        { status: 403 }
      );
    }

    // Handle multi-location update if locationIds provided
    if (data.locationIds && data.locationIds.length > 0) {
      // The first locationId is treated as primary
      const primaryLocationId = data.locationIds[0];

      // Verify all locations belong to the org
      const validLocations = await db.location.findMany({
        where: {
          id: { in: data.locationIds },
          organizationId: session.user.organizationId,
        },
        select: { id: true },
      });

      if (validLocations.length !== data.locationIds.length) {
        return NextResponse.json(
          { error: "Invalid location IDs" },
          { status: 400 }
        );
      }

      await db.userLocation.deleteMany({ where: { userId: id } });
      await db.userLocation.createMany({
        data: data.locationIds.map((locId) => ({
          userId: id,
          locationId: locId,
          isPrimary: locId === primaryLocationId,
        })),
      });

      // Also update the primary locationId on the user record
      data.locationId = primaryLocationId;
    }

    const user = await db.user.update({
      where: { id, organizationId: session.user.organizationId },
      data: {
        ...(data.role && { role: data.role }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.active !== undefined && { active: data.active }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        locationId: true,
      },
    });

    if (data.active === false) {
      await writeAuditLog({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: AuditActions.USER_DEACTIVATED,
        entityType: "user",
        entityId: id,
      });
    } else if (data.active === true) {
      await writeAuditLog({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: AuditActions.USER_REACTIVATED,
        entityType: "user",
        entityId: id,
      });
    }

    if (data.role) {
      await writeAuditLog({
        organizationId: session.user.organizationId,
        userId: session.user.id,
        action: AuditActions.USER_ROLE_CHANGED,
        entityType: "user",
        entityId: id,
        metadata: { newRole: data.role },
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("PUT /api/team/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { DAYS_OF_WEEK } from "@/lib/schedule-types";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    active: true,
  };
  if (locationId) where.locationId = locationId;

  const users = await db.user.findMany({
    where,
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      targetHoursPerWeek: true,
      sortOrder: true,
      locationId: true,
    },
  });

  // Get availability preferences for each user
  const userIds = users.map((u) => u.id);
  const availabilities = await db.availabilityPreference.findMany({
    where: {
      employeeId: { in: userIds },
      organizationId: session.user.organizationId,
    },
  });

  // Build availability map: userId -> dayName -> avail data
  const availMap = new Map<string, Record<string, { available: boolean; startTime: string; endTime: string; role: string }>>();
  for (const a of availabilities) {
    if (!availMap.has(a.employeeId)) availMap.set(a.employeeId, {});
    const dayMap = availMap.get(a.employeeId)!;
    // Convert enum "MONDAY" -> "Monday"
    const dayName = a.dayOfWeek.charAt(0) + a.dayOfWeek.slice(1).toLowerCase();
    dayMap[dayName] = {
      available: a.state !== "UNAVAILABLE",
      startTime: a.startTime || "9:00 AM",
      endTime: a.endTime || "5:00 PM",
      role: "Filling", // default role — not stored on AvailabilityPreference
    };
  }

  const employees = users.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    targetHoursPerWeek: u.targetHoursPerWeek,
    sortOrder: u.sortOrder,
    locationId: u.locationId,
    availability: Object.fromEntries(
      DAYS_OF_WEEK.map((day) => [
        day,
        availMap.get(u.id)?.[day] || { available: true, startTime: "9:00 AM", endTime: "5:00 PM", role: "Filling" },
      ])
    ),
  }));

  return NextResponse.json(employees);
}

const updateAvailabilitySchema = z.object({
  userId: z.string(),
  targetHoursPerWeek: z.number().int().min(0).max(80).optional(),
  availability: z.record(z.object({
    available: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    role: z.string(),
  })).optional(),
});

export async function PUT(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = updateAvailabilitySchema.parse(body);

    if (data.targetHoursPerWeek !== undefined) {
      await db.user.update({
        where: { id: data.userId, organizationId: session.user.organizationId },
        data: { targetHoursPerWeek: data.targetHoursPerWeek },
      });
    }

    if (data.availability) {
      // Map day names to enum values
      const dayEnumMap: Record<string, string> = {
        Monday: "MONDAY", Tuesday: "TUESDAY", Wednesday: "WEDNESDAY",
        Thursday: "THURSDAY", Friday: "FRIDAY", Saturday: "SATURDAY",
      };

      for (const [day, avail] of Object.entries(data.availability)) {
        const enumDay = dayEnumMap[day];
        if (!enumDay) continue;

        await db.availabilityPreference.upsert({
          where: {
            employeeId_dayOfWeek: {
              employeeId: data.userId,
              dayOfWeek: enumDay as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY",
            },
          },
          update: {
            state: avail.available ? "HOURS" : "UNAVAILABLE",
            startTime: avail.startTime,
            endTime: avail.endTime,
          },
          create: {
            employeeId: data.userId,
            organizationId: session.user.organizationId,
            dayOfWeek: enumDay as "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY",
            state: avail.available ? "HOURS" : "UNAVAILABLE",
            startTime: avail.startTime,
            endTime: avail.endTime,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("PUT /api/employees error:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

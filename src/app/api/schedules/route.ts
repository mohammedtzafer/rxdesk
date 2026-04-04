import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { notifySchedulePublished, notifyScheduleUpdated } from "@/lib/notifications";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const locationId = url.searchParams.get("locationId");
  const weekStart = url.searchParams.get("weekStart");

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
  };
  if (locationId) where.locationId = locationId;
  if (weekStart) where.weekStart = weekStart;

  const schedules = await db.weeklySchedule.findMany({
    where,
    include: {
      entries: { orderBy: { employeeName: "asc" } },
      comments: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { weekStart: "desc" },
    take: 20,
  });

  return NextResponse.json(schedules);
}

const saveScheduleSchema = z.object({
  locationId: z.string(),
  weekStart: z.string(),
  status: z.enum(["Not Started", "In Progress", "Finalized"]),
  entries: z.array(z.object({
    employeeId: z.string(),
    employeeName: z.string(),
    day: z.string(),
    available: z.boolean(),
    startTime: z.string(),
    endTime: z.string(),
    role: z.string(),
  })),
  comment: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = saveScheduleSchema.parse(body);

    // Check if schedule exists
    const existing = await db.weeklySchedule.findUnique({
      where: {
        locationId_weekStart: {
          locationId: data.locationId,
          weekStart: data.weekStart,
        },
      },
      select: { id: true, status: true },
    });

    const wasFinalized = existing?.status === "Finalized";
    const nowFinalized = data.status === "Finalized";

    let schedule;

    if (existing) {
      // Delete old entries and replace
      await db.scheduleEntry.deleteMany({ where: { scheduleId: existing.id } });

      schedule = await db.weeklySchedule.update({
        where: { id: existing.id },
        data: {
          status: data.status,
          lastUpdated: new Date(),
          finalizedAt: nowFinalized && !wasFinalized ? new Date() : undefined,
          entries: {
            createMany: {
              data: data.entries.map((e) => ({
                employeeId: e.employeeId,
                employeeName: e.employeeName,
                day: e.day,
                available: e.available,
                startTime: e.startTime,
                endTime: e.endTime,
                role: e.role,
              })),
            },
          },
          ...(data.comment
            ? { comments: { create: { text: data.comment } } }
            : {}),
        },
        include: {
          entries: true,
          comments: { orderBy: { createdAt: "asc" } },
        },
      });
    } else {
      schedule = await db.weeklySchedule.create({
        data: {
          organizationId: session.user.organizationId,
          locationId: data.locationId,
          weekStart: data.weekStart,
          status: data.status,
          finalizedAt: nowFinalized ? new Date() : null,
          entries: {
            createMany: {
              data: data.entries.map((e) => ({
                employeeId: e.employeeId,
                employeeName: e.employeeName,
                day: e.day,
                available: e.available,
                startTime: e.startTime,
                endTime: e.endTime,
                role: e.role,
              })),
            },
          },
          ...(data.comment
            ? { comments: { create: { text: data.comment } } }
            : {}),
        },
        include: {
          entries: true,
          comments: { orderBy: { createdAt: "asc" } },
        },
      });
    }

    // Send notifications
    const affectedEmployeeIds = [...new Set(data.entries.filter(e => e.available).map(e => e.employeeId))];

    if (nowFinalized && !wasFinalized) {
      // Schedule just finalized — notify employees
      notifySchedulePublished(
        session.user.organizationId,
        affectedEmployeeIds,
        `week of ${data.weekStart}`
      ).catch(() => {});
    } else if (wasFinalized && data.status === "Finalized") {
      // Finalized schedule was updated — notify employees
      notifyScheduleUpdated(
        session.user.organizationId,
        affectedEmployeeIds,
        `week of ${data.weekStart}`
      ).catch(() => {});
    }

    return NextResponse.json(schedule);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/schedules error:", error);
    return NextResponse.json({ error: "Failed to save schedule" }, { status: 500 });
  }
}

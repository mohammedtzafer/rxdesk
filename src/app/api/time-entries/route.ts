import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const createEntrySchema = z.object({
  date: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  note: z.string().optional(),
  breakMinutes: z.number().int().min(0).optional(),
  locationId: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const userId = url.searchParams.get("userId") || session.user.id;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    userId,
  };

  if (startDate && endDate) {
    where.date = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const entries = await db.timeEntry.findMany({
    where,
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      durationMinutes: true,
      regularHours: true,
      overtimeHours: true,
      breakMinutes: true,
      breakType: true,
      note: true,
      isClockIn: true,
    },
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createEntrySchema.parse(body);

    const startTime = new Date(data.startTime);
    const endTime = data.endTime ? new Date(data.endTime) : null;
    const durationMinutes = endTime
      ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
      : null;

    const entry = await db.timeEntry.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        locationId: data.locationId || session.user.locationId,
        date: new Date(data.date),
        startTime,
        endTime,
        durationMinutes,
        regularHours: durationMinutes ? durationMinutes / 60 : 0,
        breakMinutes: data.breakMinutes || 0,
        note: data.note,
      },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/time-entries error:", error);
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 });
  }
}

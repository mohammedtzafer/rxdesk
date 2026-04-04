import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check for open clock-in entry
  const openEntry = await db.timeEntry.findFirst({
    where: {
      userId: session.user.id,
      organizationId: session.user.organizationId,
      isClockIn: true,
      endTime: null,
    },
    orderBy: { startTime: "desc" },
  });

  if (openEntry) {
    // Clock out
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - openEntry.startTime.getTime()) / 60000);

    const updated = await db.timeEntry.update({
      where: { id: openEntry.id },
      data: {
        endTime: now,
        durationMinutes,
        regularHours: durationMinutes / 60,
      },
    });

    return NextResponse.json({ action: "clock_out", entry: updated });
  } else {
    // Clock in
    const now = new Date();
    const entry = await db.timeEntry.create({
      data: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        locationId: session.user.locationId,
        date: now,
        startTime: now,
        isClockIn: true,
      },
    });

    return NextResponse.json({ action: "clock_in", entry });
  }
}

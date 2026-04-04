import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { notifyPtoSubmitted } from "@/lib/notifications";
import { format } from "date-fns";

const createPtoSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(["VACATION", "SICK", "PERSONAL", "OTHER"]),
  note: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const employeeId = url.searchParams.get("employeeId") || undefined;

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
  };
  if (status) where.status = status;
  if (employeeId) where.employeeId = employeeId;

  // Non-managers can only see their own
  if (session.user.role === "TECHNICIAN") {
    where.employeeId = session.user.id;
  }

  const requests = await db.ptoRequest.findMany({
    where,
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      employeeId: true,
      startDate: true,
      endDate: true,
      type: true,
      note: true,
      status: true,
      responseNote: true,
      submittedAt: true,
      reviewedAt: true,
    },
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createPtoSchema.parse(body);

    const pto = await db.ptoRequest.create({
      data: {
        employeeId: session.user.id,
        organizationId: session.user.organizationId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        type: data.type,
        note: data.note,
      },
    });

    // Notify managers
    const dateRange = `${format(new Date(data.startDate), "MMM d")} – ${format(new Date(data.endDate), "MMM d, yyyy")}`;
    notifyPtoSubmitted(
      session.user.organizationId,
      session.user.name || "An employee",
      pto.id,
      dateRange
    ).catch(() => {});

    return NextResponse.json(pto, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/pto error:", error);
    return NextResponse.json({ error: "Failed to create PTO request" }, { status: 500 });
  }
}

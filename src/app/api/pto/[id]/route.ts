import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { notifyPtoApproved, notifyPtoDenied } from "@/lib/notifications";
import { format } from "date-fns";

const reviewSchema = z.object({
  action: z.enum(["approve", "deny"]),
  responseNote: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Requires at least EDIT on TIME_TRACKING (managers)
  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "FULL");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, responseNote } = reviewSchema.parse(body);

    const pto = await db.ptoRequest.findUnique({
      where: { id, organizationId: session.user.organizationId },
      select: { id: true, employeeId: true, startDate: true, endDate: true, status: true },
    });

    if (!pto) return NextResponse.json({ error: "PTO request not found" }, { status: 404 });
    if (pto.status !== "PENDING") return NextResponse.json({ error: "Request already reviewed" }, { status: 400 });

    const newStatus = action === "approve" ? "APPROVED" : "DENIED";

    await db.ptoRequest.update({
      where: { id },
      data: {
        status: newStatus,
        responseNote,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    const dateRange = `${format(pto.startDate, "MMM d")} – ${format(pto.endDate, "MMM d, yyyy")}`;

    if (action === "approve") {
      notifyPtoApproved(session.user.organizationId, pto.employeeId, dateRange).catch(() => {});
    } else {
      notifyPtoDenied(session.user.organizationId, pto.employeeId, dateRange, responseNote).catch(() => {});
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/pto/[id] error:", error);
    return NextResponse.json({ error: "Failed to review PTO request" }, { status: 500 });
  }
}

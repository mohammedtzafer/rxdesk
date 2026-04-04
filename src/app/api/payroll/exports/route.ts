import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET() {
  const session = await checkApiAuth();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(
    session.user.id,
    "REPORTS",
    "VIEW"
  );
  if (!allowed)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const exports = await db.payrollExport.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      format: true,
      periodStart: true,
      periodEnd: true,
      totalEmployees: true,
      totalHours: true,
      totalOvertimeHours: true,
      fileName: true,
      status: true,
      createdAt: true,
    },
  });

  return NextResponse.json(exports);
}

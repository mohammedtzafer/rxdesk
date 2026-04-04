import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { generatePayrollExport, calculatePayrollEntries } from "@/lib/payroll";
import type { PayrollFormat } from "@/lib/payroll";

const exportSchema = z.object({
  format: z.enum(["ADP", "PAYCHEX", "GUSTO", "CSV", "GENERIC"]),
  periodStart: z.string(),
  periodEnd: z.string(),
  locationId: z.string().optional(),
  companyCode: z.string().optional(),
});

export async function POST(req: Request) {
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

  try {
    const body = await req.json();
    const data = exportSchema.parse(body);

    const where: Record<string, unknown> = {
      organizationId: session.user.organizationId,
      date: {
        gte: new Date(data.periodStart),
        lte: new Date(data.periodEnd),
      },
    };

    if (data.locationId) {
      where.locationId = data.locationId;
    }

    // Fetch time entries with user and location info
    const timeEntries = await db.timeEntry.findMany({
      where,
      select: {
        userId: true,
        date: true,
        regularHours: true,
        overtimeHours: true,
        breakMinutes: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            location: { select: { name: true } },
          },
        },
      },
    });

    const entries = timeEntries.map((te) => ({
      userId: te.userId,
      userName: te.user.name || te.user.email,
      userEmail: te.user.email,
      locationName: te.user.location?.name || "Unassigned",
      date: te.date.toISOString().split("T")[0],
      regularHours: te.regularHours,
      overtimeHours: te.overtimeHours,
      breakMinutes: te.breakMinutes,
    }));

    const payrollEntries = calculatePayrollEntries(
      entries,
      data.periodStart,
      data.periodEnd
    );

    const csv = generatePayrollExport(
      payrollEntries,
      data.format as PayrollFormat,
      data.companyCode
    );

    // Record the export
    const totalHours = payrollEntries.reduce((sum, e) => sum + e.totalHours, 0);
    const totalOT = payrollEntries.reduce(
      (sum, e) => sum + e.overtimeHours,
      0
    );

    const fileName = `payroll-${data.format.toLowerCase()}-${data.periodStart}-to-${data.periodEnd}.csv`;

    await db.payrollExport.create({
      data: {
        organizationId: session.user.organizationId,
        locationId: data.locationId,
        format: data.format,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        totalEmployees: payrollEntries.length,
        totalHours: Math.round(totalHours * 100) / 100,
        totalOvertimeHours: Math.round(totalOT * 100) / 100,
        fileName,
        createdById: session.user.id,
      },
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    console.error("POST /api/payroll/export error:", error);
    return NextResponse.json(
      { error: "Failed to generate export" },
      { status: 500 }
    );
  }
}

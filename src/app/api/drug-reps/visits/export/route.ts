import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/report-utils";
import { format } from "date-fns";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isDrugRep = session.user.role === "DRUG_REP";
  if (!isDrugRep) {
    const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "VIEW");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const exportFormat = url.searchParams.get("format");
  const startDateStr = url.searchParams.get("startDate");
  const endDateStr = url.searchParams.get("endDate");

  if (!exportFormat || !["csv", "pdf"].includes(exportFormat)) {
    return NextResponse.json({ error: "format must be csv or pdf" }, { status: 400 });
  }
  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  const orgId = session.user.organizationId!;

  const visits = await db.drugRepVisit.findMany({
    where: {
      organizationId: orgId,
      visitDate: { gte: startDate, lte: endDate },
    },
    orderBy: { visitDate: "asc" },
    select: {
      id: true,
      visitDate: true,
      notes: true,
      drugRep: { select: { firstName: true, lastName: true, company: true } },
      providers: {
        select: {
          provider: {
            select: { id: true, firstName: true, lastName: true, npi: true, practiceName: true },
          },
        },
      },
    },
  });

  function parseNotesHeader(notes: string | null) {
    if (!notes) return { startTime: "", endTime: "", lunchProvided: false, body: "" };
    const match = notes.match(/^\[(.+?) – (.+?)\] \[Lunch: (Yes|No)\]/);
    if (!match) return { startTime: "", endTime: "", lunchProvided: false, body: notes };
    const body = notes.replace(/^\[.+? – .+?\] \[Lunch: (?:Yes|No)\]\n?/, "");
    return { startTime: match[1], endTime: match[2], lunchProvided: match[3] === "Yes", body };
  }

  const visitRows = visits.map((v) => {
    const { startTime, endTime, lunchProvided, body } = parseNotesHeader(v.notes);
    return {
      date: format(v.visitDate, "MM/dd/yyyy"),
      startTime,
      endTime,
      lunchProvided: lunchProvided ? "Yes" : "No",
      providers: v.providers.map((vp) => `${vp.provider.firstName} ${vp.provider.lastName}`).join("; "),
      npis: v.providers.map((vp) => vp.provider.npi).join("; "),
      practiceName: v.providers.map((vp) => vp.provider.practiceName || "").filter(Boolean).join("; "),
      notes: body,
      repName: `${v.drugRep.firstName} ${v.drugRep.lastName}`,
      company: v.drugRep.company,
    };
  });

  // CSV export
  if (exportFormat === "csv") {
    const csv = toCsv(
      ["date", "startTime", "endTime", "lunchProvided", "providers", "npis", "practiceName", "notes", "repName", "company"],
      visitRows as unknown as Record<string, unknown>[]
    );
    return csvResponse(csv, `visits-export-${startDateStr}-${endDateStr}.csv`);
  }

  // PDF export — cross-reference prescription data
  const providerIds = [...new Set(visits.flatMap((v) => v.providers.map((vp) => vp.provider.id)))];

  const rxRecords = providerIds.length > 0
    ? await db.prescriptionRecord.findMany({
        where: {
          organizationId: orgId,
          providerId: { in: providerIds },
          fillDate: { gte: startDate, lte: endDate },
        },
        select: {
          drugName: true,
          drugNdc: true,
          isGeneric: true,
          status: true,
          providerId: true,
          provider: { select: { firstName: true, lastName: true, npi: true } },
        },
      })
    : [];

  // Drug summary
  const drugMap = new Map<string, { name: string; ndc: string; total: number; billed: number; filed: number; unbilled: number; isBrand: boolean }>();
  for (const rx of rxRecords) {
    const key = rx.drugNdc || rx.drugName;
    const existing = drugMap.get(key) || {
      name: rx.drugName,
      ndc: rx.drugNdc || "—",
      total: 0,
      billed: 0,
      filed: 0,
      unbilled: 0,
      isBrand: !rx.isGeneric,
    };
    existing.total++;
    if (rx.status === "B") existing.billed++;
    else if (rx.status === "F") existing.filed++;
    else if (rx.status === "U") existing.unbilled++;
    else existing.billed++;
    drugMap.set(key, existing);
  }

  const drugSummary = Array.from(drugMap.values()).sort((a, b) => b.total - a.total);

  // Provider summary
  const providerMap = new Map<string, { name: string; npi: string; total: number; brand: number; generic: number; filed: number }>();
  for (const rx of rxRecords) {
    if (!rx.providerId || !rx.provider) continue;
    const key = rx.providerId;
    const existing = providerMap.get(key) || {
      name: `${rx.provider.firstName} ${rx.provider.lastName}`,
      npi: rx.provider.npi,
      total: 0,
      brand: 0,
      generic: 0,
      filed: 0,
    };
    existing.total++;
    if (rx.isGeneric) existing.generic++;
    else existing.brand++;
    if (rx.status === "F") existing.filed++;
    providerMap.set(key, existing);
  }

  const providerSummary = Array.from(providerMap.values()).sort((a, b) => b.total - a.total);

  // Generate PDF
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  // Page 1: Header + detailed visit log
  doc.setFontSize(18);
  doc.text("Visit Report", 40, 40);
  doc.setFontSize(11);
  doc.text(`${format(startDate, "MM/dd/yyyy")} — ${format(endDate, "MM/dd/yyyy")}`, 40, 58);

  const repName = visitRows[0]?.repName || "—";
  const company = visitRows[0]?.company || "—";
  doc.setFontSize(10);
  doc.text(`Rep: ${repName}  |  Company: ${company}  |  Exported: ${format(new Date(), "MM/dd/yyyy")}`, 40, 74);

  (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
    startY: 90,
    head: [["Date", "Time", "Provider(s)", "Practice", "Lunch", "Notes"]],
    body: visitRows.map((r) => [r.date, `${r.startTime} – ${r.endTime}`, r.providers, r.practiceName, r.lunchProvided, r.notes.slice(0, 80)]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [0, 113, 227] },
    columnStyles: { 5: { cellWidth: 150 } },
    margin: { left: 40, right: 40 },
  });

  // Summary page
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Summary", 40, 40);

  const totalVisits = visits.length;
  const uniqueProviders = providerIds.length;
  const lunchCount = visitRows.filter((r) => r.lunchProvided === "Yes").length;
  doc.setFontSize(10);
  doc.text(`Total visits: ${totalVisits}  |  Unique providers: ${uniqueProviders}  |  Lunches: ${lunchCount}  |  Total scripts: ${rxRecords.length}`, 40, 60);

  if (drugSummary.length > 0) {
    doc.setFontSize(12);
    doc.text("Script summary by drug", 40, 82);

    (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
      startY: 92,
      head: [["Drug name", "NDC", "Total", "Billed", "Filed", "Unbilled", "Brand"]],
      body: drugSummary.map((d) => [d.name.slice(0, 50), d.ndc, d.total, d.billed, d.filed, d.unbilled, d.isBrand ? "Y" : "N"]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [0, 113, 227] },
      margin: { left: 40, right: 40 },
    });
  }

  if (providerSummary.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Script summary by provider", 40, 40);

    (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
      startY: 55,
      head: [["Provider", "NPI", "Total Rx", "Brand", "Generic", "Filed", "Filed %"]],
      body: providerSummary.map((p) => [
        p.name,
        p.npi,
        p.total,
        p.brand,
        p.generic,
        p.filed,
        p.total > 0 ? `${Math.round((p.filed / p.total) * 100)}%` : "0%",
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [0, 113, 227] },
      margin: { left: 40, right: 40 },
    });
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="visit-report-${startDateStr}-${endDateStr}.pdf"`,
    },
  });
}

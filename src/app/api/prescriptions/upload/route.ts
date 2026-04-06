import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseCsvContent } from "@/lib/csv-parser";
import { writeAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(session.user.id, "PRESCRIPTIONS", "EDIT");
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const locationId = formData.get("locationId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are supported" }, { status: 400 });
    }

    // Check plan limits for Starter
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { plan: true },
    });

    if (org?.plan === "STARTER") {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const uploadCount = await db.prescriptionUpload.count({
        where: {
          organizationId: session.user.organizationId,
          createdAt: { gte: thisMonth },
        },
      });
      if (uploadCount >= 1) {
        return NextResponse.json(
          { error: "Upload limit reached for Starter plan (1/month). Please upgrade." },
          { status: 403 }
        );
      }
    }

    const content = await file.text();
    const { rows, errors, dateRangeStart, dateRangeEnd } = parseCsvContent(content);

    // Create upload record
    const upload = await db.prescriptionUpload.create({
      data: {
        organizationId: session.user.organizationId,
        locationId,
        uploadedById: session.user.id,
        fileName: file.name,
        status: "PROCESSING",
      },
    });

    if (rows.length === 0) {
      await db.prescriptionUpload.update({
        where: { id: upload.id },
        data: {
          status: "FAILED",
          errorMessage: errors.length > 0 ? errors[0].message : "No valid rows found",
          rowCount: 0,
        },
      });
      return NextResponse.json({
        uploadId: upload.id,
        status: "FAILED",
        rowCount: 0,
        errors,
      });
    }

    // Get existing providers in this org for NPI matching
    const existingProviders = await db.provider.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, npi: true },
    });
    const npiToProviderId = new Map(existingProviders.map((p) => [p.npi, p.id]));

    // Auto-create providers from CSV data if NPI not found
    const newNpis = new Set<string>();
    for (const row of rows) {
      if (!npiToProviderId.has(row.providerNpi) && !newNpis.has(row.providerNpi)) {
        newNpis.add(row.providerNpi);
        let firstName = "";
        let lastName = row.providerNpi;
        if (row.providerName) {
          const nameParts = row.providerName.replace(/\*$/, "").split(/\.\s*/);
          if (nameParts.length >= 2) {
            lastName = nameParts[0].trim();
            firstName = nameParts[1].trim();
          } else {
            lastName = row.providerName.replace(/\*$/, "").trim();
          }
        }

        try {
          const newProvider = await db.provider.create({
            data: {
              organizationId: session.user.organizationId,
              npi: row.providerNpi,
              firstName,
              lastName,
              practiceAddress: row.providerAddress,
              isActive: true,
            },
          });
          npiToProviderId.set(row.providerNpi, newProvider.id);

          if (row.providerAddress) {
            await db.providerAddress.create({
              data: {
                providerId: newProvider.id,
                organizationId: session.user.organizationId,
                address: row.providerAddress,
                isPrimary: true,
                source: "csv_upload",
              },
            });
          }
        } catch {
          const existing = await db.provider.findFirst({
            where: { organizationId: session.user.organizationId, npi: row.providerNpi },
            select: { id: true },
          });
          if (existing) npiToProviderId.set(row.providerNpi, existing.id);
        }
      }
    }

    // Auto-create additional addresses for existing providers
    const addressesSeen = new Set<string>();
    for (const row of rows) {
      if (!row.providerAddress) continue;
      const providerId = npiToProviderId.get(row.providerNpi);
      if (!providerId) continue;

      const normalizedAddr = row.providerAddress.toUpperCase().replace(/\s+/g, " ").trim();
      const key = `${providerId}:${normalizedAddr}`;
      if (addressesSeen.has(key)) continue;
      addressesSeen.add(key);

      const existingAddr = await db.providerAddress.findFirst({
        where: {
          providerId,
          address: { equals: row.providerAddress, mode: "insensitive" },
        },
      });

      if (!existingAddr) {
        try {
          await db.providerAddress.create({
            data: {
              providerId,
              organizationId: session.user.organizationId,
              address: row.providerAddress,
              isPrimary: false,
              source: "csv_upload",
            },
          });
        } catch {
          // Ignore duplicates
        }
      }
    }

    // Insert records in batches
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.prescriptionRecord.createMany({
        data: batch.map((row) => ({
          organizationId: session.user.organizationId,
          locationId,
          uploadId: upload.id,
          providerId: npiToProviderId.get(row.providerNpi) || null,
          providerNpi: row.providerNpi,
          drugName: row.drugName,
          drugNdc: row.drugNdc,
          isGeneric: row.isGeneric,
          fillDate: row.fillDate,
          quantity: row.quantity,
          daysSupply: row.daysSupply,
          payerType: row.payerType,
          rxNumber: row.rxNumber,
          status: row.status,
        })),
      });
    }

    // Update upload record
    await db.prescriptionUpload.update({
      where: { id: upload.id },
      data: {
        status: "COMPLETED",
        rowCount: rows.length,
        dateRangeStart,
        dateRangeEnd,
      },
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "prescriptions.uploaded",
      entityType: "prescriptionUpload",
      entityId: upload.id,
      metadata: { fileName: file.name, rowCount: rows.length, errorCount: errors.length },
    });

    return NextResponse.json({
      uploadId: upload.id,
      status: "COMPLETED",
      rowCount: rows.length,
      errors: errors.slice(0, 20), // Return first 20 errors only
      dateRangeStart,
      dateRangeEnd,
    });
  } catch (error) {
    console.error("POST /api/prescriptions/upload error:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}

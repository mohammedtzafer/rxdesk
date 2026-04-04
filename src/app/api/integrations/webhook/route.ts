import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

// Webhook receiver for PMS prescription events
// Supports: PioneerRx webhooks, custom integrations

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-webhook-signature") || "";
    const locationId = req.headers.get("x-location-id") || "";

    if (!locationId) {
      return NextResponse.json({ error: "Missing x-location-id header" }, { status: 400 });
    }

    // Find the PMS connection for this location
    const connection = await db.pmsConnection.findFirst({
      where: { locationId, isActive: true },
      select: {
        id: true,
        organizationId: true,
        webhookSecret: true,
        pmsType: true,
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "No active PMS connection for this location" },
        { status: 404 }
      );
    }

    // Verify webhook signature if secret is configured
    if (connection.webhookSecret) {
      const expected = crypto
        .createHmac("sha256", connection.webhookSecret)
        .update(body)
        .digest("hex");

      if (signature !== expected) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(body);
    const events = Array.isArray(payload) ? payload : [payload];

    let processed = 0;

    for (const event of events) {
      // Upsert patient if patient data is included
      let patientId: string | null = null;
      if (event.patientExternalId || event.patientFirstName) {
        const patient = await db.patient.upsert({
          where: {
            organizationId_externalId: {
              organizationId: connection.organizationId,
              externalId:
                event.patientExternalId ||
                `${event.patientLastName}-${event.patientFirstName}`,
            },
          },
          update: {
            firstName: event.patientFirstName || undefined,
            lastName: event.patientLastName || undefined,
            phone: event.patientPhone || undefined,
            email: event.patientEmail || undefined,
          },
          create: {
            organizationId: connection.organizationId,
            locationId,
            externalId:
              event.patientExternalId ||
              `${event.patientLastName}-${event.patientFirstName}`,
            firstName: event.patientFirstName || "Unknown",
            lastName: event.patientLastName || "Unknown",
            phone: event.patientPhone,
            email: event.patientEmail,
            smsOptIn: !!event.patientPhone,
          },
        });
        patientId = patient.id;
      }

      // Create prescription event
      await db.prescriptionEvent.create({
        data: {
          organizationId: connection.organizationId,
          locationId,
          patientId,
          externalRxId: event.externalRxId || event.rxId || event.rx_number,
          eventType: mapEventType(event.eventType || event.status || event.event),
          drugName: event.drugName || event.drug_name || "Unknown",
          drugNdc: event.drugNdc || event.ndc,
          providerNpi: event.providerNpi || event.prescriber_npi,
          providerName: event.providerName || event.prescriber_name,
          quantity: event.quantity ? parseInt(event.quantity) : null,
          daysSupply:
            event.daysSupply || event.days_supply
              ? parseInt(event.daysSupply || event.days_supply)
              : null,
          fillDate: event.fillDate ? new Date(event.fillDate) : null,
          readyAt: event.readyAt ? new Date(event.readyAt) : null,
          payerName: event.payerName || event.plan_name,
          copay: event.copay ? parseFloat(event.copay) : null,
          source: connection.pmsType,
          metadata: event,
        },
      });

      processed++;

      // Auto-notify if Rx is ready and patient has opted in
      if (
        (event.eventType === "RX_READY" || event.status === "ready") &&
        patientId
      ) {
        const patient = await db.patient.findUnique({
          where: { id: patientId },
          select: { phone: true, smsOptIn: true, email: true, emailOptIn: true },
        });

        if (patient?.smsOptIn && patient.phone) {
          // Queue notification (fire and forget)
          db.patientNotification
            .create({
              data: {
                organizationId: connection.organizationId,
                patientId,
                channel: "SMS",
                message: "Your prescription is ready for pickup.",
                status: "PENDING",
              },
            })
            .catch(() => {});
        }
      }
    }

    // Update connection sync time
    await db.pmsConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        syncStatus: `Processed ${processed} events`,
      },
    });

    return NextResponse.json({ processed });
  } catch (error) {
    console.error("POST /api/integrations/webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

function mapEventType(
  raw: string
):
  | "RX_NEW"
  | "RX_FILLED"
  | "RX_READY"
  | "RX_PICKED_UP"
  | "RX_TRANSFERRED"
  | "RX_REFILL_DUE"
  | "RX_CANCELLED"
  | "RX_ON_HOLD"
  | "RX_PARTIAL_FILL"
  | "RX_RETURNED" {
  const normalized = (raw || "").toLowerCase().replace(/[_\s-]/g, "");
  if (normalized.includes("new")) return "RX_NEW";
  if (normalized.includes("ready") || normalized.includes("complete")) return "RX_READY";
  if (normalized.includes("pickup") || normalized.includes("dispensed")) return "RX_PICKED_UP";
  if (normalized.includes("transfer")) return "RX_TRANSFERRED";
  if (normalized.includes("refill") || normalized.includes("due")) return "RX_REFILL_DUE";
  if (normalized.includes("cancel") || normalized.includes("void")) return "RX_CANCELLED";
  if (normalized.includes("hold")) return "RX_ON_HOLD";
  if (normalized.includes("partial")) return "RX_PARTIAL_FILL";
  if (normalized.includes("return")) return "RX_RETURNED";
  return "RX_FILLED";
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "SETTINGS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const connections = await db.pmsConnection.findMany({
    where: { organizationId: session.user.organizationId },
    select: {
      id: true,
      locationId: true,
      pmsType: true,
      name: true,
      isActive: true,
      lastSyncAt: true,
      syncStatus: true,
      createdAt: true,
      location: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(connections);
}

const createConnectionSchema = z.object({
  locationId: z.string(),
  pmsType: z.enum([
    "PIONEER_RX",
    "LIBERTY",
    "PRIME_RX",
    "QS1",
    "RX30",
    "COMPUTER_RX",
    "BEST_RX",
    "DATASCAN",
    "CSV_IMPORT",
    "OTHER",
  ]),
  name: z.string().min(1),
  apiUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "SETTINGS", "FULL");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createConnectionSchema.parse(body);

    // Generate webhook secret
    const crypto = await import("crypto");
    const webhookSecret = crypto.randomBytes(32).toString("hex");

    const connection = await db.pmsConnection.create({
      data: {
        organizationId: session.user.organizationId,
        locationId: data.locationId,
        pmsType: data.pmsType,
        name: data.name,
        apiUrl: data.apiUrl,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        webhookSecret,
      },
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "pms_connection.created",
      entityType: "pmsConnection",
      entityId: connection.id,
      metadata: { pmsType: data.pmsType, locationId: data.locationId },
    });

    return NextResponse.json(
      {
        ...connection,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/webhook`,
        webhookSecret,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/integrations/connections error:", error);
    return NextResponse.json({ error: "Failed to create connection" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET() {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await db.notificationTemplate.findMany({
    where: { organizationId: session.user.organizationId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(templates);
}

const createTemplateSchema = z.object({
  name: z.string().min(1),
  channel: z.enum(["SMS", "VOICE", "EMAIL"]),
  eventType: z
    .enum([
      "RX_NEW",
      "RX_FILLED",
      "RX_READY",
      "RX_PICKED_UP",
      "RX_TRANSFERRED",
      "RX_REFILL_DUE",
      "RX_CANCELLED",
      "RX_ON_HOLD",
      "RX_PARTIAL_FILL",
      "RX_RETURNED",
    ])
    .optional(),
  subject: z.string().optional(),
  body: z.string().min(1),
  isDefault: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "SETTINGS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createTemplateSchema.parse(body);

    const template = await db.notificationTemplate.create({
      data: {
        organizationId: session.user.organizationId,
        name: data.name,
        channel: data.channel,
        eventType: data.eventType,
        subject: data.subject,
        body: data.body,
        isDefault: data.isDefault ?? false,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/integrations/templates error:", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PRESCRIPTIONS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const search = url.searchParams.get("search") || "";

  const where: Record<string, unknown> = {
    organizationId: session.user.organizationId,
    isActive: true,
  };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: { lastName: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        smsOptIn: true,
        preferredChannel: true,
        createdAt: true,
        _count: {
          select: { prescriptionEvents: true, patientNotifications: true },
        },
      },
    }),
    db.patient.count({ where }),
  ]);

  return NextResponse.json({
    patients,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

const createPatientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  smsOptIn: z.boolean().optional(),
  voiceOptIn: z.boolean().optional(),
  emailOptIn: z.boolean().optional(),
  preferredChannel: z.enum(["SMS", "VOICE", "EMAIL"]).optional(),
  locationId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PRESCRIPTIONS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createPatientSchema.parse(body);

    const patient = await db.patient.create({
      data: {
        organizationId: session.user.organizationId,
        locationId: data.locationId,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        phone: data.phone,
        email: data.email,
        smsOptIn: data.smsOptIn ?? false,
        voiceOptIn: data.voiceOptIn ?? false,
        emailOptIn: data.emailOptIn ?? false,
        preferredChannel: data.preferredChannel ?? "SMS",
      },
    });

    return NextResponse.json(patient, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/patients error:", error);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
}

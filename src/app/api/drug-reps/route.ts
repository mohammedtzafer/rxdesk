import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const createRepSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  company: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  territory: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const company = url.searchParams.get("company") || "";

  const where: Record<string, unknown> = { organizationId: session.user.organizationId };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
    ];
  }
  if (company) {
    where.company = { contains: company, mode: "insensitive" };
  }

  const reps = await db.drugRep.findMany({
    where,
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      email: true,
      phone: true,
      territory: true,
      _count: { select: { visits: true } },
    },
  });

  return NextResponse.json(reps);
}

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const data = createRepSchema.parse(body);

    const rep = await db.drugRep.create({
      data: {
        organizationId: session.user.organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company,
        email: data.email || null,
        phone: data.phone,
        territory: data.territory,
        notes: data.notes,
      },
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: "drug_rep.created",
      entityType: "drugRep",
      entityId: rep.id,
      metadata: { name: `${data.firstName} ${data.lastName}`, company: data.company },
    });

    return NextResponse.json(rep, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("POST /api/drug-reps error:", error);
    return NextResponse.json({ error: "Failed to create drug rep" }, { status: 500 });
  }
}

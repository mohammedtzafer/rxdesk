import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const updateRepSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  territory: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const rep = await db.drugRep.findUnique({
    where: { id, organizationId: session.user.organizationId },
    include: {
      visits: {
        orderBy: { visitDate: "desc" },
        take: 20,
        select: {
          id: true,
          visitDate: true,
          durationMinutes: true,
          drugsPromoted: true,
          notes: true,
          providers: {
            select: {
              provider: { select: { id: true, firstName: true, lastName: true, npi: true } },
            },
          },
        },
      },
    },
  });

  if (!rep) return NextResponse.json({ error: "Drug rep not found" }, { status: 404 });

  return NextResponse.json(rep);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const data = updateRepSchema.parse(body);

    const rep = await db.drugRep.update({
      where: { id, organizationId: session.user.organizationId },
      data,
    });

    return NextResponse.json(rep);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("PUT /api/drug-reps/[id] error:", error);
    return NextResponse.json({ error: "Failed to update drug rep" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "FULL");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  await db.drugRep.delete({
    where: { id, organizationId: session.user.organizationId },
  });

  return NextResponse.json({ success: true });
}

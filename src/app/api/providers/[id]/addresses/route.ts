import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const createAddressSchema = z.object({
  label: z.string().optional(),
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const addresses = await db.providerAddress.findMany({
    where: { providerId: id, organizationId: session.user.organizationId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ addresses });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const data = createAddressSchema.parse(body);

  const provider = await db.provider.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  if (data.isPrimary) {
    await db.providerAddress.updateMany({
      where: { providerId: id },
      data: { isPrimary: false },
    });
  }

  const address = await db.providerAddress.create({
    data: {
      providerId: id,
      organizationId: session.user.organizationId,
      label: data.label,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      isPrimary: data.isPrimary ?? false,
      source: "manual",
    },
  });

  return NextResponse.json(address, { status: 201 });
}

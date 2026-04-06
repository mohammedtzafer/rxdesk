import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const updateAddressSchema = z.object({
  label: z.string().optional(),
  address: z.string().min(1).optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, addressId } = await params;
  const body = await req.json();
  const data = updateAddressSchema.parse(body);

  const existing = await db.providerAddress.findFirst({
    where: { id: addressId, providerId: id, organizationId: session.user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  if (data.isPrimary) {
    await db.providerAddress.updateMany({
      where: { providerId: id, id: { not: addressId } },
      data: { isPrimary: false },
    });
  }

  const updated = await db.providerAddress.update({
    where: { id: addressId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "FULL");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, addressId } = await params;

  const existing = await db.providerAddress.findFirst({
    where: { id: addressId, providerId: id, organizationId: session.user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  await db.providerAddress.delete({ where: { id: addressId } });

  return NextResponse.json({ success: true });
}

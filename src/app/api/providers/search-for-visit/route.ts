import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow DRUG_REP role or users with DRUG_REPS module access
  const isDrugRep = session.user.role === "DRUG_REP";
  if (!isDrugRep) {
    const perm = await db.permission.findUnique({
      where: {
        userId_module: {
          userId: session.user.id,
          module: "DRUG_REPS",
        },
      },
    });
    const isOwner = session.user.role === "OWNER";
    if (!isOwner && (!perm || perm.access === "NONE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 20);

  if (search.length < 2) {
    return NextResponse.json({ providers: [] });
  }

  const providers = await db.provider.findMany({
    where: {
      organizationId: session.user.organizationId,
      isActive: true,
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { npi: { contains: search } },
        { practiceName: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { lastName: "asc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      practiceName: true,
      specialty: true,
      npi: true,
    },
  });

  return NextResponse.json({ providers });
}

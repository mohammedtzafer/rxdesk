import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const updateRolesSchema = z.object({
  roles: z.array(z.string().min(1)),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "SETTINGS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { roles } = updateRolesSchema.parse(body);

    const location = await db.location.update({
      where: { id, organizationId: session.user.organizationId },
      data: { roles },
    });

    return NextResponse.json(location);
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("PUT /api/locations/[id]/roles error:", error);
    return NextResponse.json({ error: "Failed to update roles" }, { status: 500 });
  }
}

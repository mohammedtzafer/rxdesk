import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const reorderSchema = z.object({
  userIds: z.array(z.string()),
});

export async function PUT(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "TIME_TRACKING", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { userIds } = reorderSchema.parse(body);

    // Update all sortOrder values. Each update is scoped to the org via the where clause.
    await Promise.all(
      userIds.map((id, index) =>
        db.user.update({
          where: { id, organizationId: session.user.organizationId },
          data: { sortOrder: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    console.error("PUT /api/employees/reorder error:", error);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}

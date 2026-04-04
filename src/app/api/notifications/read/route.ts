import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const markReadSchema = z.object({
  notificationIds: z.array(z.string()).optional(),
  markAllRead: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { notificationIds, markAllRead } = markReadSchema.parse(body);

  if (markAllRead) {
    await db.notification.updateMany({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        read: false,
      },
      data: { read: true },
    });
  } else if (notificationIds?.length) {
    await db.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId: session.user.id,
      },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}

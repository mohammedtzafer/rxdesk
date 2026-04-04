import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const unreadOnly = url.searchParams.get("unread") === "true";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

  const where: Record<string, unknown> = {
    userId: session.user.id,
    organizationId: session.user.organizationId,
  };
  if (unreadOnly) where.read = false;

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        read: true,
        createdAt: true,
      },
    }),
    db.notification.count({
      where: {
        userId: session.user.id,
        organizationId: session.user.organizationId,
        read: false,
      },
    }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { writeAuditLog, AuditActions } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { getDefaultPermissions } from "@/lib/permissions";

export async function GET() {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, invites] = await Promise.all([
    db.user.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastActiveAt: true,
        locationId: true,
        location: { select: { id: true, name: true } },
        permissions: { select: { module: true, access: true } },
      },
    }),
    db.invite.findMany({
      where: {
        organizationId: session.user.organizationId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
  ]);

  return NextResponse.json({ users, invites });
}

const inviteSchema = z.object({
  email: z.string().email("Invalid email"),
  role: z.enum(["PHARMACIST", "TECHNICIAN"]),
  locationId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkApiModuleAccess(
    session.user.id,
    "TEAM",
    "EDIT"
  );
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = inviteSchema.parse(body);

    // Check if user already exists in org
    const existingUser = await db.user.findFirst({
      where: {
        email: data.email,
        organizationId: session.user.organizationId,
      },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists in your organization" },
        { status: 409 }
      );
    }

    // Check for existing pending invite
    const existingInvite = await db.invite.findFirst({
      where: {
        email: data.email,
        organizationId: session.user.organizationId,
        status: "PENDING",
      },
    });
    if (existingInvite) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 409 }
      );
    }

    // Check plan limits
    const org = await db.organization.findUnique({
      where: { id: session.user.organizationId },
      select: { plan: true, name: true },
    });

    const userCount = await db.user.count({
      where: { organizationId: session.user.organizationId, active: true },
    });

    const limits: Record<string, number> = {
      STARTER: 3,
      GROWTH: 15,
      PRO: 999,
    };

    if (userCount >= (limits[org?.plan ?? "STARTER"] ?? 3)) {
      return NextResponse.json(
        { error: "Team member limit reached for your plan. Please upgrade." },
        { status: 403 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await db.invite.create({
      data: {
        email: data.email,
        role: data.role,
        organizationId: session.user.organizationId,
        invitedById: session.user.id,
        locationId: data.locationId,
        token,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendInviteEmail({
      to: data.email,
      inviterName: session.user.name || "A team member",
      organizationName: org?.name || "your pharmacy",
      role: data.role,
      inviteUrl: `${appUrl}/invite/${token}`,
    });

    await writeAuditLog({
      organizationId: session.user.organizationId,
      userId: session.user.id,
      action: AuditActions.USER_INVITED,
      entityType: "invite",
      entityId: invite.id,
      metadata: { email: data.email, role: data.role },
    });

    return NextResponse.json(invite, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/team error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createVerificationToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const forgotSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success } = rateLimit(`forgot:${ip}`, 5, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = forgotSchema.parse(body);

    // Always return success to prevent email enumeration
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (user) {
      const token = await createVerificationToken(`reset:${email}`, 60);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendPasswordResetEmail({
        to: email,
        resetUrl: `${appUrl}/reset-password?token=${token}`,
      });
    }

    // Always return success (don't leak whether email exists)
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

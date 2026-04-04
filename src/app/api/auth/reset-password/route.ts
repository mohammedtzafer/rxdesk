import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { validateVerificationToken } from "@/lib/tokens";

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, password } = resetSchema.parse(body);

    const result = await validateVerificationToken(token);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 }
      );
    }

    // identifier is "reset:email@example.com"
    const email = result.identifier.replace("reset:", "");

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.update({
      where: { email },
      data: { hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}

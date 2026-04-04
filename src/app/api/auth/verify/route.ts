import { NextResponse } from "next/server";
import { validateVerificationToken } from "@/lib/tokens";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const result = await validateVerificationToken(token);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid or expired verification link. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark user as verified
    await db.user.update({
      where: { email: result.identifier },
      data: { emailVerified: new Date() },
    });

    return NextResponse.json({ success: true, email: result.identifier });
  } catch (error) {
    console.error("POST /api/auth/verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

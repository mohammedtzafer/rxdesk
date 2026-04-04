import crypto from "crypto";
import { db } from "./db";

/**
 * Generate a secure random token and store it in VerificationToken.
 * Used for both email verification and password reset.
 */
export async function createVerificationToken(
  identifier: string,
  expiresInMinutes: number = 60
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Delete any existing tokens for this identifier
  await db.verificationToken.deleteMany({
    where: { identifier },
  });

  await db.verificationToken.create({
    data: {
      identifier,
      token,
      expires,
    },
  });

  return token;
}

/**
 * Validate a token. Returns the identifier if valid, null if expired/invalid.
 * Deletes the token after use (single-use).
 */
export async function validateVerificationToken(
  token: string
): Promise<{ identifier: string } | null> {
  const record = await db.verificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.expires < new Date()) {
    // Expired — clean up
    await db.verificationToken.delete({ where: { token } });
    return null;
  }

  // Delete after use (single-use token)
  await db.verificationToken.delete({ where: { token } });

  return { identifier: record.identifier };
}

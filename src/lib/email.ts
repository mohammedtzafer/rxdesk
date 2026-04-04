import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend {
  if (!resendInstance) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error("RESEND_API_KEY is not set");
    }
    resendInstance = new Resend(key);
  }
  return resendInstance;
}

const fromEmail = process.env.RESEND_FROM_EMAIL || "RxDesk <noreply@rxdesk.app>";

export async function sendVerificationEmail(params: {
  to: string;
  verifyUrl: string;
}): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: "Verify your RxDesk account",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1d1d1f;">Verify your email</h2>
          <p style="color: rgba(0,0,0,0.8); font-size: 17px; line-height: 1.47;">
            Click the button below to verify your email address and complete your RxDesk registration.
          </p>
          <a href="${params.verifyUrl}" style="display: inline-block; background: #0071e3; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 17px; margin: 16px 0;">
            Verify email
          </a>
          <p style="color: rgba(0,0,0,0.48); font-size: 14px;">
            This link expires in 1 hour. If you didn't create an account, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
  }
}

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: "Reset your RxDesk password",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1d1d1f;">Reset your password</h2>
          <p style="color: rgba(0,0,0,0.8); font-size: 17px; line-height: 1.47;">
            Click the button below to set a new password for your RxDesk account.
          </p>
          <a href="${params.resetUrl}" style="display: inline-block; background: #0071e3; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 17px; margin: 16px 0;">
            Reset password
          </a>
          <p style="color: rgba(0,0,0,0.48); font-size: 14px;">
            This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
  }
}

export async function sendInviteEmail(params: {
  to: string;
  inviterName: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
}): Promise<void> {
  try {
    const resend = getResend();
    await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: `You've been invited to join ${params.organizationName} on RxDesk`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1d1d1f;">You're invited to RxDesk</h2>
          <p style="color: rgba(0,0,0,0.8); font-size: 17px; line-height: 1.47;">
            ${params.inviterName} has invited you to join <strong>${params.organizationName}</strong> as a <strong>${params.role}</strong>.
          </p>
          <a href="${params.inviteUrl}" style="display: inline-block; background: #0071e3; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 17px; margin: 16px 0;">
            Accept invitation
          </a>
          <p style="color: rgba(0,0,0,0.48); font-size: 14px;">
            This invitation expires in 7 days.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send invite email:", error);
  }
}

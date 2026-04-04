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

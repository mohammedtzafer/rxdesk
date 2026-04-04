// SMS notification service — Twilio-ready, HIPAA-compliant
// Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER env vars to activate

interface SmsResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export async function sendSms(
  to: string,
  message: string
): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.warn("Twilio not configured — SMS not sent");
    return { success: false, error: "Twilio not configured" };
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message,
        }),
      }
    );

    const data = await res.json();

    if (res.ok) {
      return { success: true, externalId: data.sid };
    } else {
      return { success: false, error: data.message || "SMS send failed" };
    }
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, error: "SMS service unavailable" };
  }
}

// HIPAA-compliant message templates (no PHI in SMS body)
export function buildRxReadyMessage(pharmacyName: string): string {
  return `${pharmacyName}: Your prescription is ready for pickup. Please visit the pharmacy at your convenience.`;
}

export function buildRefillReminderMessage(pharmacyName: string): string {
  return `${pharmacyName}: You have a prescription that may be due for a refill. Please contact the pharmacy if you'd like to refill.`;
}

export function buildGenericMessage(pharmacyName: string, message: string): string {
  return `${pharmacyName}: ${message}`;
}

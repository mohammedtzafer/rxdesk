import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  buildRxReadyMessage,
  buildRefillReminderMessage,
  buildGenericMessage,
  sendSms,
} from "@/lib/sms";

// ---------------------------------------------------------------------------
// Pure message builder tests — no mocking needed
// ---------------------------------------------------------------------------

describe("buildRxReadyMessage", () => {
  it("includes the pharmacy name", () => {
    const msg = buildRxReadyMessage("City Pharmacy");
    expect(msg).toContain("City Pharmacy");
  });

  it("contains 'ready for pickup'", () => {
    const msg = buildRxReadyMessage("City Pharmacy");
    expect(msg.toLowerCase()).toContain("ready for pickup");
  });

  it("does not include any drug name placeholder or PHI", () => {
    const msg = buildRxReadyMessage("City Pharmacy");
    // Should not mention drug, patient name, DOB, address, or diagnosis
    expect(msg).not.toMatch(/drug|medication name|patient|dob|diagnosis/i);
  });

  it("does not include patient name patterns (PHI compliance)", () => {
    const msg = buildRxReadyMessage("City Pharmacy");
    // Message must be generic — no names beyond pharmacy name
    const withoutPharmacy = msg.replace("City Pharmacy", "");
    // Should not contain any title-case words that look like names
    expect(withoutPharmacy).not.toMatch(/\bMr\b|\bMrs\b|\bMs\b|\bDr\b/);
  });

  it("works with a pharmacy name containing special characters", () => {
    const msg = buildRxReadyMessage("O'Brien & Sons Rx");
    expect(msg).toContain("O'Brien & Sons Rx");
    expect(msg.toLowerCase()).toContain("ready for pickup");
  });
});

describe("buildRefillReminderMessage", () => {
  it("includes the pharmacy name", () => {
    const msg = buildRefillReminderMessage("Green Valley Pharmacy");
    expect(msg).toContain("Green Valley Pharmacy");
  });

  it("contains 'refill'", () => {
    const msg = buildRefillReminderMessage("Green Valley Pharmacy");
    expect(msg.toLowerCase()).toContain("refill");
  });

  it("does not include any PHI (drug name, patient name, DOB)", () => {
    const msg = buildRefillReminderMessage("Green Valley Pharmacy");
    expect(msg).not.toMatch(/drug|patient name|date of birth|diagnosis/i);
  });

  it("is a non-empty string", () => {
    const msg = buildRefillReminderMessage("Any Pharmacy");
    expect(typeof msg).toBe("string");
    expect(msg.length).toBeGreaterThan(0);
  });

  it("is different from the rx-ready message", () => {
    const refill = buildRefillReminderMessage("Pharmacy");
    const ready = buildRxReadyMessage("Pharmacy");
    expect(refill).not.toBe(ready);
  });
});

describe("buildGenericMessage", () => {
  it("prepends the pharmacy name", () => {
    const msg = buildGenericMessage("Corner Drugs", "Please call us.");
    expect(msg.startsWith("Corner Drugs")).toBe(true);
  });

  it("includes the custom message body", () => {
    const msg = buildGenericMessage("Corner Drugs", "Please call us.");
    expect(msg).toContain("Please call us.");
  });

  it("combines pharmacy name and custom message", () => {
    const msg = buildGenericMessage("RxPlus", "Your account is ready.");
    expect(msg).toContain("RxPlus");
    expect(msg).toContain("Your account is ready.");
  });

  it("handles empty custom message", () => {
    const msg = buildGenericMessage("Pharmacy", "");
    expect(msg).toContain("Pharmacy");
    expect(typeof msg).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// sendSms — requires fetch mocking
// ---------------------------------------------------------------------------

describe("sendSms", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    // Restore env
    process.env.TWILIO_ACCOUNT_SID = ORIGINAL_ENV.TWILIO_ACCOUNT_SID;
    process.env.TWILIO_AUTH_TOKEN = ORIGINAL_ENV.TWILIO_AUTH_TOKEN;
    process.env.TWILIO_PHONE_NUMBER = ORIGINAL_ENV.TWILIO_PHONE_NUMBER;
    vi.unstubAllGlobals();
  });

  it("returns { success: false, error: 'Twilio not configured' } when env vars are absent", async () => {
    const result = await sendSms("+15555555555", "Hello");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Twilio not configured");
    expect(result.externalId).toBeUndefined();
  });

  it("returns { success: false } when only some env vars are set", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    // TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER deliberately missing

    const result = await sendSms("+15555555555", "Hello");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Twilio not configured");
  });

  it("returns { success: true, externalId } when Twilio API succeeds", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "authtoken456";
    process.env.TWILIO_PHONE_NUMBER = "+18005550100";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sid: "SMabc123" }),
      }) as unknown as typeof fetch
    );

    const result = await sendSms("+15555555555", "Test message");

    expect(result.success).toBe(true);
    expect(result.externalId).toBe("SMabc123");
    expect(result.error).toBeUndefined();
  });

  it("returns { success: false, error } when Twilio API returns an error body", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "authtoken456";
    process.env.TWILIO_PHONE_NUMBER = "+18005550100";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () =>
          Promise.resolve({ message: "The number is unverified" }),
      }) as unknown as typeof fetch
    );

    const result = await sendSms("+15555555555", "Test message");

    expect(result.success).toBe(false);
    expect(result.error).toBe("The number is unverified");
  });

  it("returns fallback error message when Twilio API error body has no message field", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "authtoken456";
    process.env.TWILIO_PHONE_NUMBER = "+18005550100";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}), // no message field
      }) as unknown as typeof fetch
    );

    const result = await sendSms("+15555555555", "Test message");

    expect(result.success).toBe(false);
    expect(result.error).toBe("SMS send failed");
  });

  it("uses Basic auth header with base64-encoded accountSid:authToken", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "authtoken456";
    process.env.TWILIO_PHONE_NUMBER = "+18005550100";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: "SMabc" }),
    });

    vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);

    await sendSms("+15555555555", "Test message");

    const callArgs = mockFetch.mock.calls[0];
    const requestInit = callArgs[1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;

    const expected =
      "Basic " +
      Buffer.from("ACtest123:authtoken456").toString("base64");

    expect(headers["Authorization"]).toBe(expected);
  });

  it("posts to the correct Twilio API URL", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "authtoken456";
    process.env.TWILIO_PHONE_NUMBER = "+18005550100";

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: "SMabc" }),
    });

    vi.stubGlobal("fetch", mockFetch as unknown as typeof fetch);

    await sendSms("+15555555555", "Test");

    const url = mockFetch.mock.calls[0][0] as string;

    expect(url).toBe(
      "https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages.json"
    );
  });

  it("returns { success: false, error: 'SMS service unavailable' } when fetch throws", async () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest123";
    process.env.TWILIO_AUTH_TOKEN = "authtoken456";
    process.env.TWILIO_PHONE_NUMBER = "+18005550100";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network failure")) as unknown as typeof fetch
    );

    const result = await sendSms("+15555555555", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toBe("SMS service unavailable");
  });
});

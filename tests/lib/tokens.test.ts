import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the db module before importing anything that uses it
vi.mock("@/lib/db", () => ({
  db: {
    verificationToken: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { createVerificationToken, validateVerificationToken } from "@/lib/tokens";
import { db } from "@/lib/db";

const mockFindUnique = vi.mocked(db.verificationToken.findUnique);
const mockCreate = vi.mocked(db.verificationToken.create);
const mockDelete = vi.mocked(db.verificationToken.delete);
const mockDeleteMany = vi.mocked(db.verificationToken.deleteMany);

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue({} as never);
  mockDeleteMany.mockResolvedValue({ count: 0 } as never);
  mockDelete.mockResolvedValue({} as never);
});

describe("createVerificationToken", () => {
  it("deletes existing tokens for the identifier before creating", async () => {
    await createVerificationToken("user@example.com");

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { identifier: "user@example.com" },
    });

    // deleteMany must be called before create
    const deleteManyOrder = mockDeleteMany.mock.invocationCallOrder[0];
    const createOrder = mockCreate.mock.invocationCallOrder[0];
    expect(deleteManyOrder).toBeLessThan(createOrder);
  });

  it("creates a token with correct identifier", async () => {
    await createVerificationToken("user@example.com");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: "user@example.com",
        }),
      })
    );
  });

  it("creates a token with an expiry date in the future", async () => {
    const before = Date.now();
    await createVerificationToken("user@example.com");
    const after = Date.now();

    const createCall = mockCreate.mock.calls[0][0] as { data: { expires: Date } };
    const expires = createCall.data.expires.getTime();

    expect(expires).toBeGreaterThan(before);
    expect(expires).toBeGreaterThan(after);
  });

  it("returns a hex string token", async () => {
    const token = await createVerificationToken("user@example.com");

    // 32 random bytes = 64 hex chars
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("default expiry is 60 minutes", async () => {
    const before = Date.now();
    await createVerificationToken("user@example.com");
    const after = Date.now();

    const createCall = mockCreate.mock.calls[0][0] as { data: { expires: Date } };
    const expires = createCall.data.expires.getTime();

    const sixtyMinutesMs = 60 * 60 * 1000;
    expect(expires).toBeGreaterThanOrEqual(before + sixtyMinutesMs);
    expect(expires).toBeLessThanOrEqual(after + sixtyMinutesMs);
  });

  it("custom expiry works — 10 minutes", async () => {
    const before = Date.now();
    await createVerificationToken("user@example.com", 10);
    const after = Date.now();

    const createCall = mockCreate.mock.calls[0][0] as { data: { expires: Date } };
    const expires = createCall.data.expires.getTime();

    const tenMinutesMs = 10 * 60 * 1000;
    expect(expires).toBeGreaterThanOrEqual(before + tenMinutesMs);
    expect(expires).toBeLessThanOrEqual(after + tenMinutesMs);
  });

  it("custom expiry works — 1440 minutes (24 hours)", async () => {
    const before = Date.now();
    await createVerificationToken("user@example.com", 1440);
    const after = Date.now();

    const createCall = mockCreate.mock.calls[0][0] as { data: { expires: Date } };
    const expires = createCall.data.expires.getTime();

    const oneDayMs = 1440 * 60 * 1000;
    expect(expires).toBeGreaterThanOrEqual(before + oneDayMs);
    expect(expires).toBeLessThanOrEqual(after + oneDayMs);
  });

  it("passes the returned token value into the create call", async () => {
    const token = await createVerificationToken("user@example.com");

    const createCall = mockCreate.mock.calls[0][0] as { data: { token: string } };
    expect(createCall.data.token).toBe(token);
  });

  it("returns unique tokens on successive calls", async () => {
    const token1 = await createVerificationToken("user@example.com");
    const token2 = await createVerificationToken("user@example.com");

    expect(token1).not.toBe(token2);
  });

  it("works with a very long identifier", async () => {
    const longIdentifier = "a".repeat(500) + "@example.com";
    await createVerificationToken(longIdentifier);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identifier: longIdentifier,
        }),
      })
    );
  });

  it("deletes existing tokens scoped to the given identifier, not others", async () => {
    await createVerificationToken("user-a@example.com");

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { identifier: "user-a@example.com" },
    });
    // Must not delete with a different identifier
    expect(mockDeleteMany).not.toHaveBeenCalledWith({
      where: { identifier: "user-b@example.com" },
    });
  });
});

describe("validateVerificationToken", () => {
  it("returns identifier for a valid, non-expired token", async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({
      identifier: "user@example.com",
      token: "abc123",
      expires: futureExpiry,
    } as never);

    const result = await validateVerificationToken("abc123");

    expect(result).toEqual({ identifier: "user@example.com" });
  });

  it("returns null for a non-existent token", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    const result = await validateVerificationToken("nonexistent-token");

    expect(result).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const pastExpiry = new Date(Date.now() - 1000);
    mockFindUnique.mockResolvedValue({
      identifier: "user@example.com",
      token: "expired-token",
      expires: pastExpiry,
    } as never);

    const result = await validateVerificationToken("expired-token");

    expect(result).toBeNull();
  });

  it("deletes an expired token during validation", async () => {
    const pastExpiry = new Date(Date.now() - 1000);
    mockFindUnique.mockResolvedValue({
      identifier: "user@example.com",
      token: "expired-token",
      expires: pastExpiry,
    } as never);

    await validateVerificationToken("expired-token");

    expect(mockDelete).toHaveBeenCalledWith({
      where: { token: "expired-token" },
    });
  });

  it("does not call delete when token is not found", async () => {
    mockFindUnique.mockResolvedValue(null as never);

    await validateVerificationToken("nonexistent-token");

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("deletes token after successful validation (single-use)", async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);
    mockFindUnique.mockResolvedValue({
      identifier: "user@example.com",
      token: "valid-token",
      expires: futureExpiry,
    } as never);

    await validateVerificationToken("valid-token");

    expect(mockDelete).toHaveBeenCalledWith({
      where: { token: "valid-token" },
    });
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it("token cannot be used twice — second call finds nothing after deletion", async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60 * 1000);

    // First call: token exists
    mockFindUnique.mockResolvedValueOnce({
      identifier: "user@example.com",
      token: "one-time-token",
      expires: futureExpiry,
    } as never);

    // Second call: token is gone (was deleted after first use)
    mockFindUnique.mockResolvedValueOnce(null as never);

    const first = await validateVerificationToken("one-time-token");
    const second = await validateVerificationToken("one-time-token");

    expect(first).toEqual({ identifier: "user@example.com" });
    expect(second).toBeNull();
  });

  it("returns null for a token expiring at exactly now", async () => {
    // expires < new Date() is false when equal, but expires equal to now
    // means the comparison `record.expires < new Date()` depends on whether
    // the clock ticks. We test the boundary with 1ms in the past.
    const boundaryExpiry = new Date(Date.now() - 1);
    mockFindUnique.mockResolvedValue({
      identifier: "user@example.com",
      token: "boundary-token",
      expires: boundaryExpiry,
    } as never);

    const result = await validateVerificationToken("boundary-token");

    expect(result).toBeNull();
  });
});

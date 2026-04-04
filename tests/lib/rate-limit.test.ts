import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, clearRateLimitStore } from "@/lib/rate-limit";

beforeEach(() => {
  clearRateLimitStore();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  describe("basic success/failure", () => {
    it("allows the first request and returns success", () => {
      const result = rateLimit("test-key", 5, 60_000);
      expect(result.success).toBe(true);
    });

    it("returns remaining count of limit - 1 on first request", () => {
      const result = rateLimit("test-key", 5, 60_000);
      expect(result.remaining).toBe(4);
    });

    it("allows requests up to the limit", () => {
      for (let i = 0; i < 5; i++) {
        const result = rateLimit("test-key", 5, 60_000);
        expect(result.success).toBe(true);
      }
    });

    it("blocks the request that exceeds the limit", () => {
      for (let i = 0; i < 5; i++) {
        rateLimit("test-key", 5, 60_000);
      }
      const result = rateLimit("test-key", 5, 60_000);
      expect(result.success).toBe(false);
    });

    it("returns remaining of 0 when over limit", () => {
      for (let i = 0; i < 5; i++) {
        rateLimit("test-key", 5, 60_000);
      }
      const result = rateLimit("test-key", 5, 60_000);
      expect(result.remaining).toBe(0);
    });
  });

  describe("remaining count", () => {
    it("decreases remaining by 1 on each request", () => {
      const limit = 5;
      for (let i = 0; i < limit; i++) {
        const result = rateLimit("test-key", limit, 60_000);
        expect(result.remaining).toBe(limit - i - 1);
      }
    });

    it("remaining is 0 on the last allowed request with limit 1", () => {
      const result = rateLimit("single", 1, 60_000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(0);
    });
  });

  describe("window expiry", () => {
    it("resets the counter after the window expires", () => {
      rateLimit("test-key", 2, 60_000);
      rateLimit("test-key", 2, 60_000);

      // Both slots used — next should fail
      expect(rateLimit("test-key", 2, 60_000).success).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(60_001);

      // Should succeed again after window reset
      const result = rateLimit("test-key", 2, 60_000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("does not reset before the window expires", () => {
      rateLimit("test-key", 2, 60_000);
      rateLimit("test-key", 2, 60_000);

      // Advance time but stay inside the window
      vi.advanceTimersByTime(59_999);

      expect(rateLimit("test-key", 2, 60_000).success).toBe(false);
    });

    it("does not expire the window at exactly resetAt (strict greater-than check)", () => {
      // The source uses `now > record.resetAt`, so at exactly resetAt the window
      // is still considered active and the request is blocked.
      rateLimit("test-key", 1, 60_000);

      vi.advanceTimersByTime(60_000);

      // now === resetAt, strict > is false, so the record is still valid
      const result = rateLimit("test-key", 1, 60_000);
      expect(result.success).toBe(false);
    });
  });

  describe("independent keys", () => {
    it("tracks different keys separately", () => {
      rateLimit("key-a", 2, 60_000);
      rateLimit("key-a", 2, 60_000);

      // key-a is exhausted
      expect(rateLimit("key-a", 2, 60_000).success).toBe(false);

      // key-b is a fresh slate
      expect(rateLimit("key-b", 2, 60_000).success).toBe(true);
    });

    it("exhausting one key does not affect another", () => {
      for (let i = 0; i < 10; i++) {
        rateLimit("heavy-user", 10, 60_000);
      }

      const result = rateLimit("light-user", 10, 60_000);
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe("clearRateLimitStore", () => {
    it("resets all counters so requests succeed again", () => {
      rateLimit("test-key", 1, 60_000);
      // Limit exhausted
      expect(rateLimit("test-key", 1, 60_000).success).toBe(false);

      clearRateLimitStore();

      expect(rateLimit("test-key", 1, 60_000).success).toBe(true);
    });

    it("resets multiple keys at once", () => {
      rateLimit("key-1", 1, 60_000);
      rateLimit("key-2", 1, 60_000);

      clearRateLimitStore();

      expect(rateLimit("key-1", 1, 60_000).success).toBe(true);
      expect(rateLimit("key-2", 1, 60_000).success).toBe(true);
    });

    it("works on an already-empty store without throwing", () => {
      expect(() => clearRateLimitStore()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("limit of 1 allows exactly one request then blocks", () => {
      expect(rateLimit("tight", 1, 60_000).success).toBe(true);
      expect(rateLimit("tight", 1, 60_000).success).toBe(false);
    });

    it("handles a very short window (1ms)", () => {
      rateLimit("fast", 1, 1);
      vi.advanceTimersByTime(2);
      expect(rateLimit("fast", 1, 1).success).toBe(true);
    });
  });
});

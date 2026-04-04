import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  describe("class merging", () => {
    it("returns a single class name unchanged", () => {
      expect(cn("foo")).toBe("foo");
    });

    it("merges multiple class names into one string", () => {
      expect(cn("foo", "bar")).toBe("foo bar");
    });

    it("merges three or more class names", () => {
      expect(cn("a", "b", "c")).toBe("a b c");
    });

    it("handles no arguments and returns an empty string", () => {
      expect(cn()).toBe("");
    });
  });

  describe("conditional classes", () => {
    it("includes a class when the condition is true", () => {
      expect(cn("base", true && "active")).toBe("base active");
    });

    it("excludes a class when the condition is false", () => {
      expect(cn("base", false && "hidden")).toBe("base");
    });

    it("handles undefined values without including them", () => {
      expect(cn("base", undefined)).toBe("base");
    });

    it("handles null values without including them", () => {
      expect(cn("base", null)).toBe("base");
    });

    it("handles object syntax — includes keys with truthy values", () => {
      expect(cn({ active: true, disabled: false })).toBe("active");
    });

    it("handles object syntax — excludes keys with falsy values", () => {
      expect(cn({ hidden: false })).toBe("");
    });

    it("handles array syntax", () => {
      expect(cn(["foo", "bar"])).toBe("foo bar");
    });
  });

  describe("Tailwind conflict resolution", () => {
    it("resolves padding conflict — later class wins (p-2 over p-4)", () => {
      expect(cn("p-4", "p-2")).toBe("p-2");
    });

    it("resolves padding conflict — later class wins (p-4 over p-2)", () => {
      expect(cn("p-2", "p-4")).toBe("p-4");
    });

    it("resolves text color conflict — later class wins", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("resolves background color conflict — later class wins", () => {
      expect(cn("bg-white", "bg-gray-100")).toBe("bg-gray-100");
    });

    it("resolves margin conflict — later class wins", () => {
      expect(cn("m-4", "m-2")).toBe("m-2");
    });

    it("keeps non-conflicting Tailwind classes together", () => {
      expect(cn("p-4", "m-2")).toBe("p-4 m-2");
    });

    it("resolves conflict when conditional override is applied", () => {
      const isCompact = true;
      expect(cn("p-4", isCompact && "p-2")).toBe("p-2");
    });

    it("keeps base padding when conditional override is false", () => {
      const isCompact = false;
      expect(cn("p-4", isCompact && "p-2")).toBe("p-4");
    });

    it("resolves font-size conflict — later class wins", () => {
      expect(cn("text-sm", "text-lg")).toBe("text-lg");
    });

    it("resolves flex direction conflict", () => {
      expect(cn("flex-row", "flex-col")).toBe("flex-col");
    });
  });
});

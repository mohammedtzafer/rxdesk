import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// Read the actual globals.css to verify dark mode variables
const cssContent = fs.readFileSync(
  path.resolve(__dirname, "../../src/app/globals.css"),
  "utf-8"
);

describe("Dark mode CSS configuration", () => {
  describe("CSS variable definitions", () => {
    it("has :root block with light mode variables", () => {
      expect(cssContent).toContain(":root {");
      expect(cssContent).toContain("--background:");
      expect(cssContent).toContain("--foreground:");
      expect(cssContent).toContain("--card:");
    });

    it("has .dark block with dark mode variables", () => {
      expect(cssContent).toContain(".dark {");
    });

    it("light mode --background is light (245 245 247 = #f5f5f7)", () => {
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
      expect(rootMatch).toBeTruthy();
      const rootBlock = rootMatch![1];
      expect(rootBlock).toContain("--background: 245 245 247");
    });

    it("dark mode --background is dark (0 0 0 = #000000)", () => {
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
      expect(darkMatch).toBeTruthy();
      const darkBlock = darkMatch![1];
      expect(darkBlock).toContain("--background: 0 0 0");
    });

    it("light mode --foreground is dark text (29 29 31 = #1d1d1f)", () => {
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
      const rootBlock = rootMatch![1];
      expect(rootBlock).toContain("--foreground: 29 29 31");
    });

    it("dark mode --foreground is white (255 255 255)", () => {
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
      const darkBlock = darkMatch![1];
      expect(darkBlock).toContain("--foreground: 255 255 255");
    });

    it("light mode --card is white (255 255 255)", () => {
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
      const rootBlock = rootMatch![1];
      expect(rootBlock).toContain("--card: 255 255 255");
    });

    it("dark mode --card is dark (28 28 30 = #1c1c1e)", () => {
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
      const darkBlock = darkMatch![1];
      expect(darkBlock).toContain("--card: 28 28 30");
    });

    it("light mode --muted is light gray", () => {
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
      const rootBlock = rootMatch![1];
      expect(rootBlock).toContain("--muted: 245 245 247");
    });

    it("dark mode --muted is dark gray (44 44 46)", () => {
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
      const darkBlock = darkMatch![1];
      expect(darkBlock).toContain("--muted: 44 44 46");
    });

    it("light mode --border is light", () => {
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
      const rootBlock = rootMatch![1];
      expect(rootBlock).toContain("--border: 229 229 229");
    });

    it("dark mode --border is dark", () => {
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
      const darkBlock = darkMatch![1];
      expect(darkBlock).toContain("--border: 63 63 70");
    });
  });

  describe("@theme inline mappings", () => {
    it("maps --color-background to rgb(var(--background))", () => {
      expect(cssContent).toContain("--color-background: rgb(var(--background))");
    });

    it("maps --color-foreground to rgb(var(--foreground))", () => {
      expect(cssContent).toContain("--color-foreground: rgb(var(--foreground))");
    });

    it("maps --color-card to rgb(var(--card))", () => {
      expect(cssContent).toContain("--color-card: rgb(var(--card))");
    });

    it("maps --color-muted to rgb(var(--muted))", () => {
      expect(cssContent).toContain("--color-muted: rgb(var(--muted))");
    });

    it("maps --color-border to rgb(var(--border))", () => {
      expect(cssContent).toContain("--color-border: rgb(var(--border))");
    });

    it("maps --color-muted-foreground to rgb(var(--muted-foreground))", () => {
      expect(cssContent).toContain("--color-muted-foreground: rgb(var(--muted-foreground))");
    });
  });

  describe("CSS variables use RGB space-separated format (required for Tailwind v4)", () => {
    it("all :root variables use space-separated RGB format (not hex)", () => {
      const rootMatch = cssContent.match(/:root\s*\{([^}]+)\}/s);
      const rootBlock = rootMatch![1];
      // Should NOT contain hex colors like #f5f5f7
      const hexPattern = /#[0-9a-fA-F]{3,8}/;
      // Filter out non-color vars (--radius, --font, --rx-*)
      const colorLines = rootBlock.split("\n").filter(
        (line) => line.includes("--") && !line.includes("--radius") && !line.includes("--rx-") && !line.includes("--font") && !line.includes("--chart")
      );
      for (const line of colorLines) {
        if (line.trim() && line.includes(":")) {
          const value = line.split(":")[1]?.trim().replace(";", "");
          if (value && !value.startsWith("calc") && !value.startsWith("var")) {
            expect(value).not.toMatch(hexPattern);
          }
        }
      }
    });

    it("all .dark variables use space-separated RGB format (not hex)", () => {
      const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
      const darkBlock = darkMatch![1];
      const hexPattern = /#[0-9a-fA-F]{3,8}/;
      const colorLines = darkBlock.split("\n").filter(
        (line) => line.includes("--") && !line.includes("--rx-") && !line.includes("--chart")
      );
      for (const line of colorLines) {
        if (line.trim() && line.includes(":")) {
          const value = line.split(":")[1]?.trim().replace(";", "");
          if (value && !value.startsWith("calc") && !value.startsWith("var")) {
            expect(value).not.toMatch(hexPattern);
          }
        }
      }
    });
  });

  describe("@custom-variant dark", () => {
    it("is defined for class-based dark mode", () => {
      expect(cssContent).toContain("@custom-variant dark");
    });

    it("targets .dark descendants", () => {
      expect(cssContent).toContain(".dark");
    });
  });

  describe("Dark mode variable completeness", () => {
    const requiredVars = [
      "--background", "--foreground", "--card", "--card-foreground",
      "--popover", "--popover-foreground", "--primary", "--primary-foreground",
      "--secondary", "--secondary-foreground", "--muted", "--muted-foreground",
      "--accent", "--accent-foreground", "--destructive", "--destructive-foreground",
      "--border", "--input", "--ring",
    ];

    const darkMatch = cssContent.match(/\.dark\s*\{([^}]+)\}/s);
    const darkBlock = darkMatch?.[1] || "";

    for (const varName of requiredVars) {
      it(`dark mode defines ${varName}`, () => {
        expect(darkBlock).toContain(`${varName}:`);
      });
    }
  });
});

describe("App shell structure", () => {
  const shellContent = fs.readFileSync(
    path.resolve(__dirname, "../../src/components/app-shell.tsx"),
    "utf-8"
  );

  it("brand banner is a separate fixed element from sidebar", () => {
    // Brand banner should be at z-50, sidebar at z-40
    expect(shellContent).toContain("z-50");
    expect(shellContent).toContain("z-40");
  });

  it("brand banner has fixed w-64 width (never collapses)", () => {
    // The brand div should always be w-64 and z-50
    expect(shellContent).toMatch(/hidden md:flex.*z-50.*w-64|hidden md:flex.*w-64.*z-50/s);
  });

  it("sidebar starts below brand banner", () => {
    // Sidebar should be positioned below the brand with bottom-0
    expect(shellContent).toContain("bottom-0");
    expect(shellContent).toMatch(/top-20|top-40/);
  });

  it("collapse toggle is always visible (in toolbar, not brand)", () => {
    // The setCollapsed button should be in the sidebar toolbar, not the brand banner
    expect(shellContent).toContain("setCollapsed(!collapsed)");
  });

  it("brand name is NOT truncated", () => {
    // Brand banner should NOT have 'truncate' on the name
    const brandSection = shellContent.match(/Brand banner[\s\S]*?<\/div>\s*\n/);
    // The name paragraph should not have truncate class
    expect(shellContent).toMatch(/font-semibold text-foreground leading-tight">\s*\{brandName\}/);
  });

  it("uses bg-background for seamless sidebar (no hard borders)", () => {
    expect(shellContent).toContain("bg-background");
    // Should NOT have inline rgba background on sidebar
    expect(shellContent).not.toContain('background: "rgba(0, 0, 0, 0.85)"');
  });

  it("uses text-foreground not hardcoded text-white for nav items", () => {
    expect(shellContent).toContain("text-foreground");
    // Active section items should use text-foreground, not text-white
    expect(shellContent).toMatch(/isActive && hasChildren[\s\S]*?text-foreground/);
  });
});

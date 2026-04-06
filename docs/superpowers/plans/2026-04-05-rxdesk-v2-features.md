# RxDesk v2 Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 features — logout button, drug rep provider search fix, menu rename, visit export (CSV+PDF), CSV parser overhaul with analytics, and multi-address provider support with maps.

**Architecture:** Bug fixes (Tasks 1-3) are quick, isolated changes. Schema migration (Task 4) must run before CSV parser (Task 5) and provider addresses (Tasks 8-9). Visit export (Tasks 6-7) depends on jspdf install. Analytics dashboards (Tasks 10-13) depend on the updated CSV parser and schema. All API routes follow the existing pattern: `checkApiAuth()` → `checkApiModuleAccess()` → Prisma query → JSON response.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Prisma 7, Vitest, TailwindCSS 4, jspdf + jspdf-autotable (new)

**Spec:** `docs/superpowers/specs/2026-04-05-rxdesk-v2-features-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `prisma/schema.prisma` | Modify | Add ProviderAddress model, rxNumber/status to PrescriptionRecord |
| `src/components/app-shell.tsx` | Modify | Logout button, menu rename |
| `src/app/api/providers/search-for-visit/route.ts` | Create | Lightweight provider search for drug reps |
| `src/lib/csv-parser.ts` | Modify | Handle PMS CSV format, new fields |
| `src/app/api/prescriptions/upload/route.ts` | Modify | Auto-create providers/addresses, store new fields |
| `src/app/api/drug-reps/visits/export/route.ts` | Create | CSV + PDF visit export |
| `src/app/(app)/app/drug-reps/page.tsx` | Modify | Update search URL, add export toolbar |
| `src/app/api/providers/[id]/route.ts` | Modify | Include addresses in GET |
| `src/app/api/providers/[id]/addresses/route.ts` | Create | CRUD for provider addresses |
| `src/app/api/providers/[id]/addresses/[addressId]/route.ts` | Create | Update/delete single address |
| `src/app/(app)/app/providers/[id]/page.tsx` | Modify | Multi-address UI with map links |
| `src/app/api/reports/rep-roi/route.ts` | Create | Visit-to-script correlation |
| `src/app/api/reports/brand-adoption/route.ts` | Create | Brand drug adoption tracking |
| `src/app/api/reports/filed-away/route.ts` | Create | Filed-away rate analysis |
| `src/app/api/reports/script-to-visit/route.ts` | Create | Script-to-visit ratio |
| `src/app/(app)/app/reports/page.tsx` | Modify | Add new report entries |
| `tests/lib/csv-parser.test.ts` | Modify | Add tests for PMS format |
| `tests/lib/visit-export.test.ts` | Create | Export logic tests |

---

### Task 1: Add logout button to app shell

**Files:**
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1: Add signOut import**

At the top of `src/components/app-shell.tsx`, add the import:

```typescript
import { signOut } from "next-auth/react";
```

Add `LogOut` to the lucide-react import:

```typescript
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Clock,
  BarChart3,
  UserCog,
  Settings,
  MapPin,
  Menu,
  X,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  CalendarDays,
  Wrench,
  Upload,
  Search,
  TrendingUp,
  HelpCircle,
  FileText,
  Heart,
  Plug,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
```

- [ ] **Step 2: Add logout button to desktop sidebar user section**

In the desktop sidebar user section (after the plan Badge, around line 326-330), add:

```tsx
{!collapsed && (
  <button
    onClick={() => signOut({ callbackUrl: "/login" })}
    className="mt-2 flex items-center gap-2 px-2 py-1.5 w-full rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
  >
    <LogOut className="w-4 h-4" />
    Sign out
  </button>
)}
{collapsed && (
  <button
    onClick={() => signOut({ callbackUrl: "/login" })}
    className="mt-2 flex items-center justify-center p-1.5 w-full rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    title="Sign out"
  >
    <LogOut className="w-4 h-4" />
  </button>
)}
```

- [ ] **Step 3: Add logout button to mobile hamburger menu**

In the mobile menu overlay (`{mobileMenuOpen && (` block, around line 367-411), add a sign-out button at the bottom of the nav, after the `{visibleNav.map(...)` block but still inside the `<nav>`:

```tsx
<button
  onClick={() => signOut({ callbackUrl: "/login" })}
  className="flex items-center gap-3 px-4 py-3 rounded-lg text-base text-muted-foreground hover:text-foreground w-full mt-2 border-t border-border pt-4"
>
  <LogOut className="w-5 h-5" />
  Sign out
</button>
```

- [ ] **Step 4: Verify manually**

Run: `cd /Users/mohammedzafer/Documents/claude/projects/rxdesk && npm run dev`

Check:
1. Desktop: sidebar shows "Sign out" below user name
2. Desktop collapsed: logout icon visible with tooltip
3. Mobile: hamburger menu shows "Sign out" at bottom
4. Clicking sign out redirects to `/login`

- [ ] **Step 5: Commit**

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
git add src/components/app-shell.tsx
git commit -m "fix: add logout button to desktop sidebar and mobile menu"
```

---

### Task 2: Fix provider search for drug reps

**Files:**
- Create: `src/app/api/providers/search-for-visit/route.ts`
- Modify: `src/app/(app)/app/drug-reps/page.tsx`

- [ ] **Step 1: Create the search-for-visit endpoint**

Create `src/app/api/providers/search-for-visit/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkApiAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow DRUG_REP role or users with DRUG_REPS module access
  const isDrugRep = session.user.role === "DRUG_REP";
  if (!isDrugRep) {
    const perm = await db.permission.findUnique({
      where: {
        userId_module: {
          userId: session.user.id,
          module: "DRUG_REPS",
        },
      },
    });
    const isOwner = session.user.role === "OWNER";
    if (!isOwner && (!perm || perm.access === "NONE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 20);

  if (search.length < 2) {
    return NextResponse.json({ providers: [] });
  }

  const providers = await db.provider.findMany({
    where: {
      organizationId: session.user.organizationId,
      isActive: true,
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { npi: { contains: search } },
        { practiceName: { contains: search, mode: "insensitive" } },
      ],
    },
    orderBy: { lastName: "asc" },
    take: limit,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      practiceName: true,
      specialty: true,
      npi: true,
    },
  });

  return NextResponse.json({ providers });
}
```

- [ ] **Step 2: Update drug-reps page to use new endpoint**

In `src/app/(app)/app/drug-reps/page.tsx`, find the provider search `useEffect` (around line 178-198). Change the fetch URL:

Replace:
```typescript
const res = await fetch(`/api/providers?search=${encodeURIComponent(providerSearch)}&limit=10`);
```

With:
```typescript
const res = await fetch(`/api/providers/search-for-visit?search=${encodeURIComponent(providerSearch)}&limit=10`);
```

- [ ] **Step 3: Verify manually**

Run dev server. Log in as a DRUG_REP user. Open the visit log page. Click "Log visit". Type a provider name in the search field. Confirm results appear in the dropdown.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/providers/search-for-visit/route.ts src/app/(app)/app/drug-reps/page.tsx
git commit -m "fix: add search-for-visit endpoint so drug reps can search providers"
```

---

### Task 3: Rename "Drug Reps" to "Track Visit" in navigation

**Files:**
- Modify: `src/components/app-shell.tsx`

- [ ] **Step 1: Update navItems label**

In `src/components/app-shell.tsx`, find the `navItems` array (around line 69). Change:

```typescript
  {
    label: "Drug Reps",
    href: "/app/drug-reps",
```

To:

```typescript
  {
    label: "Track Visit",
    href: "/app/drug-reps",
```

- [ ] **Step 2: Update drugRepOnlyNav label**

Find the `drugRepOnlyNav` array (around line 176). Change:

```typescript
  const drugRepOnlyNav: NavItem[] = [
    { label: "Drug Reps", href: "/app/drug-reps", icon: Briefcase, module: "DRUG_REPS", mobileTab: true },
  ];
```

To:

```typescript
  const drugRepOnlyNav: NavItem[] = [
    { label: "Track Visit", href: "/app/drug-reps", icon: Briefcase, module: "DRUG_REPS", mobileTab: true },
  ];
```

- [ ] **Step 3: Verify**

Run dev server. Check desktop sidebar, mobile bottom tabs, and mobile hamburger menu all show "Track Visit" instead of "Drug Reps".

- [ ] **Step 4: Commit**

```bash
git add src/components/app-shell.tsx
git commit -m "feat: rename Drug Reps to Track Visit in navigation"
```

---

### Task 4: Schema migration — ProviderAddress + PrescriptionRecord fields

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add ProviderAddress model and update PrescriptionRecord**

In `prisma/schema.prisma`, add `rxNumber` and `status` to `PrescriptionRecord` (after the `payerType` field, around line 355):

```prisma
  rxNumber       String?
  status         String?   // B=Billed, F=Filed (on hold), U=Unbilled
```

Add the `ProviderAddress` model after the `Provider` model (around line 323):

```prisma
model ProviderAddress {
  id             String   @id @default(cuid())
  providerId     String
  organizationId String
  label          String?
  address        String
  city           String?
  state          String?
  zip            String?
  isPrimary      Boolean  @default(false)
  source         String   @default("manual")
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  provider     Provider     @relation(fields: [providerId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id])

  @@index([providerId])
  @@index([organizationId])
}
```

Add the `addresses` relation to `Provider` (after `drugRepVisits` relation, around line 319):

```prisma
  addresses             ProviderAddress[]
```

Add the `providerAddresses` relation to `Organization` (in the relations block, after `drugRepVisits`):

```prisma
  providerAddresses     ProviderAddress[]
```

- [ ] **Step 2: Generate and run migration**

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npx prisma migrate dev --name add-provider-addresses-and-rx-status
```

Expected: Migration creates `ProviderAddress` table and adds `rxNumber`/`status` columns to `PrescriptionRecord`.

- [ ] **Step 3: Generate Prisma client**

```bash
npx prisma generate
```

Expected: Prisma client regenerated with new types.

- [ ] **Step 4: Create data migration to copy existing addresses**

Create a one-time script. Run it with tsx:

Create `prisma/migrations/seed-provider-addresses.ts`:

```typescript
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient();

async function main() {
  const providers = await db.provider.findMany({
    where: {
      practiceAddress: { not: null },
    },
    select: {
      id: true,
      organizationId: true,
      practiceAddress: true,
      practiceCity: true,
      practiceState: true,
      practiceZip: true,
    },
  });

  let created = 0;
  for (const p of providers) {
    if (!p.practiceAddress) continue;

    // Check if address already exists
    const existing = await db.providerAddress.findFirst({
      where: {
        providerId: p.id,
        address: p.practiceAddress,
      },
    });

    if (!existing) {
      await db.providerAddress.create({
        data: {
          providerId: p.id,
          organizationId: p.organizationId,
          address: p.practiceAddress,
          city: p.practiceCity,
          state: p.practiceState,
          zip: p.practiceZip,
          isPrimary: true,
          source: "manual",
        },
      });
      created++;
    }
  }

  console.log(`Created ${created} provider address records from existing data`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
```

Run it:

```bash
npx tsx prisma/migrations/seed-provider-addresses.ts
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ProviderAddress model and rxNumber/status to PrescriptionRecord"
```

---

### Task 5: Overhaul CSV parser for PMS format

**Files:**
- Modify: `src/lib/csv-parser.ts`
- Modify: `tests/lib/csv-parser.test.ts`

- [ ] **Step 1: Write failing tests for PMS CSV format**

Add the following test blocks to `tests/lib/csv-parser.test.ts`:

```typescript
// ---------------------------------------------------------------------------
// PMS (Pharmacy Management System) CSV format — Excel =" wrapping
// ---------------------------------------------------------------------------
describe("parseCsvContent — PMS format with =\"...\" wrapping", () => {
  it("strips =\"...\" wrappers from values and parses correctly", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="3/10/2026 12:00:00 AM",="179181",="1285268300",="Huynh. Dathao",="9256 BENDIX RD",="MINOCYCLINE 100mg CAP (65862-0211-05)",="65862-0211-05",="N",="B"'
    );
    const result = parseCsvContent(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.providerNpi).toBe("1285268300");
    expect(row.drugName).toBe("MINOCYCLINE 100mg CAP (65862-0211-05)");
    expect(row.drugNdc).toBe("65862-0211-05");
    expect(row.isGeneric).toBe(true); // BRAND=N means generic
    expect(row.status).toBe("B");
    expect(row.rxNumber).toBe("179181");
    expect(row.providerName).toBe("Huynh. Dathao");
    expect(row.providerAddress).toBe("9256 BENDIX RD");
    expect(row.fillDate.getFullYear()).toBe(2026);
    expect(row.fillDate.getMonth()).toBe(2); // March
    expect(row.fillDate.getDate()).toBe(10);
  });

  it("handles BRAND=Y as isGeneric=false", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="3/10/2026 12:00:00 AM",="187684",="1730695503",="SANYAOLU. SAMETTA",="7625 MAPLE LAWN BLVD",="QULIPTA 60MG TAB (00074-7094-30)",="00074-7094-30",="Y",="B"'
    );
    const result = parseCsvContent(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].isGeneric).toBe(false); // BRAND=Y means brand, NOT generic
  });

  it("handles STATUS values B, F, U", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="3/10/2026 12:00:00 AM",="100",="1285268300",="Test. Doc",="123 Main",="Drug A (11111-2222-33)",="11111-2222-33",="N",="B"',
      '="3/10/2026 12:00:00 AM",="101",="1285268300",="Test. Doc",="123 Main",="Drug B (11111-2222-34)",="11111-2222-34",="Y",="F"',
      '="3/10/2026 12:00:00 AM",="102",="1285268300",="Test. Doc",="123 Main",="Drug C (11111-2222-35)",="11111-2222-35",="N",="U"'
    );
    const result = parseCsvContent(csv);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].status).toBe("B");
    expect(result.rows[1].status).toBe("F");
    expect(result.rows[2].status).toBe("U");
  });

  it("parses dates with time component (M/D/YYYY H:MM:SS AM)", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="12/5/2025 12:00:00 AM",="200",="1285268300",="Test. Doc",="123 Main",="Drug A (11111-2222-33)",="11111-2222-33",="N",="B"'
    );
    const result = parseCsvContent(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fillDate.getFullYear()).toBe(2025);
    expect(result.rows[0].fillDate.getMonth()).toBe(11); // December
    expect(result.rows[0].fillDate.getDate()).toBe(5);
  });
});

describe("parseCsvContent — PMS header mappings", () => {
  it("accepts PRESNPI as the NPI column", () => {
    const csv = buildCsv(
      "PRESNPI,DRUGNAME,DATEF",
      "1234567890,Lisinopril,01/15/2024"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].providerNpi).toBe("1234567890");
  });

  it("accepts DATEF as the date column", () => {
    const csv = buildCsv(
      "NPI,DRUGNAME,DATEF",
      "1234567890,Lisinopril,03/10/2026"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fillDate.getMonth()).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npx vitest run tests/lib/csv-parser.test.ts
```

Expected: New tests FAIL because parser doesn't handle `="..."` wrapping, `PRESNPI`/`DATEF` headers, `BRAND` column, `STATUS`/`RXNO`/`PRESNAME`/`PRESADDRESS` columns, or dates with time.

- [ ] **Step 3: Update ParsedRow interface**

In `src/lib/csv-parser.ts`, update the `ParsedRow` interface:

```typescript
export interface ParsedRow {
  providerNpi: string;
  providerName: string | null;
  providerAddress: string | null;
  drugName: string;
  drugNdc: string | null;
  rxNumber: string | null;
  fillDate: Date;
  quantity: number | null;
  daysSupply: number | null;
  payerType: "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH" | "OTHER";
  isGeneric: boolean;
  status: string | null;
}
```

- [ ] **Step 4: Add cell cleaning function**

Add before `parseCsvContent`:

```typescript
/** Strip Excel formula wrapping: ="value" → value */
function cleanCell(cell: string): string {
  let v = cell.trim();
  // Remove leading = and surrounding quotes: ="foo" → foo
  if (v.startsWith('="') && v.endsWith('"')) {
    v = v.slice(2, -1);
  } else {
    // Strip plain quotes
    v = v.replace(/^["']|["']$/g, "");
  }
  return v.trim();
}
```

- [ ] **Step 5: Update date parser to handle time component**

Replace the `parseDate` function:

```typescript
function parseDate(value: string): Date | null {
  // Strip time component if present: "3/10/2026 12:00:00 AM" → "3/10/2026"
  const trimmed = value.trim().replace(/\s+\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?$/i, "");

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // US format: M/D/YYYY or MM/DD/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const d = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}
```

- [ ] **Step 6: Update column header mappings and parsing logic**

Replace the column finder section and main parsing loop in `parseCsvContent`:

```typescript
export function parseCsvContent(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => cleanCell(h).toLowerCase());

  // Map header names to expected fields
  const npiCol = headers.findIndex((h) =>
    ["npi", "provider_npi", "prescriber_npi", "presnpi", "prescribernpi"].includes(h)
  );
  const drugCol = headers.findIndex((h) =>
    ["drug_name", "drugname", "drug", "medication"].includes(h)
  );
  const dateCol = headers.findIndex((h) =>
    ["fill_date", "filldate", "date", "date_filled", "datef", "rxdate"].includes(h)
  );
  const ndcCol = headers.findIndex((h) =>
    ["ndc", "drug_ndc", "drugndc"].includes(h)
  );
  const qtyCol = headers.findIndex((h) =>
    ["quantity", "qty"].includes(h)
  );
  const daysCol = headers.findIndex((h) =>
    ["days_supply", "dayssupply", "days"].includes(h)
  );
  const payerCol = headers.findIndex((h) =>
    ["payer_type", "payertype", "payer", "insurance"].includes(h)
  );
  const genericCol = headers.findIndex((h) =>
    ["is_generic", "isgeneric", "generic", "brand_generic"].includes(h)
  );
  // PMS-specific: BRAND column (inverted: Y=brand=not generic)
  const brandCol = headers.findIndex((h) => h === "brand");
  const rxnoCol = headers.findIndex((h) =>
    ["rxno", "rx_number", "rxnumber"].includes(h)
  );
  const presNameCol = headers.findIndex((h) =>
    ["presname", "prescriber_name", "provider_name"].includes(h)
  );
  const presAddrCol = headers.findIndex((h) =>
    ["presaddress", "prescriber_address", "provider_address"].includes(h)
  );
  const statusCol = headers.findIndex((h) => h === "status");

  if (npiCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: NPI (expected: npi, provider_npi, prescriber_npi, or presnpi)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }
  if (drugCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: drug name (expected: drug_name, drugname, drug, or medication)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }
  if (dateCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: fill date (expected: fill_date, date, datef, or date_filled)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }

  const rows: ParsedRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let dateRangeStart: Date | null = null;
  let dateRangeEnd: Date | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => cleanCell(c));

    const npi = cols[npiCol]?.trim();
    if (!npi || npi.length !== 10 || !/^\d{10}$/.test(npi)) {
      errors.push({ row: i + 1, message: `Invalid NPI: "${npi}"` });
      continue;
    }

    const drugName = cols[drugCol]?.trim();
    if (!drugName) {
      errors.push({ row: i + 1, message: "Missing drug name" });
      continue;
    }

    const fillDate = parseDate(cols[dateCol] || "");
    if (!fillDate) {
      errors.push({ row: i + 1, message: `Invalid date: "${cols[dateCol]}"` });
      continue;
    }

    if (!dateRangeStart || fillDate < dateRangeStart) dateRangeStart = fillDate;
    if (!dateRangeEnd || fillDate > dateRangeEnd) dateRangeEnd = fillDate;

    // Determine isGeneric: BRAND column takes priority (inverted logic)
    let isGeneric: boolean;
    if (brandCol >= 0 && cols[brandCol]) {
      // BRAND=Y means it IS a brand drug → isGeneric=false
      // BRAND=N means it is NOT a brand drug → isGeneric=true
      isGeneric = cols[brandCol].toUpperCase() !== "Y";
    } else {
      isGeneric = parseBoolean(genericCol >= 0 ? cols[genericCol] : undefined);
    }

    rows.push({
      providerNpi: npi,
      providerName: presNameCol >= 0 ? cols[presNameCol] || null : null,
      providerAddress: presAddrCol >= 0 ? cols[presAddrCol] || null : null,
      drugName,
      drugNdc: ndcCol >= 0 ? cols[ndcCol] || null : null,
      rxNumber: rxnoCol >= 0 ? cols[rxnoCol] || null : null,
      fillDate,
      quantity: qtyCol >= 0 ? parseInt(cols[qtyCol]) || null : null,
      daysSupply: daysCol >= 0 ? parseInt(cols[daysCol]) || null : null,
      payerType: parsePayerType(payerCol >= 0 ? cols[payerCol] : undefined),
      isGeneric,
      status: statusCol >= 0 ? cols[statusCol] || null : null,
    });
  }

  return { rows, errors, dateRangeStart, dateRangeEnd };
}
```

- [ ] **Step 7: Run all CSV parser tests**

```bash
npx vitest run tests/lib/csv-parser.test.ts
```

Expected: ALL tests pass — both existing and new.

- [ ] **Step 8: Commit**

```bash
git add src/lib/csv-parser.ts tests/lib/csv-parser.test.ts
git commit -m "feat: overhaul CSV parser to handle PMS format with Excel wrapping and new fields"
```

---

### Task 6: Install jspdf and create visit export API

**Files:**
- Create: `src/app/api/drug-reps/visits/export/route.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npm install jspdf jspdf-autotable
npm install -D @types/jspdf
```

Note: `jspdf-autotable` doesn't have separate types — it augments `jspdf`.

- [ ] **Step 2: Create the export route**

Create `src/app/api/drug-reps/visits/export/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { toCsv, csvResponse } from "@/lib/report-utils";
import { format } from "date-fns";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow DRUG_REP role or DRUG_REPS module access
  const isDrugRep = session.user.role === "DRUG_REP";
  if (!isDrugRep) {
    const { allowed } = await checkApiModuleAccess(session.user.id, "DRUG_REPS", "VIEW");
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const url = new URL(req.url);
  const exportFormat = url.searchParams.get("format");
  const startDateStr = url.searchParams.get("startDate");
  const endDateStr = url.searchParams.get("endDate");

  if (!exportFormat || !["csv", "pdf"].includes(exportFormat)) {
    return NextResponse.json({ error: "format must be csv or pdf" }, { status: 400 });
  }
  if (!startDateStr || !endDateStr) {
    return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  const orgId = session.user.organizationId!;

  // Fetch visits in date range
  const visits = await db.drugRepVisit.findMany({
    where: {
      organizationId: orgId,
      visitDate: { gte: startDate, lte: endDate },
    },
    orderBy: { visitDate: "asc" },
    select: {
      id: true,
      visitDate: true,
      notes: true,
      drugRep: { select: { firstName: true, lastName: true, company: true } },
      providers: {
        select: {
          provider: {
            select: { id: true, firstName: true, lastName: true, npi: true, practiceName: true },
          },
        },
      },
    },
  });

  // Parse visit metadata from notes header
  function parseNotesHeader(notes: string | null) {
    if (!notes) return { startTime: "", endTime: "", lunchProvided: false, body: "" };
    const match = notes.match(/^\[(.+?) – (.+?)\] \[Lunch: (Yes|No)\]/);
    if (!match) return { startTime: "", endTime: "", lunchProvided: false, body: notes };
    const body = notes.replace(/^\[.+? – .+?\] \[Lunch: (?:Yes|No)\]\n?/, "");
    return { startTime: match[1], endTime: match[2], lunchProvided: match[3] === "Yes", body };
  }

  // Build flat rows for export
  const visitRows = visits.map((v) => {
    const { startTime, endTime, lunchProvided, body } = parseNotesHeader(v.notes);
    return {
      date: format(v.visitDate, "MM/dd/yyyy"),
      startTime,
      endTime,
      lunchProvided: lunchProvided ? "Yes" : "No",
      providers: v.providers.map((vp) => `${vp.provider.firstName} ${vp.provider.lastName}`).join("; "),
      npis: v.providers.map((vp) => vp.provider.npi).join("; "),
      practiceName: v.providers.map((vp) => vp.provider.practiceName || "").filter(Boolean).join("; "),
      notes: body,
      repName: `${v.drugRep.firstName} ${v.drugRep.lastName}`,
      company: v.drugRep.company,
    };
  });

  // CSV export
  if (exportFormat === "csv") {
    const csv = toCsv(
      ["date", "startTime", "endTime", "lunchProvided", "providers", "npis", "practiceName", "notes", "repName", "company"],
      visitRows as unknown as Record<string, unknown>[]
    );
    return csvResponse(csv, `visits-export-${startDateStr}-${endDateStr}.csv`);
  }

  // PDF export
  const providerIds = [...new Set(visits.flatMap((v) => v.providers.map((vp) => vp.provider.id)))];

  // Fetch prescription records for visited providers in the same date range
  const rxRecords = providerIds.length > 0
    ? await db.prescriptionRecord.findMany({
        where: {
          organizationId: orgId,
          providerId: { in: providerIds },
          fillDate: { gte: startDate, lte: endDate },
        },
        select: {
          drugName: true,
          drugNdc: true,
          isGeneric: true,
          status: true,
          providerId: true,
          provider: { select: { firstName: true, lastName: true, npi: true } },
        },
      })
    : [];

  // Drug summary
  const drugMap = new Map<string, { name: string; ndc: string; total: number; billed: number; filed: number; unbilled: number; isBrand: boolean }>();
  for (const rx of rxRecords) {
    const key = rx.drugNdc || rx.drugName;
    const existing = drugMap.get(key) || {
      name: rx.drugName,
      ndc: rx.drugNdc || "—",
      total: 0,
      billed: 0,
      filed: 0,
      unbilled: 0,
      isBrand: !rx.isGeneric,
    };
    existing.total++;
    if (rx.status === "B") existing.billed++;
    else if (rx.status === "F") existing.filed++;
    else if (rx.status === "U") existing.unbilled++;
    else existing.billed++; // default to billed for legacy records without status
    drugMap.set(key, existing);
  }

  const drugSummary = Array.from(drugMap.values()).sort((a, b) => b.total - a.total);

  // Provider summary
  const providerMap = new Map<string, { name: string; npi: string; total: number; brand: number; generic: number; filed: number }>();
  for (const rx of rxRecords) {
    if (!rx.providerId || !rx.provider) continue;
    const key = rx.providerId;
    const existing = providerMap.get(key) || {
      name: `${rx.provider.firstName} ${rx.provider.lastName}`,
      npi: rx.provider.npi,
      total: 0,
      brand: 0,
      generic: 0,
      filed: 0,
    };
    existing.total++;
    if (rx.isGeneric) existing.generic++;
    else existing.brand++;
    if (rx.status === "F") existing.filed++;
    providerMap.set(key, existing);
  }

  const providerSummary = Array.from(providerMap.values()).sort((a, b) => b.total - a.total);

  // Generate PDF
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  // Page 1: Header + detailed visit log
  doc.setFontSize(18);
  doc.text(`Visit Report`, 40, 40);
  doc.setFontSize(11);
  doc.text(`${format(startDate, "MM/dd/yyyy")} — ${format(endDate, "MM/dd/yyyy")}`, 40, 58);

  const repName = visitRows[0]?.repName || "—";
  const company = visitRows[0]?.company || "—";
  doc.setFontSize(10);
  doc.text(`Rep: ${repName}  |  Company: ${company}  |  Exported: ${format(new Date(), "MM/dd/yyyy")}`, 40, 74);

  // Visit table
  (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
    startY: 90,
    head: [["Date", "Time", "Provider(s)", "Practice", "Lunch", "Notes"]],
    body: visitRows.map((r) => [r.date, `${r.startTime} – ${r.endTime}`, r.providers, r.practiceName, r.lunchProvided, r.notes.slice(0, 80)]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [0, 113, 227] },
    columnStyles: { 5: { cellWidth: 150 } },
    margin: { left: 40, right: 40 },
  });

  // Summary page
  doc.addPage();
  doc.setFontSize(16);
  doc.text("Summary", 40, 40);

  // Visit summary
  const totalVisits = visits.length;
  const uniqueProviders = providerIds.length;
  const lunchCount = visitRows.filter((r) => r.lunchProvided === "Yes").length;
  doc.setFontSize(10);
  doc.text(`Total visits: ${totalVisits}  |  Unique providers: ${uniqueProviders}  |  Lunches: ${lunchCount}  |  Total scripts: ${rxRecords.length}`, 40, 60);

  // Drug summary table
  if (drugSummary.length > 0) {
    doc.setFontSize(12);
    doc.text("Script summary by drug", 40, 82);

    (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
      startY: 92,
      head: [["Drug name", "NDC", "Total", "Billed", "Filed", "Unbilled", "Brand"]],
      body: drugSummary.map((d) => [d.name.slice(0, 50), d.ndc, d.total, d.billed, d.filed, d.unbilled, d.isBrand ? "Y" : "N"]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [0, 113, 227] },
      margin: { left: 40, right: 40 },
    });
  }

  // Provider summary table
  if (providerSummary.length > 0) {
    doc.addPage();
    doc.setFontSize(12);
    doc.text("Script summary by provider", 40, 40);

    (doc as unknown as { autoTable: (opts: unknown) => void }).autoTable({
      startY: 55,
      head: [["Provider", "NPI", "Total Rx", "Brand", "Generic", "Filed", "Filed %"]],
      body: providerSummary.map((p) => [
        p.name,
        p.npi,
        p.total,
        p.brand,
        p.generic,
        p.filed,
        p.total > 0 ? `${Math.round((p.filed / p.total) * 100)}%` : "0%",
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [0, 113, 227] },
      margin: { left: 40, right: 40 },
    });
  }

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="visit-report-${startDateStr}-${endDateStr}.pdf"`,
    },
  });
}
```

- [ ] **Step 3: Verify the route compiles**

```bash
npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: No errors in the new file.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/app/api/drug-reps/visits/export/route.ts
git commit -m "feat: add visit export API with CSV and PDF generation"
```

---

### Task 7: Add export toolbar to drug-reps page

**Files:**
- Modify: `src/app/(app)/app/drug-reps/page.tsx`

- [ ] **Step 1: Add export state and UI**

In `src/app/(app)/app/drug-reps/page.tsx`, add `Download` to the lucide-react imports:

```typescript
import {
  Calendar,
  Plus,
  Search,
  MapPin,
  UtensilsCrossed,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  FileText,
  Star,
  Download,
} from "lucide-react";
```

Add state variables inside the component (after the existing state declarations, around line 100):

```typescript
  // Export
  const [exportRange, setExportRange] = useState<number>(30);
  const [customExportStart, setCustomExportStart] = useState("");
  const [customExportEnd, setCustomExportEnd] = useState("");
  const [exporting, setExporting] = useState(false);
```

Add the export handler function (before the `return` statement):

```typescript
  const handleExport = async (fmt: "csv" | "pdf") => {
    setExporting(true);
    try {
      let startDate: string;
      let endDate: string;

      if (exportRange === -1 && customExportStart && customExportEnd) {
        startDate = customExportStart;
        endDate = customExportEnd;
      } else {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - exportRange);
        startDate = format(start, "yyyy-MM-dd");
        endDate = format(end, "yyyy-MM-dd");
      }

      const res = await fetch(`/api/drug-reps/visits/export?format=${fmt}&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fmt === "csv" ? `visits-${startDate}-${endDate}.csv` : `visit-report-${startDate}-${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${fmt.toUpperCase()} exported`);
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };
```

- [ ] **Step 2: Add export toolbar to the page UI**

After the page header `div` (the one containing "Visit log" h1 and "Log visit" button, ending around line 297), and before the grid, add:

```tsx
      {/* Export toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 bg-card rounded-xl p-3 border border-border/70">
        <span className="text-[13px] font-medium text-muted-foreground mr-1">Export:</span>
        <div className="flex gap-1 bg-muted/50 rounded-lg p-0.5">
          {[7, 14, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setExportRange(d)}
              className={[
                "px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors",
                exportRange === d ? "bg-[#0071e3] text-white" : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => setExportRange(-1)}
            className={[
              "px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors",
              exportRange === -1 ? "bg-[#0071e3] text-white" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Custom
          </button>
        </div>

        {exportRange === -1 && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customExportStart}
              onChange={(e) => setCustomExportStart(e.target.value)}
              className="h-8 rounded-lg border border-border px-2 text-[12px] bg-card text-foreground"
            />
            <span className="text-[12px] text-muted-foreground">to</span>
            <input
              type="date"
              value={customExportEnd}
              onChange={(e) => setCustomExportEnd(e.target.value)}
              className="h-8 rounded-lg border border-border px-2 text-[12px] bg-card text-foreground"
            />
          </div>
        )}

        <div className="flex gap-1.5 ml-auto">
          <button
            onClick={() => handleExport("csv")}
            disabled={exporting || (exportRange === -1 && (!customExportStart || !customExportEnd))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-[12px] font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting || (exportRange === -1 && (!customExportStart || !customExportEnd))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[12px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>
```

- [ ] **Step 3: Verify manually**

Run dev server. Navigate to Track Visit page. Confirm export toolbar appears. Select 7d and click CSV — file downloads. Select 30d and click PDF — PDF downloads with visit log + summary.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/app/drug-reps/page.tsx
git commit -m "feat: add export toolbar with CSV and PDF download to Track Visit page"
```

---

### Task 8: Update upload route to auto-create providers and store new fields

**Files:**
- Modify: `src/app/api/prescriptions/upload/route.ts`

- [ ] **Step 1: Update the upload route**

In `src/app/api/prescriptions/upload/route.ts`, after the existing NPI-to-provider mapping (around line 87-91), add auto-creation logic.

Replace the section from `// Get existing providers` to the end of the batch insert loop with:

```typescript
    // Get existing providers in this org for NPI matching
    const existingProviders = await db.provider.findMany({
      where: { organizationId: session.user.organizationId },
      select: { id: true, npi: true },
    });
    const npiToProviderId = new Map(existingProviders.map((p) => [p.npi, p.id]));

    // Auto-create providers from CSV data if NPI not found
    const newNpis = new Set<string>();
    for (const row of rows) {
      if (!npiToProviderId.has(row.providerNpi) && !newNpis.has(row.providerNpi)) {
        newNpis.add(row.providerNpi);
        // Parse provider name: "LastName. FirstName" or "LASTNAME. FIRSTNAME*"
        let firstName = "";
        let lastName = row.providerNpi;
        if (row.providerName) {
          const nameParts = row.providerName.replace(/\*$/, "").split(/\.\s*/);
          if (nameParts.length >= 2) {
            lastName = nameParts[0].trim();
            firstName = nameParts[1].trim();
          } else {
            lastName = row.providerName.replace(/\*$/, "").trim();
          }
        }

        try {
          const newProvider = await db.provider.create({
            data: {
              organizationId: session.user.organizationId,
              npi: row.providerNpi,
              firstName,
              lastName,
              practiceAddress: row.providerAddress,
              isActive: true,
            },
          });
          npiToProviderId.set(row.providerNpi, newProvider.id);

          // Auto-create address record if address present
          if (row.providerAddress) {
            await db.providerAddress.create({
              data: {
                providerId: newProvider.id,
                organizationId: session.user.organizationId,
                address: row.providerAddress,
                isPrimary: true,
                source: "csv_upload",
              },
            });
          }
        } catch {
          // Unique constraint — provider may have been created by a concurrent upload
          const existing = await db.provider.findFirst({
            where: { organizationId: session.user.organizationId, npi: row.providerNpi },
            select: { id: true },
          });
          if (existing) npiToProviderId.set(row.providerNpi, existing.id);
        }
      }
    }

    // Auto-create additional addresses for existing providers
    const addressesSeen = new Set<string>();
    for (const row of rows) {
      if (!row.providerAddress) continue;
      const providerId = npiToProviderId.get(row.providerNpi);
      if (!providerId) continue;

      const normalizedAddr = row.providerAddress.toUpperCase().replace(/\s+/g, " ").trim();
      const key = `${providerId}:${normalizedAddr}`;
      if (addressesSeen.has(key)) continue;
      addressesSeen.add(key);

      // Check if this address already exists
      const existingAddr = await db.providerAddress.findFirst({
        where: {
          providerId,
          address: { equals: row.providerAddress, mode: "insensitive" },
        },
      });

      if (!existingAddr) {
        try {
          await db.providerAddress.create({
            data: {
              providerId,
              organizationId: session.user.organizationId,
              address: row.providerAddress,
              isPrimary: false,
              source: "csv_upload",
            },
          });
        } catch {
          // Ignore duplicates
        }
      }
    }

    // Insert records in batches
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.prescriptionRecord.createMany({
        data: batch.map((row) => ({
          organizationId: session.user.organizationId,
          locationId,
          uploadId: upload.id,
          providerId: npiToProviderId.get(row.providerNpi) || null,
          providerNpi: row.providerNpi,
          drugName: row.drugName,
          drugNdc: row.drugNdc,
          isGeneric: row.isGeneric,
          fillDate: row.fillDate,
          quantity: row.quantity,
          daysSupply: row.daysSupply,
          payerType: row.payerType,
          rxNumber: row.rxNumber,
          status: row.status,
        })),
      });
    }
```

- [ ] **Step 2: Verify type correctness**

```bash
npx tsc --noEmit --pretty 2>&1 | grep "upload/route"
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/prescriptions/upload/route.ts
git commit -m "feat: auto-create providers and addresses from CSV uploads, store rxNumber and status"
```

---

### Task 9: Provider address CRUD API

**Files:**
- Create: `src/app/api/providers/[id]/addresses/route.ts`
- Create: `src/app/api/providers/[id]/addresses/[addressId]/route.ts`
- Modify: `src/app/api/providers/[id]/route.ts`

- [ ] **Step 1: Update provider GET to include addresses**

In `src/app/api/providers/[id]/route.ts`, add `addresses` to the `select` in the GET handler. After `_count`:

```typescript
      addresses: {
        select: {
          id: true,
          label: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          isPrimary: true,
          source: true,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      },
```

- [ ] **Step 2: Create addresses list + create route**

Create `src/app/api/providers/[id]/addresses/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const createAddressSchema = z.object({
  label: z.string().optional(),
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const addresses = await db.providerAddress.findMany({
    where: { providerId: id, organizationId: session.user.organizationId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ addresses });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const data = createAddressSchema.parse(body);

  // Verify provider belongs to org
  const provider = await db.provider.findFirst({
    where: { id, organizationId: session.user.organizationId },
    select: { id: true },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  // If setting as primary, unset other primaries
  if (data.isPrimary) {
    await db.providerAddress.updateMany({
      where: { providerId: id },
      data: { isPrimary: false },
    });
  }

  const address = await db.providerAddress.create({
    data: {
      providerId: id,
      organizationId: session.user.organizationId,
      label: data.label,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      isPrimary: data.isPrimary ?? false,
      source: "manual",
    },
  });

  return NextResponse.json(address, { status: 201 });
}
```

- [ ] **Step 3: Create single address update/delete route**

Create `src/app/api/providers/[id]/addresses/[addressId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";

const updateAddressSchema = z.object({
  label: z.string().optional(),
  address: z.string().min(1).optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "EDIT");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, addressId } = await params;
  const body = await req.json();
  const data = updateAddressSchema.parse(body);

  // Verify address belongs to provider in this org
  const existing = await db.providerAddress.findFirst({
    where: { id: addressId, providerId: id, organizationId: session.user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  // If setting as primary, unset others
  if (data.isPrimary) {
    await db.providerAddress.updateMany({
      where: { providerId: id, id: { not: addressId } },
      data: { isPrimary: false },
    });
  }

  const updated = await db.providerAddress.update({
    where: { id: addressId },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; addressId: string }> }
) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "PROVIDERS", "FULL");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, addressId } = await params;

  const existing = await db.providerAddress.findFirst({
    where: { id: addressId, providerId: id, organizationId: session.user.organizationId },
  });
  if (!existing) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  await db.providerAddress.delete({ where: { id: addressId } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/providers/[id]/route.ts src/app/api/providers/[id]/addresses/route.ts src/app/api/providers/[id]/addresses/\[addressId\]/route.ts
git commit -m "feat: add provider address CRUD API and include addresses in provider detail"
```

---

### Task 10: Provider detail page — multi-address UI with map links

**Files:**
- Modify: `src/app/(app)/app/providers/[id]/page.tsx`

- [ ] **Step 1: Add address types and state**

In `src/app/(app)/app/providers/[id]/page.tsx`, add to the `Provider` interface:

```typescript
  addresses: Array<{
    id: string;
    label: string | null;
    address: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    isPrimary: boolean;
    source: string;
  }>;
```

Add imports at the top — add `Pencil`, `Trash2`, `Plus`, `ExternalLink` to lucide imports:

```typescript
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Pill, MapPin, Phone, Building2, Tag, Upload, Pencil, Trash2, Plus, ExternalLink } from "lucide-react";
```

Inside the component, add state for address form (after existing state):

```typescript
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: "", address: "", city: "", state: "", zip: "" });
  const [savingAddress, setSavingAddress] = useState(false);
```

- [ ] **Step 2: Add address helper functions**

Add these functions inside the component (before the `return`):

```typescript
  const buildMapUrl = (addr: { address: string; city: string | null; state: string | null; zip: string | null }) => {
    const full = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
    return {
      apple: `https://maps.apple.com/?address=${encodeURIComponent(full)}`,
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(full)}`,
    };
  };

  const handleAddAddress = async () => {
    if (!addressForm.address.trim()) return;
    setSavingAddress(true);
    try {
      const res = await fetch(`/api/providers/${id}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });
      if (res.ok) {
        // Refresh provider data
        const p = await fetch(`/api/providers/${id}`).then((r) => r.json());
        setProvider(p);
        setShowAddAddress(false);
        setAddressForm({ label: "", address: "", city: "", state: "", zip: "" });
      }
    } catch {
      // silent
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      const res = await fetch(`/api/providers/${id}/addresses/${addressId}`, { method: "DELETE" });
      if (res.ok) {
        const p = await fetch(`/api/providers/${id}`).then((r) => r.json());
        setProvider(p);
      }
    } catch {
      // silent
    }
  };
```

- [ ] **Step 3: Replace address display with multi-address section**

In the provider header card, replace the existing single-address `MapPin` div (around line 146-149):

```tsx
          {provider.practiceCity && provider.practiceState && (
            <div className="flex items-center gap-2 text-muted-foreground dark:text-white/48">
              <MapPin className="w-4 h-4" /> {provider.practiceCity}, {provider.practiceState}{" "}
              {provider.practiceZip}
            </div>
          )}
```

With this addresses section — place it AFTER the closing `</div>` of the header card (after the tags section, around line 168), as a new card:

```tsx
      {/* Addresses */}
      <div className="mt-4 bg-card dark:bg-[#1c1c1e] rounded-xl p-5 border border-[rgba(0,0,0,0.06)] dark:border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-foreground dark:text-white">Addresses</h3>
          <button
            onClick={() => setShowAddAddress(!showAddAddress)}
            className="inline-flex items-center gap-1 text-[13px] text-[#0071e3] hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add address
          </button>
        </div>

        {provider.addresses && provider.addresses.length > 0 ? (
          <div className="space-y-3">
            {provider.addresses.map((addr) => {
              const maps = buildMapUrl(addr);
              const fullAddr = [addr.address, addr.city, addr.state, addr.zip].filter(Boolean).join(", ");
              return (
                <div key={addr.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/30 dark:bg-card/5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="text-[14px] text-foreground dark:text-white">{fullAddr}</span>
                      {addr.isPrimary && (
                        <span className="px-1.5 py-0.5 bg-[#0071e3]/10 text-[#0071e3] rounded text-[10px] font-medium">Primary</span>
                      )}
                      {addr.label && (
                        <span className="px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px] font-medium">{addr.label}</span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground/60 mt-0.5 block capitalize">{addr.source.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={maps.apple}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      title="Open in Apple Maps"
                    >
                      <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                    </a>
                    <a
                      href={maps.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      title="Open in Google Maps"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Delete address"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[14px] text-muted-foreground dark:text-white/48">No addresses on file.</p>
        )}

        {/* Add address form */}
        {showAddAddress && (
          <div className="mt-3 p-3 rounded-lg border border-border dark:border-white/10 space-y-2">
            <input
              placeholder="Label (e.g., Main Office)"
              value={addressForm.label}
              onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
              className="w-full h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
            />
            <input
              placeholder="Street address"
              value={addressForm.address}
              onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
              className="w-full h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              required
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                placeholder="City"
                value={addressForm.city}
                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                className="h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              />
              <input
                placeholder="State"
                value={addressForm.state}
                onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                className="h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              />
              <input
                placeholder="ZIP"
                value={addressForm.zip}
                onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                className="h-9 rounded-lg border border-border px-3 text-[13px] bg-card dark:bg-[#2c2c2e] text-foreground dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddAddress}
                disabled={savingAddress || !addressForm.address.trim()}
                className="px-4 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-50"
              >
                {savingAddress ? "Saving..." : "Add"}
              </button>
              <button
                onClick={() => setShowAddAddress(false)}
                className="px-4 py-1.5 border border-border rounded-lg text-[13px] text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
```

- [ ] **Step 4: Verify manually**

Run dev server. Navigate to a provider detail page. Confirm:
1. Addresses section shows with existing addresses
2. Apple Maps and Google Maps icons open correct URLs in new tabs
3. "Add address" form works and saves
4. Delete removes the address

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/app/providers/[id]/page.tsx
git commit -m "feat: multi-address UI with Apple Maps and Google Maps links on provider page"
```

---

### Task 11: Drug rep ROI report API

**Files:**
- Create: `src/app/api/reports/rep-roi/route.ts`

- [ ] **Step 1: Create the report endpoint**

Create `src/app/api/reports/rep-roi/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, roundTo, toCsv, csvResponse } from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "REPORTS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate, locationId } = parseDateRange(req);
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  const orgId = session.user.organizationId!;

  // Get all visits in range with providers
  const visits = await db.drugRepVisit.findMany({
    where: {
      organizationId: orgId,
      visitDate: { gte: startDate, lte: endDate },
      ...(locationId ? { locationId } : {}),
    },
    select: {
      id: true,
      visitDate: true,
      drugRepId: true,
      drugRep: { select: { firstName: true, lastName: true, company: true } },
      providers: {
        select: { provider: { select: { id: true, firstName: true, lastName: true, npi: true } } },
      },
    },
    orderBy: { visitDate: "asc" },
  });

  // For each visit, count brand scripts in the 30 days after
  const rows = [];
  for (const visit of visits) {
    const postVisitEnd = new Date(visit.visitDate);
    postVisitEnd.setDate(postVisitEnd.getDate() + 30);

    const providerIds = visit.providers.map((vp) => vp.provider.id);
    if (providerIds.length === 0) continue;

    const postVisitRx = await db.prescriptionRecord.count({
      where: {
        organizationId: orgId,
        providerId: { in: providerIds },
        fillDate: { gt: visit.visitDate, lte: postVisitEnd },
        isGeneric: false, // brand only
        status: "B", // billed only
      },
    });

    rows.push({
      visitDate: visit.visitDate.toISOString().split("T")[0],
      repName: `${visit.drugRep.firstName} ${visit.drugRep.lastName}`,
      company: visit.drugRep.company,
      providers: visit.providers.map((vp) => `${vp.provider.firstName} ${vp.provider.lastName}`).join("; "),
      providerCount: providerIds.length,
      brandScripts30d: postVisitRx,
    });
  }

  const totalVisits = rows.length;
  const totalBrandScripts = rows.reduce((sum, r) => sum + r.brandScripts30d, 0);
  const avgScriptsPerVisit = totalVisits > 0 ? roundTo(totalBrandScripts / totalVisits) : 0;

  if (fmt === "csv") {
    const csv = toCsv(
      ["visitDate", "repName", "company", "providers", "providerCount", "brandScripts30d"],
      rows as unknown as Record<string, unknown>[]
    );
    return csvResponse(csv, "rep-roi.csv");
  }

  return NextResponse.json({
    rows,
    totals: { totalVisits, totalBrandScripts, avgScriptsPerVisit },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/reports/rep-roi/route.ts
git commit -m "feat: add drug rep ROI report — visit-to-script correlation"
```

---

### Task 12: Brand adoption + filed-away + script-to-visit report APIs

**Files:**
- Create: `src/app/api/reports/brand-adoption/route.ts`
- Create: `src/app/api/reports/filed-away/route.ts`
- Create: `src/app/api/reports/script-to-visit/route.ts`

- [ ] **Step 1: Create brand adoption report**

Create `src/app/api/reports/brand-adoption/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, toCsv, csvResponse } from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "REPORTS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate } = parseDateRange(req);
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  const orgId = session.user.organizationId!;

  // Get brand drug prescriptions grouped by drug and provider
  const rxRecords = await db.prescriptionRecord.findMany({
    where: {
      organizationId: orgId,
      isGeneric: false,
      fillDate: { gte: startDate, lte: endDate },
    },
    select: {
      drugName: true,
      drugNdc: true,
      fillDate: true,
      providerId: true,
      status: true,
      provider: { select: { firstName: true, lastName: true, npi: true } },
    },
    orderBy: { fillDate: "asc" },
  });

  // Group by drug → provider
  const drugProviderMap = new Map<string, Map<string, { name: string; npi: string; firstDate: string; total: number; billed: number }>>();

  for (const rx of rxRecords) {
    const drugKey = rx.drugNdc || rx.drugName.toUpperCase().trim();
    if (!drugProviderMap.has(drugKey)) {
      drugProviderMap.set(drugKey, new Map());
    }
    const provMap = drugProviderMap.get(drugKey)!;
    const provId = rx.providerId || "unknown";
    const existing = provMap.get(provId) || {
      name: rx.provider ? `${rx.provider.firstName} ${rx.provider.lastName}` : "Unknown",
      npi: rx.provider?.npi || "—",
      firstDate: rx.fillDate.toISOString().split("T")[0],
      total: 0,
      billed: 0,
    };
    existing.total++;
    if (rx.status === "B" || !rx.status) existing.billed++;
    if (rx.fillDate.toISOString() < existing.firstDate) {
      existing.firstDate = rx.fillDate.toISOString().split("T")[0];
    }
    provMap.set(provId, existing);
  }

  const rows: Array<{ drug: string; provider: string; npi: string; firstPrescribed: string; totalScripts: number; billedScripts: number }> = [];
  for (const [drug, provMap] of drugProviderMap) {
    for (const [, prov] of provMap) {
      rows.push({
        drug: drug.slice(0, 60),
        provider: prov.name,
        npi: prov.npi,
        firstPrescribed: prov.firstDate,
        totalScripts: prov.total,
        billedScripts: prov.billed,
      });
    }
  }

  rows.sort((a, b) => b.totalScripts - a.totalScripts);

  const uniqueDrugs = drugProviderMap.size;
  const uniqueProviders = new Set(rxRecords.map((r) => r.providerId).filter(Boolean)).size;
  const totalScripts = rxRecords.length;

  if (fmt === "csv") {
    return csvResponse(
      toCsv(["drug", "provider", "npi", "firstPrescribed", "totalScripts", "billedScripts"], rows as unknown as Record<string, unknown>[]),
      "brand-adoption.csv"
    );
  }

  return NextResponse.json({
    rows: rows.slice(0, 200),
    totals: { uniqueDrugs, uniqueProviders, totalScripts },
  });
}
```

- [ ] **Step 2: Create filed-away report**

Create `src/app/api/reports/filed-away/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, roundTo, toCsv, csvResponse } from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "REPORTS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate } = parseDateRange(req);
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  const orgId = session.user.organizationId!;

  const rxRecords = await db.prescriptionRecord.findMany({
    where: {
      organizationId: orgId,
      fillDate: { gte: startDate, lte: endDate },
      status: { not: null },
    },
    select: {
      drugName: true,
      drugNdc: true,
      isGeneric: true,
      status: true,
      providerId: true,
      provider: { select: { firstName: true, lastName: true, npi: true } },
    },
  });

  // Group by drug
  const drugMap = new Map<string, { name: string; ndc: string; total: number; billed: number; filed: number; unbilled: number; isBrand: boolean }>();
  for (const rx of rxRecords) {
    const key = rx.drugNdc || rx.drugName.toUpperCase().trim();
    const existing = drugMap.get(key) || {
      name: rx.drugName,
      ndc: rx.drugNdc || "—",
      total: 0,
      billed: 0,
      filed: 0,
      unbilled: 0,
      isBrand: !rx.isGeneric,
    };
    existing.total++;
    if (rx.status === "B") existing.billed++;
    else if (rx.status === "F") existing.filed++;
    else if (rx.status === "U") existing.unbilled++;
    drugMap.set(key, existing);
  }

  const rows = Array.from(drugMap.values())
    .map((d) => ({
      drug: d.name.slice(0, 60),
      ndc: d.ndc,
      brand: d.isBrand ? "Y" : "N",
      total: d.total,
      billed: d.billed,
      filed: d.filed,
      unbilled: d.unbilled,
      filedRate: d.total > 0 ? roundTo((d.filed / d.total) * 100) : 0,
    }))
    .sort((a, b) => b.filedRate - a.filedRate);

  const totalScripts = rxRecords.length;
  const totalFiled = rxRecords.filter((r) => r.status === "F").length;
  const overallFiledRate = totalScripts > 0 ? roundTo((totalFiled / totalScripts) * 100) : 0;

  if (fmt === "csv") {
    return csvResponse(
      toCsv(["drug", "ndc", "brand", "total", "billed", "filed", "unbilled", "filedRate"], rows as unknown as Record<string, unknown>[]),
      "filed-away-analysis.csv"
    );
  }

  return NextResponse.json({
    rows: rows.slice(0, 200),
    totals: { totalScripts, totalFiled, overallFiledRate },
  });
}
```

- [ ] **Step 3: Create script-to-visit report**

Create `src/app/api/reports/script-to-visit/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { checkApiAuth, checkApiModuleAccess } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { parseDateRange, roundTo, toCsv, csvResponse } from "@/lib/report-utils";

export async function GET(req: Request) {
  const session = await checkApiAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { allowed } = await checkApiModuleAccess(session.user.id, "REPORTS", "VIEW");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { startDate, endDate } = parseDateRange(req);
  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");
  const orgId = session.user.organizationId!;

  const visits = await db.drugRepVisit.findMany({
    where: {
      organizationId: orgId,
      visitDate: { gte: startDate, lte: endDate },
    },
    select: {
      id: true,
      visitDate: true,
      drugRep: { select: { firstName: true, lastName: true, company: true } },
      providers: { select: { provider: { select: { id: true, firstName: true, lastName: true } } } },
    },
    orderBy: { visitDate: "asc" },
  });

  const rows = [];
  for (const visit of visits) {
    const providerIds = visit.providers.map((vp) => vp.provider.id);
    if (providerIds.length === 0) continue;

    const counts: Record<string, number> = {};
    for (const window of [7, 14, 30] as const) {
      const windowEnd = new Date(visit.visitDate);
      windowEnd.setDate(windowEnd.getDate() + window);

      counts[`scripts${window}d`] = await db.prescriptionRecord.count({
        where: {
          organizationId: orgId,
          providerId: { in: providerIds },
          fillDate: { gt: visit.visitDate, lte: windowEnd },
          status: "B",
        },
      });
    }

    rows.push({
      visitDate: visit.visitDate.toISOString().split("T")[0],
      repName: `${visit.drugRep.firstName} ${visit.drugRep.lastName}`,
      company: visit.drugRep.company,
      providers: visit.providers.map((vp) => `${vp.provider.firstName} ${vp.provider.lastName}`).join("; "),
      scripts7d: counts["scripts7d"],
      scripts14d: counts["scripts14d"],
      scripts30d: counts["scripts30d"],
    });
  }

  const totalVisits = rows.length;
  const avg7d = totalVisits > 0 ? roundTo(rows.reduce((s, r) => s + r.scripts7d, 0) / totalVisits) : 0;
  const avg14d = totalVisits > 0 ? roundTo(rows.reduce((s, r) => s + r.scripts14d, 0) / totalVisits) : 0;
  const avg30d = totalVisits > 0 ? roundTo(rows.reduce((s, r) => s + r.scripts30d, 0) / totalVisits) : 0;

  if (fmt === "csv") {
    return csvResponse(
      toCsv(["visitDate", "repName", "company", "providers", "scripts7d", "scripts14d", "scripts30d"], rows as unknown as Record<string, unknown>[]),
      "script-to-visit.csv"
    );
  }

  return NextResponse.json({
    rows,
    totals: { totalVisits, avg7d, avg14d, avg30d },
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reports/brand-adoption/route.ts src/app/api/reports/filed-away/route.ts src/app/api/reports/script-to-visit/route.ts
git commit -m "feat: add brand adoption, filed-away analysis, and script-to-visit report APIs"
```

---

### Task 13: Register new reports in reports page

**Files:**
- Modify: `src/app/(app)/app/reports/page.tsx`

- [ ] **Step 1: Add new report entries to reportCategories**

In `src/app/(app)/app/reports/page.tsx`, find the "Drug Rep" category (around line 70-75). Replace:

```typescript
  {
    name: "Drug Rep",
    icon: Briefcase,
    reports: [
      { id: "rep-activity", label: "Rep Activity", desc: "Visit frequency and coverage" },
    ],
  },
```

With:

```typescript
  {
    name: "Drug Rep",
    icon: Briefcase,
    reports: [
      { id: "rep-activity", label: "Rep Activity", desc: "Visit frequency and coverage" },
      { id: "rep-roi", label: "Rep ROI", desc: "Visit-to-script correlation per rep" },
      { id: "brand-adoption", label: "Brand Adoption", desc: "Brand drug prescribing trends by provider" },
      { id: "filed-away", label: "Filed-Away Analysis", desc: "Scripts filed (not dispensed) by drug and rate" },
      { id: "script-to-visit", label: "Script-to-Visit Ratio", desc: "New scripts in 7/14/30 days after each visit" },
    ],
  },
```

- [ ] **Step 2: Add KPI cards for new reports**

In the `getSummaryCards` function, add cases for the new reports. Add before the `default:` case:

```typescript
    case "rep-roi":
      return [
        { label: "Total visits", value: fmt(combined.totalVisits) },
        { label: "Brand scripts (30d post-visit)", value: fmt(combined.totalBrandScripts) },
        { label: "Avg scripts per visit", value: fmt(combined.avgScriptsPerVisit, 1) },
      ];
    case "brand-adoption":
      return [
        { label: "Unique brand drugs", value: fmt(combined.uniqueDrugs) },
        { label: "Unique providers", value: fmt(combined.uniqueProviders) },
        { label: "Total brand scripts", value: fmt(combined.totalScripts) },
      ];
    case "filed-away":
      return [
        { label: "Total scripts", value: fmt(combined.totalScripts) },
        { label: "Filed away", value: fmt(combined.totalFiled) },
        { label: "Filed rate", value: `${fmt(combined.overallFiledRate, 1)}%` },
      ];
    case "script-to-visit":
      return [
        { label: "Total visits", value: fmt(combined.totalVisits) },
        { label: "Avg scripts (7d)", value: fmt(combined.avg7d, 1) },
        { label: "Avg scripts (30d)", value: fmt(combined.avg30d, 1) },
      ];
```

- [ ] **Step 3: Verify manually**

Run dev server. Navigate to Reports page. Confirm new reports appear under "Drug Rep" category. Click each one and verify data loads (may be empty if no data — that's fine).

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/app/reports/page.tsx
git commit -m "feat: register rep ROI, brand adoption, filed-away, and script-to-visit reports"
```

---

### Task 14: Update RELEASE_NOTES.md

**Files:**
- Modify: `RELEASE_NOTES.md` (in project root)

- [ ] **Step 1: Add v2 release notes**

Prepend to `projects/rxdesk/RELEASE_NOTES.md`:

```markdown
## v2.0 — 04/05/2026

### Bug fixes
- Added logout button to desktop sidebar and mobile menu
- Fixed provider search for drug reps — drug rep role can now search providers when logging visits
- Renamed "Drug Reps" to "Track Visit" in navigation

### Features
- **Visit export** — export visit data as CSV or PDF with date range selection (7d, 14d, 30d, 60d, 90d, custom). PDF includes detailed visit log + script summary cross-referenced with prescription data
- **CSV parser overhaul** — supports PMS format with Excel `="..."` wrapping, new columns (RXNO, PRESNAME, PRESADDRESS, STATUS), date with time parsing, corrected brand/generic logic
- **Auto-create providers** — uploading CSV automatically creates provider records and addresses from prescriber data
- **Multiple provider addresses** — providers can have multiple addresses with Apple Maps and Google Maps integration. Addresses auto-populated from CSV uploads and manually editable
- **Filed-away tracking** — prescription status (Billed/Filed/Unbilled) stored and analyzed. Filed = on hold, not dispensed

### Analytics
- **Rep ROI dashboard** — correlate drug rep visits with brand script volume in the 30 days following each visit
- **Brand adoption tracker** — track when providers start prescribing brand drugs, with volume trends
- **Filed-away analysis** — surface drugs and providers with high filed-away rates (lost opportunity)
- **Script-to-visit ratio** — measure scripts generated within 7/14/30 days of each visit
```

- [ ] **Step 2: Commit**

```bash
git add projects/rxdesk/RELEASE_NOTES.md
git commit -m "docs: update release notes for v2 features"
```

---

### Task 15: Final verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npx vitest run
```

Expected: ALL tests pass.

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run dev server and smoke test**

```bash
npm run dev
```

Verify:
1. Logout button visible and works (desktop + mobile)
2. Drug rep can search providers when logging a visit
3. Nav shows "Track Visit" instead of "Drug Reps"
4. Export toolbar on Track Visit page — CSV and PDF both download
5. Provider detail page shows addresses with map links
6. Reports page shows 4 new reports under Drug Rep category

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git status
# If clean, done. If fixes were made, commit them.
```

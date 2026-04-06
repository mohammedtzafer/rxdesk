# RxDesk v2 features design spec

**Date:** 04/05/2026
**Status:** Approved
**Scope:** 6 features — bug fixes, CSV parser overhaul, export, analytics, multi-address + maps

---

## 1. Logout button (bug fix)

### Problem

No sign-out action exists in the app shell. Desktop sidebar user section links to profile page only. Mobile hamburger menu has no logout. Users must manually clear session or navigate away.

### Solution

Add a "Sign out" button in two locations within `src/components/app-shell.tsx`:

**Desktop sidebar** — below the profile link in the user section (bottom of sidebar). Rendered as a text button with `LogOut` lucide icon. Calls `signOut()` from `next-auth/react` with `callbackUrl: "/login"`.

**Mobile hamburger menu** — at the bottom of the mobile nav overlay. Same styling and behavior.

The button should be visible for ALL roles including DRUG_REP.

### Files changed

- `src/components/app-shell.tsx` — add sign-out button, import `signOut` from next-auth/react

---

## 2. Provider search for drug rep visits (bug fix)

### Problem

Drug reps logging visits search providers via `/api/providers?search=...`. This endpoint requires `PROVIDERS` module VIEW access. Drug rep role has no PROVIDERS permission, so the search silently returns 403 and the dropdown shows no results.

### Solution

Create a new lightweight endpoint: `/api/providers/search-for-visit`

**Authorization:** Requires authenticated user AND one of:
- Role is `DRUG_REP`
- Has `DRUG_REPS` module VIEW or higher access

**Query params:**
- `search` (required) — search string, min 2 characters
- `limit` (optional, default 10, max 20)

**Search logic:** Same OR query as existing providers endpoint — matches `firstName`, `lastName`, `npi`, `practiceName` (case-insensitive contains). Scoped to user's `organizationId`.

**Response:** Minimal shape only:
```json
{
  "providers": [
    {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "practiceName": "string | null",
      "specialty": "string | null",
      "npi": "string"
    }
  ]
}
```

Update `src/app/(app)/app/drug-reps/page.tsx` to call `/api/providers/search-for-visit` instead of `/api/providers`.

### Files changed

- `src/app/api/providers/search-for-visit/route.ts` — new endpoint
- `src/app/(app)/app/drug-reps/page.tsx` — update fetch URL

---

## 3. Menu rename: "Drug Reps" to "Track Visit"

### Change

Rename the top-level navigation label only. Sub-items stay as-is.

In `src/components/app-shell.tsx`:
- `navItems` array: change `label: "Drug Reps"` to `label: "Track Visit"` for the item with `href: "/app/drug-reps"`
- `drugRepOnlyNav` array: same change

Sub-items remain:
- "Visit Log" (`/app/drug-reps`)
- "Correlations" (`/app/drug-reps/correlations`)

### Files changed

- `src/components/app-shell.tsx` — two label string changes

---

## 4. Visit data export (CSV + PDF)

### Overview

Add export functionality to the Track Visit page. Users can export visit data by date range as CSV or PDF. The PDF cross-references prescription records for visited providers to show script volume and drug breakdowns.

### Access control

Available to:
- Users with `DRUG_REP` role
- Users with `DRUG_REPS` module VIEW or higher access

### UI changes

Add an export toolbar to `src/app/(app)/app/drug-reps/page.tsx`:
- Date range selector: preset buttons (7d, 14d, 30d, 60d, 90d) + custom date range picker
- Two export buttons: "Export CSV" and "Export PDF"
- Buttons trigger download via the export API

### API endpoint

`GET /api/drug-reps/visits/export`

**Query params:**
- `format` — `csv` or `pdf` (required)
- `startDate` — ISO date string (required)
- `endDate` — ISO date string (required)

**Authorization:** Same as visit access (DRUG_REP role or DRUG_REPS module access).

**CSV output columns:**
- Visit date
- Start time
- End time
- Lunch provided (Yes/No)
- Provider name(s)
- Provider NPI(s)
- Practice name
- Notes

Returns `Content-Type: text/csv` with `Content-Disposition: attachment; filename=visits-export-{startDate}-{endDate}.csv`.

**PDF output structure:**

Uses `jspdf` + `jspdf-autotable` for server-side PDF generation.

**Page 1+: Detailed visit log**
- Header: "Visit Report — {startDate} to {endDate}"
- Sub-header: Rep name, company, export date
- Table: Date, Time, Provider(s), Practice, Lunch, Notes

**Following pages: Summary section**

Cross-references `PrescriptionRecord` data for the providers visited during the date range:

- **Visit summary:** Total visits, unique providers visited, lunches provided
- **Script summary table:** Drug name, NDC, total scripts (Billed), filed count, unbilled count, brand/generic flag
- **Provider breakdown table:** Provider name, NPI, total scripts, brand count, generic count, filed-away rate
- **Brand drug performance:** Top brand drugs by volume with B/F/U breakdown

Returns `Content-Type: application/pdf` with `Content-Disposition: attachment; filename=visit-report-{startDate}-{endDate}.pdf`.

### Dependencies

- `jspdf` — PDF generation
- `jspdf-autotable` — table rendering in PDFs

### Files changed

- `src/app/api/drug-reps/visits/export/route.ts` — new export API
- `src/app/(app)/app/drug-reps/page.tsx` — add export toolbar UI
- `package.json` — add jspdf + jspdf-autotable

---

## 5. CSV parser overhaul + prescription analytics

### 5a. CSV parser fixes

The existing parser at `src/lib/csv-parser.ts` cannot handle the real-world CSV format from pharmacy management systems. The sample file uses Excel formula wrapping (`="value"`), different column names, dates with timestamps, and inverted brand/generic logic.

**Fixes required:**

1. **Strip `="..."` wrappers** — add a cell cleaning step that removes leading `=` and surrounding quotes from all values

2. **Expand column name mappings:**
   - NPI: add `presnpi`, `prescribernpi`
   - Drug: add `drugname` (already matched), verify
   - Date: add `datef`, `rxdate`
   - NDC: already matches `ndc`
   - Brand/Generic: add `brand` — with INVERTED logic (Y = brand = isGeneric:false, N = generic = isGeneric:true). Existing data uploaded through the old parser is unaffected — the `isGeneric` field on existing PrescriptionRecords remains as-is. Only new uploads through the updated parser use the corrected logic.
   - New columns: `rxno` → rxNumber, `presname` → providerName, `presaddress` → providerAddress, `status` → status

3. **Date parsing** — handle `M/D/YYYY H:MM:SS AM/PM` format by stripping time component before parsing

4. **Add provider name column** — map `presname` header, extract firstName/lastName from "LastName. FirstName" format

5. **Add provider address column** — map `presaddress` header

6. **Add status column** — map `status` header (B/F/U)

7. **Add Rx number column** — map `rxno` header

**Updated `ParsedRow` interface:**
```typescript
export interface ParsedRow {
  providerNpi: string;
  providerName: string | null;    // NEW
  providerAddress: string | null; // NEW
  drugName: string;
  drugNdc: string | null;
  rxNumber: string | null;        // NEW
  fillDate: Date;
  quantity: number | null;
  daysSupply: number | null;
  payerType: "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH" | "OTHER";
  isGeneric: boolean;
  status: string | null;          // NEW — "B", "F", "U"
}
```

### 5b. Schema changes

**Add fields to `PrescriptionRecord`:**
```prisma
model PrescriptionRecord {
  // ... existing fields ...
  rxNumber  String?   // Prescription number from PMS
  status    String?   // B=Billed, F=Filed (on hold), U=Unbilled
}
```

**Add `ProviderAddress` model** (see section 6 for full definition).

**Add relation on Organization:**
```prisma
model Organization {
  // ... existing relations ...
  providerAddresses ProviderAddress[]
}
```

### 5c. Upload processing enhancements

In `src/app/api/prescriptions/upload/route.ts`:

1. **Auto-create providers:** When a CSV row has a `providerNpi` that doesn't exist in the org, auto-create a Provider record using:
   - NPI from `PRESNPI`
   - Name parsed from `PRESNAME` (split on `. ` → lastName, firstName; strip `*` suffix)
   - First address from `PRESADDRESS` stored as primary ProviderAddress

2. **Auto-create provider addresses:** For each unique (providerId, normalized address) pair, create a `ProviderAddress` record with `source: "csv_upload"`. Normalize by trimming, uppercasing, collapsing whitespace.

3. **Store new fields:** Map `rxNumber` and `status` from parsed CSV to PrescriptionRecord.

### 5d. Analytics dashboards

Add new report sections to `/app/reports` page or as sub-pages:

**Drug rep ROI dashboard** (`/app/reports` section or new page)
- Select a drug rep → shows their visit history alongside script volume changes for visited providers
- Line chart: visits overlaid with brand script volume (7-day rolling)
- Table: per-provider breakdown showing pre-visit vs post-visit script counts for promoted drugs

**Brand adoption tracker**
- Select a brand drug (e.g., VTAMA, QULIPTA) → see adoption curve across all providers
- Table: provider name, first prescribed date, total scripts, trend direction
- Filter by date range

**Filed-away analysis**
- Table: drug name, NDC, total scripts, billed count, filed count, unbilled count, filed-away rate (%)
- Sort by filed-away rate to surface problem drugs
- Provider-level drill-down: which providers have the highest filed-away rates per drug

**Script-to-visit ratio**
- For each drug rep visit, count new scripts from visited providers in the 7/14/30 days following
- Summary: average scripts per visit, best-performing provider relationships

**Provider prescribing heatmap**
- Grid: providers (rows) x brand drugs (columns) x script count (cell value/color intensity)
- Filter by date range
- Highlight providers with 0 scripts for drugs being promoted to them

### API endpoints for analytics

- `GET /api/reports/rep-roi` — visit-to-script correlation data
- `GET /api/reports/brand-adoption` — brand drug adoption trends
- `GET /api/reports/filed-away` — filed-away rate analysis
- `GET /api/reports/script-to-visit` — script-to-visit ratio data

These extend the existing reports API pattern (`src/app/api/reports/`).

### Files changed

- `src/lib/csv-parser.ts` — overhaul parser
- `src/app/api/prescriptions/upload/route.ts` — auto-create providers, addresses, store new fields
- `prisma/schema.prisma` — add rxNumber/status to PrescriptionRecord, add ProviderAddress model
- `src/app/api/reports/rep-roi/route.ts` — new
- `src/app/api/reports/brand-adoption/route.ts` — new
- `src/app/api/reports/filed-away/route.ts` — new
- `src/app/api/reports/script-to-visit/route.ts` — new
- `src/app/(app)/app/reports/page.tsx` — add new report sections/cards

---

## 6. Provider multiple addresses + maps

### Schema

```prisma
model ProviderAddress {
  id             String   @id @default(cuid())
  providerId     String
  organizationId String
  label          String?  // "Main Office", "Satellite", etc.
  address        String
  city           String?
  state          String?
  zip            String?
  isPrimary      Boolean  @default(false)
  source         String   @default("manual") // "manual" | "csv_upload" | "nppes"
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  provider     Provider     @relation(fields: [providerId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id])

  @@index([providerId])
  @@index([organizationId])
}
```

Add relation to Provider:
```prisma
model Provider {
  // ... existing fields ...
  addresses ProviderAddress[]
}
```

### Migration plan

Existing providers with address data (practiceAddress, practiceCity, practiceState, practiceZip) get a ProviderAddress record created during migration with `isPrimary: true` and `source: "manual"`. The original fields remain on the Provider model for backwards compatibility but new code reads from ProviderAddress.

### API changes

**`GET /api/providers/[id]`** — include `addresses` in the response.

**`POST /api/providers/[id]/addresses`** — create a new address for a provider.
```json
{
  "label": "Satellite office",
  "address": "123 Main St",
  "city": "Columbia",
  "state": "MD",
  "zip": "21044",
  "isPrimary": false
}
```

**`PUT /api/providers/[id]/addresses/[addressId]`** — update an address.

**`DELETE /api/providers/[id]/addresses/[addressId]`** — remove an address. Cannot delete the last address if provider has prescription records.

### UI changes

On `src/app/(app)/app/providers/[id]/page.tsx`:

Replace the current single-line address display with an **Addresses section**:

- List of addresses, each showing:
  - Label badge (if set) + full address text
  - "Primary" badge on the primary address
  - Source badge ("CSV", "NPPES", "Manual") in muted text
  - Two small icon buttons:
    - Apple Maps icon → opens `https://maps.apple.com/?address={encoded full address}`
    - Google Maps icon → opens `https://www.google.com/maps/search/?api=1&query={encoded full address}`
  - Edit/Delete buttons (for users with PROVIDERS EDIT access)
- "Add address" button at the bottom opens an inline form

### Map link format

```typescript
const fullAddress = `${address}, ${city}, ${state} ${zip}`;
const appleMapsUrl = `https://maps.apple.com/?address=${encodeURIComponent(fullAddress)}`;
const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
```

Both open in a new tab. On iOS/macOS, the Apple Maps link opens the native Maps app. On Android/other, it opens in browser.

### Files changed

- `prisma/schema.prisma` — add ProviderAddress model, relation on Provider and Organization
- `src/app/api/providers/[id]/route.ts` — include addresses in GET response
- `src/app/api/providers/[id]/addresses/route.ts` — new CRUD endpoint
- `src/app/api/providers/[id]/addresses/[addressId]/route.ts` — new update/delete endpoint
- `src/app/(app)/app/providers/[id]/page.tsx` — multi-address UI with map links
- Migration script to move existing address data to ProviderAddress records

---

## Implementation order

1. **Schema changes** — ProviderAddress model, PrescriptionRecord new fields, migration
2. **Bug fixes** — logout button, provider search endpoint, menu rename (quick wins)
3. **CSV parser overhaul** — fix parser, update upload processing
4. **Provider addresses UI** — multi-address display, CRUD, map links
5. **Visit export** — CSV + PDF export with prescription cross-reference
6. **Analytics dashboards** — rep ROI, brand adoption, filed-away, script-to-visit, heatmap

---

## Dependencies to install

- `jspdf` — PDF generation
- `jspdf-autotable` — PDF table rendering

# RxDesk MVP design spec

**Date:** 04/04/2026
**Status:** Approved
**Product:** RxDesk — SaaS for independent pharmacies and chains
**Tagline:** "Know your prescribers. Grow your scripts. Protect your revenue."

---

## 1. Product overview

RxDesk is a modular SaaS platform for independent pharmacies and chains of independents. It combines prescriber relationship management, drug rep tracking, prescription analytics, and time tracking into a single affordable tool.

**Target customer:** Independent pharmacy owners (19,000 US locations)
**Price range:** $99-$299/month (6-18x cheaper than the only competitor, Dotti at $1,815/mo)
**Core differentiators:**
- Drug rep visit tracking from pharmacy perspective (no competitor exists)
- Prescription volume analytics by NPI/provider with trend detection
- Prescriber scorecards with declining volume alerts
- Affordable pricing accessible to margin-constrained pharmacies
- Time tracking built in (leveraging Timecraft codebase)

---

## 2. MVP modules

### Module 1: Core platform (reused from Timecraft)
- Auth: email/password + optional Google OAuth via Auth.js
- Multi-tenancy: organizationId scoping on every query
- Billing: Stripe subscriptions (Starter $99, Growth $199, Pro $299)
- 14-day free trial on all plans
- App shell: sidebar nav, mobile tabs, responsive layout
- Team management: invite, deactivate/reactivate
- Audit log system
- Email system: Resend templates
- White-label branding support

### Module 2: Time tracking (reused from Timecraft)
- Clock in/out with real-time punches
- Manual time entry
- Weekly timesheet grid
- Submit, approve/reject workflow
- Overtime calculation (daily + weekly thresholds)
- Break tracking (paid/unpaid/auto-deduct)
- Pay rates with effective dates
- Shift scheduling, PTO, availability, shift swaps
- Scoped to location

### Module 3: Provider directory
- Search NPPES API by name, NPI, specialty, city/state
- Add to directory with auto-populated fields from NPPES
- Bulk import via CSV (columns: NPI, optional name)
- Manual add for providers not in NPPES
- Provider profile page with tabs: Rx Analytics, Drug Rep Activity, Notes & History
- Directory list: filterable by specialty, tag, location, trend; sortable by name, volume, % change
- Quick indicators: trend arrow, volume badge, alert icons
- Tags and notes per provider

### Module 4: Prescription analytics
- CSV upload with drag-and-drop
- Template download (expected columns: NPI, provider name, drug name, NDC, fill date, quantity, days supply, payer type, generic flag)
- Async row processing with validation
- Auto-match to existing providers by NPI, create stubs for unmatched
- Upload history with row counts, date ranges, error logs
- Dashboard: total Rx, top prescribers, trend overview, alerts, concentration risk
- Drill-down: by provider, by drug, by payer
- Location filter for multi-location orgs

### Module 5: Drug rep tracker
- Rep directory: name, company, email, phone, territory
- Visit logging: rep, date, location, duration, providers discussed, drugs promoted, samples left, notes, follow-up date
- Rep profile: all visits, providers discussed, drugs promoted
- Correlation view: timeline with rep visit markers overlaid on Rx volume charts

---

## 3. Tech stack

Identical to Timecraft:
- Next.js 16 (App Router, Turbopack)
- React 19 + TypeScript strict
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL + Prisma 7 with @prisma/adapter-neon
- Auth.js v5 (JWT session strategy)
- Stripe (subscriptions, checkout, customer portal)
- Resend (email)
- Sentry (error tracking)
- Vitest (testing)
- Deploy to Vercel

---

## 4. Design system

**Foundation:** Apple design system adapted for SaaS dashboard context.

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| --background | #f5f5f7 | App page backgrounds |
| --foreground | #1d1d1f | Primary text on light backgrounds |
| --primary | #0071e3 | Apple Blue — all interactive elements, CTAs, active states, focus rings |
| --primary-foreground | #ffffff | Text on primary elements |
| --card | #ffffff | Card backgrounds in app |
| --card-foreground | #1d1d1f | Card text |
| --secondary | rgba(0,0,0,0.8) | Secondary text, nav items |
| --muted | rgba(0,0,0,0.48) | Tertiary text, disabled states |
| --dark-bg | #000000 | Marketing/landing page hero sections |
| --dark-surface | #272729 | Cards on dark backgrounds |
| --link-light | #0066cc | Links on light backgrounds |
| --link-dark | #2997ff | Links on dark backgrounds |
| --destructive | #EF4444 | Error states, destructive actions |

### Functional colors (analytics only, not decorative)
| Token | Value | Usage |
|-------|-------|-------|
| --trend-up | #22C55E | Green up arrow for positive trends |
| --trend-down | #EF4444 | Red down arrow for negative trends |
| --trend-stable | #9CA3AF | Gray dash for stable trends |

### Typography
- Display (20px+): SF Pro Display, fallbacks: Helvetica Neue, Helvetica, Arial, sans-serif
- Body (<20px): SF Pro Text, same fallbacks
- Negative letter-spacing at all sizes: -0.28px at 56px, -0.374px at 17px, -0.224px at 14px, -0.12px at 12px
- Headline line-heights: 1.07-1.14 (tight)
- Body line-height: 1.47

### Key typography scale
| Role | Size | Weight | Line height | Letter spacing |
|------|------|--------|-------------|----------------|
| Page title | 40px | 600 | 1.10 | normal |
| Section heading | 28px | 400 | 1.14 | 0.196px |
| Card title | 21px | 700 | 1.19 | 0.231px |
| Body | 17px | 400 | 1.47 | -0.374px |
| Body emphasis | 17px | 600 | 1.24 | -0.374px |
| Caption | 14px | 400 | 1.29 | -0.224px |
| Micro | 12px | 400 | 1.33 | -0.12px |

### Components
- **Sidebar nav:** Translucent glass (rgba(0,0,0,0.8) + backdrop-filter: saturate(180%) blur(20px)), white text, active state Apple Blue pill
- **Buttons:** Primary Apple Blue (#0071e3), 8px radius, 8px 15px padding. Pill CTAs (980px radius) on marketing pages only
- **Cards:** White on #f5f5f7, no borders, optional shadow (rgba(0,0,0,0.22) 3px 5px 30px 0px) for elevated cards
- **Tables:** Clean rows on white, no borders, hover #f5f5f7
- **Charts:** CSS/SVG-based, Apple Blue primary data color, #1d1d1f secondary
- **Empty states:** Centered illustration + headline + CTA
- **Loading:** Skeleton screens
- **Toasts:** Sonner, top-right

### Responsive
- Mobile bottom tab bar: Dashboard, Providers, Prescriptions, Drug Reps, More
- FAB for quick actions (log visit, upload CSV, clock in)
- Sidebar collapses to icons on smaller desktops

---

## 5. Data model

### Reused from Timecraft (unchanged or lightly adapted)
- Organization — add locations relation
- User — add locationId, permissions relation
- Account, Session, VerificationToken — unchanged
- AuditLog — unchanged
- Invite — add locationId
- TimeEntry, Timesheet, ShiftAssignment, PtoRequest, AvailabilityPreference, AvailabilityOverride, ShiftSwapRequest, ScheduleTemplate, CoverageRequirement, PayRate, TimesheetAmendment, Department, CalendarConnection, EmailNotificationPreference, AccessRequest

### New models

#### Location
```
id                String    @id @default(cuid())
organizationId    String
name              String
address           String?
city              String?
state             String?
zip               String?
phone             String?
npiNumber         String?   // pharmacy NPI
licenseNumber     String?
isActive          Boolean   @default(true)
createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt

@@unique([organizationId, name])
```

#### Permission
```
id                String    @id @default(cuid())
userId            String
organizationId    String
module            Module    // enum: PROVIDERS, PRESCRIPTIONS, DRUG_REPS, TIME_TRACKING, TEAM, REPORTS, SETTINGS
access            Access    // enum: NONE, VIEW, EDIT, FULL
createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt

@@unique([userId, module])
```

#### Provider
```
id                String    @id @default(cuid())
organizationId    String
npi               String
firstName         String
lastName          String
suffix            String?
credential        String?
specialty         String?
practiceName      String?
practiceAddress   String?
practiceCity      String?
practiceState     String?
practiceZip       String?
practicePhone     String?
tags              Json      @default("[]")   // ["high-value", "declining", "new"]
notes             String?
isActive          Boolean   @default(true)
enrichedFromNppes Boolean   @default(false)
lastEnrichedAt    DateTime?
createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt

@@unique([organizationId, npi])
@@index([organizationId])
@@index([organizationId, specialty])
```

#### PrescriptionUpload
```
id                String    @id @default(cuid())
organizationId    String
locationId        String?
uploadedById      String
fileName          String
rowCount          Int       @default(0)
dateRangeStart    DateTime?
dateRangeEnd      DateTime?
status            UploadStatus  // enum: PROCESSING, COMPLETED, FAILED
errorMessage      String?
createdAt         DateTime  @default(now())
```

#### PrescriptionRecord
```
id                String    @id @default(cuid())
organizationId    String
locationId        String?
uploadId          String
providerId        String?
providerNpi       String
drugName          String
drugNdc           String?
isGeneric         Boolean   @default(false)
fillDate          DateTime
quantity          Int?
daysSupply        Int?
payerType         PayerType // enum: COMMERCIAL, MEDICARE, MEDICAID, CASH, OTHER
createdAt         DateTime  @default(now())

@@index([organizationId, providerId, fillDate])
@@index([organizationId, drugName, fillDate])
@@index([organizationId, fillDate])
@@index([organizationId, providerNpi])
```

#### DrugRep
```
id                String    @id @default(cuid())
organizationId    String
firstName         String
lastName          String
company           String
email             String?
phone             String?
territory         String?
notes             String?
createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt

@@index([organizationId])
@@index([organizationId, company])
```

#### DrugRepVisit
```
id                String    @id @default(cuid())
organizationId    String
locationId        String?
drugRepId         String
visitDate         DateTime
durationMinutes   Int?
drugsPromoted     Json      @default("[]")   // [{name, ndc, notes}]
samplesLeft       Json      @default("[]")   // [{name, quantity, lot, expiration}]
notes             String?
followUpDate      DateTime?
loggedById        String
createdAt         DateTime  @default(now())
updatedAt         DateTime  @updatedAt

@@index([organizationId, visitDate])
@@index([organizationId, drugRepId])
```

#### DrugRepVisitProvider (join table)
```
drugRepVisitId    String
providerId        String

@@id([drugRepVisitId, providerId])
```

### Enums
```
enum Role {
  OWNER
  PHARMACIST
  TECHNICIAN
}

enum Module {
  PROVIDERS
  PRESCRIPTIONS
  DRUG_REPS
  TIME_TRACKING
  TEAM
  REPORTS
  SETTINGS
}

enum Access {
  NONE
  VIEW
  EDIT
  FULL
}

enum UploadStatus {
  PROCESSING
  COMPLETED
  FAILED
}

enum PayerType {
  COMMERCIAL
  MEDICARE
  MEDICAID
  CASH
  OTHER
}
```

---

## 6. Analytics engine

All rule-based. No ML, no AI, no external APIs. Computed from PrescriptionRecord + DrugRepVisit with SQL aggregations.

### Prescriber-level metrics (per NPI)
| Metric | Calculation |
|--------|------------|
| Rx volume (30/60/90d) | COUNT of PrescriptionRecords in time window |
| Trend direction | Compare current window vs. prior window — UP/DOWN/STABLE (±5% threshold) |
| % change | ((current - prior) / prior) * 100 |
| Rx frequency | AVG Rx per week over trailing 90 days |
| Frequency deviation | Current week vs. average — flag when >1 std deviation below |
| Top drugs | Ranked drug list by fill count per prescriber |
| Brand vs. generic ratio | isGeneric true/false split, with shift detection when ratio changes >10% |
| New drug alert | Drug appears from prescriber for first time |
| Payer mix | % breakdown by payerType per prescriber |

### Portfolio-level insights
| Insight | Logic |
|---------|-------|
| New prescriber alert | First PrescriptionRecord from an NPI not previously seen |
| Dormant prescriber | No Rx in 30+ days from provider who averaged 1+/week |
| Top growers | Providers with highest positive % change (90d) |
| Top decliners | Providers with highest negative % change (90d) |
| Concentration risk | "Top N providers account for X% of total volume" |
| Single-provider drug risk | "80%+ of Drug X volume from 1-2 prescribers" |
| Day-of-week patterns | Aggregate fill volume by weekday |
| Monthly projection | Trailing 90-day average extrapolated to 30 days |

### Drug rep correlation
| Signal | Logic |
|--------|-------|
| Post-visit volume change | Compare 4-week Rx volume before vs. after DrugRepVisit for linked providers |
| New drug after visit | Provider starts prescribing a drug promoted during a rep visit |
| Brand shift after visit | Brand/generic ratio shifts toward brand within 4 weeks of visit |

### Competitive signals
| Signal | Logic |
|--------|-------|
| Declining without cause | Provider volume drops >20% over 60d, no rep visit or practice change logged |
| Practice-wide decline | 2+ providers at same practice all declining simultaneously |

---

## 7. Roles and permissions

### Base roles
| Role | Description | Default permissions |
|------|-------------|-------------------|
| OWNER | Pharmacy owner/chain operator | FULL on all modules (not editable) |
| PHARMACIST | Staff pharmacist | FULL: Providers, Prescriptions, Drug Reps, Time Tracking. VIEW: Reports. NONE: Settings, Team |
| TECHNICIAN | Pharmacy technician | EDIT: Time Tracking. VIEW: Providers. NONE: Prescriptions, Drug Reps, Reports, Settings, Team |

### Permission model
- Per-user, per-module access level
- Levels: NONE (hidden), VIEW (read-only), EDIT (read + write), FULL (read + write + delete + admin)
- OWNER defaults cannot be overridden
- PHARMACIST and TECHNICIAN defaults can be customized per user
- Permission changes logged in AuditLog

---

## 8. Multi-location support

- Single Organization with multiple Location records
- Users assigned to a primary locationId
- All transactional models (PrescriptionRecord, DrugRepVisit, TimeEntry, etc.) have optional locationId
- Dashboard and list views filterable by location
- OWNER sees rollup across all locations by default
- PHARMACIST/TECHNICIAN see their assigned location by default, can be granted cross-location access

---

## 9. Data ingestion

### MVP: CSV upload
- Drag-and-drop upload on Prescriptions page
- Downloadable CSV template with expected columns
- Async processing: create PrescriptionUpload record, parse rows, validate, insert PrescriptionRecords
- Auto-match providers by NPI, create Provider stubs for unmatched
- Error handling: skip invalid rows, report errors in upload history
- Support re-upload (new upload doesn't delete old records — additive)

### Post-MVP: PMS integration
- API integrations with PioneerRx, BestRx, Liberty, PrimeRx, Rx30
- Priority based on customer PMS distribution
- Scheduled sync (daily) pulling new prescriptions

---

## 10. Page structure

```
/app
  /(auth)
    /login
    /signup
    /invite/[token]
  /(marketing)
    / (landing page)
    /pricing
  /(app)/app
    /dashboard              — role-aware home with analytics widgets
    /providers              — NPI directory list
    /providers/search       — NPPES search and import
    /providers/[id]         — provider profile (tabs: Rx, Rep Activity, Notes)
    /providers/import       — CSV bulk import
    /prescriptions          — analytics dashboard
    /prescriptions/upload   — CSV upload + history
    /prescriptions/drugs    — drug-level analytics
    /prescriptions/payers   — payer mix analytics
    /drug-reps              — rep directory
    /drug-reps/[id]         — rep profile with visit history
    /drug-reps/visits       — visit log (list + add)
    /drug-reps/correlations — correlation timeline view
    /time-tracking          — clock in/out, timesheet (from Timecraft)
    /time-tracking/approvals — manager approval queue
    /time-tracking/schedule  — shift scheduling
    /time-tracking/time-off  — PTO requests
    /team                   — user management + permission config
    /locations              — manage pharmacy locations
    /reports                — exportable reports
    /settings               — org settings, billing, branding
    /profile                — personal user settings
```

---

## 11. API routes (new, beyond Timecraft reuse)

### Providers
- GET/POST /api/providers — list/create
- GET/PUT/DELETE /api/providers/[id] — CRUD
- GET /api/providers/[id]/analytics — prescriber metrics
- POST /api/providers/import — CSV bulk import
- GET /api/providers/search-nppes — NPPES API proxy

### Prescriptions
- POST /api/prescriptions/upload — CSV upload
- GET /api/prescriptions/uploads — upload history
- GET /api/prescriptions/dashboard — dashboard analytics
- GET /api/prescriptions/by-provider/[id] — provider drill-down
- GET /api/prescriptions/by-drug — drug-level analytics
- GET /api/prescriptions/by-payer — payer mix analytics
- GET /api/prescriptions/trends — trend calculations
- GET /api/prescriptions/alerts — new/dormant/concentration alerts

### Drug reps
- GET/POST /api/drug-reps — list/create
- GET/PUT/DELETE /api/drug-reps/[id] — CRUD
- GET/POST /api/drug-reps/visits — list/create visits
- GET/PUT/DELETE /api/drug-reps/visits/[id] — CRUD visits
- GET /api/drug-reps/correlations — rep visit / Rx volume correlations

### Locations
- GET/POST /api/locations — list/create
- PUT/DELETE /api/locations/[id] — update/deactivate

### Permissions
- GET /api/permissions/[userId] — get user permissions
- PUT /api/permissions/[userId] — update user permissions

---

## 12. Feature gating by plan

| Feature | Starter ($99) | Growth ($199) | Pro ($299) |
|---------|:---:|:---:|:---:|
| Provider directory | 50 providers | Unlimited | Unlimited |
| NPPES search & import | Yes | Yes | Yes |
| CSV upload | 1/month | Unlimited | Unlimited |
| Basic Rx analytics (volume, trends) | Yes | Yes | Yes |
| Advanced analytics (correlation, competitive signals) | No | Yes | Yes |
| Alerts (new/dormant/concentration) | No | Yes | Yes |
| Drug rep tracker | 10 visits/month | Unlimited | Unlimited |
| Time tracking | 5 employees | 25 employees | Unlimited |
| Locations | 1 | 3 | Unlimited |
| Reports export | No | CSV | CSV + PDF |
| Branding | No | No | Yes |
| API access | No | No | Yes |
| Team members | 3 | 15 | Unlimited |

---

## 13. Reuse mapping from Timecraft

| Timecraft component | RxDesk usage | Changes needed |
|---|---|---|
| Auth system (auth.ts, auth-helpers.ts) | Direct reuse | Update Role enum (OWNER/PHARMACIST/TECHNICIAN) |
| Multi-tenancy pattern | Direct reuse | No changes |
| App shell (app-shell.tsx) | Adapt | Restyle to Apple design, update nav items |
| Stripe billing (stripe.ts) | Direct reuse | Update plan names and feature gates |
| Email system (email.ts) | Direct reuse | New email templates for RxDesk notifications |
| Audit log (audit.ts) | Direct reuse | No changes |
| Team management (team routes) | Direct reuse | Add permission management UI |
| Invite system | Direct reuse | Add locationId to invites |
| shadcn/ui components | Direct reuse | Retheme to Apple design tokens |
| Time tracking (all models + routes + UI) | Module reuse | Add locationId scoping, integrate into RxDesk nav |
| Dashboard components | Adapt | New analytics widgets, keep chart patterns |
| Settings pages | Adapt | Add location management, permission config |

---

## 14. Key risks and mitigations

| Risk | Mitigation |
|------|-----------|
| NPPES API rate limits | Cache provider data locally, batch lookups, respect rate limits |
| CSV data quality | Robust validation, clear error messages, skip-and-report strategy |
| Prescription data volume | Indexed queries, pagination, date-range scoping on all analytics |
| HIPAA compliance | No PHI stored (no patient names/DOB), only aggregate Rx counts by NPI |
| SF Pro font licensing | Use system font stack with SF Pro as first choice (available on Apple devices), Helvetica Neue/Inter as fallbacks |
| Timecraft code drift | Fork Timecraft at a specific commit, not a live dependency |

---

## 15. Success criteria

- Pharmacy owner can sign up, create org, add locations in under 5 minutes
- Upload a CSV of prescriptions and see provider analytics within 30 seconds
- Search and import providers from NPPES with auto-populated profiles
- Log a drug rep visit and see correlation with Rx trends on the same screen
- Time tracking works identically to Timecraft
- All pages handle loading, error, and empty states
- WCAG 2.1 AA compliant
- All API routes auth-checked and orgId-scoped
- Mobile-responsive with functional bottom tab bar

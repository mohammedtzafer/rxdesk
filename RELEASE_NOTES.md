# RxDesk release notes

## v0.8.0 — 04/04/2026 — UX overhaul, dashboard schedule view, scheduler permission

### 25 UX improvements (all fixed)

**Critical (2):**
- Bottom tab touch targets increased to 48x48px minimum (WCAG 2.5.8 compliant)
- Landing page hero text now responsive (32/40/56px breakpoints), CTAs stack on mobile

**High (7):**
- Header action buttons now stack on mobile (flex-col sm:flex-row) across 7 pages
- All tables wrapped in overflow-x-auto with min-width for mobile horizontal scroll
- All modal dialogs have max-h-[90vh] overflow-y-auto (no more unreachable submit buttons)
- API error handling with ErrorState component (retry button) on Dashboard, Providers, Prescriptions, Drug Reps
- Drug rep visit form now includes provider multi-select (fixes correlation feature)
- Signup flow auto-detects authenticated users and skips to pharmacy setup step
- Billing plan cards stack vertically on mobile (grid-cols-1 sm:grid-cols-3)

**Medium (13):**
- More menu has semi-transparent backdrop with click-to-dismiss
- Sidebar collapse toggle and chevrons enlarged for iPad touch
- Body scroll locked behind mobile menu overlays
- NPI search add buttons enlarged to 40px+ height
- Consistent skeleton loading states across all list pages (replaced "Loading..." text)
- Stat card labels changed from 12px uppercase to 13px sentence case
- Schedule management cards use 5-column grid (no orphan card)
- PTO deny requires two-tap confirmation to prevent accidental denial
- All modal form inputs standardized to h-11 (44px, iOS minimum)
- Landing page CTAs full-width on mobile
- Password strength indicator with 4-segment bar on signup
- Team dropdown positioned to avoid offscreen rendering
- Form inputs properly sized for iOS keyboard

**Low (3):**
- Provider detail skeleton matches responsive grid layout
- FAQ accordion has smooth max-height transition animation
- More menu highlights the currently active page

### Dashboard overhaul
- **Weekly Overview** embedded directly in dashboard — see staff coverage at a glance
- **Daily Timeline** below overview — visual schedule bars for the selected day
- **Week navigation** — prev/next buttons to browse schedules
- **Location filter** — multi-select dropdown at top of dashboard
  - OWNER: sees all locations + "All locations" aggregate
  - PHARMACIST: sees assigned locations
  - Filter applies to all dashboard data (Rx analytics, schedules, alerts)

### Scheduler permission
- New SCHEDULING module added to permission system (8 modules total, was 7)
- OWNER: FULL scheduling access by default
- PHARMACIST: NONE by default (must be granted by OWNER)
- TECHNICIAN: NONE
- Owners can grant scheduling EDIT or FULL access to specific pharmacists per location
- Controls access to: Planner, Schedule publish/finalize, Copy previous week

### Testing
- 416 tests passing (updated permission tests for 8 modules)

---

## v0.7.0 — 04/04/2026 — Multi-location users, payroll export, branding, FAQ

### Multi-location team members
- Users can now be assigned to multiple locations (many-to-many via UserLocation join table)
- One location is marked as primary (affects default filters and clock-in)
- Team edit modal shows checkbox list with "Set primary" toggle per location
- User row displays all assigned locations
- New API: GET/PUT /api/team/[id]/locations for managing user-location assignments

### Payroll export integration
- Generate payroll-ready CSV files for ADP, Paychex, Gusto, or generic format
- POST /api/payroll/export — accepts format, date range, optional location filter
- ADP format: Co Code, Batch ID, File #, Reg Hours, O/T Hours, Temp Dept
- Paychex format: Employee ID, Last Name, First Name, Regular Hours, Overtime Hours, Department
- Gusto format: Employee Email, Hours Worked, Overtime Hours, Pay Period Start/End
- Generic format: all fields with quoted names and locations
- Export history tracked in PayrollExport model
- GET /api/payroll/exports — list previous exports

### Custom pharmacy branding
- Logo image upload via data URL (like PharmShift) in Settings → Branding
- 10 pharmacy emoji options (💊 🏥 ⚕️ 🩺 💉 🧪 🩹 🫀 🔬 ⚗️) as logo fallback
- Brand color picker + brand name
- Live preview in branding tab

### FAQ page
- 10 pharmacy-relevant FAQ items in accordion format
- Covers: CSV upload, NPI search, plan limits, drug rep correlations, multi-location, payroll export, notifications, data security, password reset

### Release Notes page
- Timeline-style display of all versions (v0.1.0 through v0.6.0)
- Latest version highlighted with blue dot and "Latest" badge

### Navigation updates
- FAQ and Release Notes added to sidebar (visible to all roles)
- Team page action menu: Edit member, Edit permissions, Deactivate/Reactivate

### Testing
- 416 tests passing (48 new for payroll library)
- Payroll tests: ADP/Paychex/Gusto/Generic CSV generation, format dispatch, entry aggregation

---

## v0.6.0 — 04/04/2026 — PharmShift scheduling integration

### Schedule management (ported from PharmShift/ultra-care-pharmacy)
- **Daily timeline** — Figma-inspired visual schedule bars with ruler header (1h/30m/15m granularity), role-colored employee rows, click-to-edit
- **Weekly overview** — 6-day grid showing staff count per day with role coverage breakdown
- **Weekly planner** — Full grid editor (employees × days), click any cell to edit shift details, conflict detection (time-off, over-hours, invalid times)
- **Schedule workflow** — Not Started → In Progress → Finalized status progression, comments required when editing finalized schedules
- **Copy previous week** — One-click schedule duplication
- **Employee availability** — Per-day availability toggles, time ranges, role assignments, target hours per week
- **Employee reordering** — Sort staff display order
- **Role management** — Add/rename/delete pharmacy roles per location, color-coded
- **Schedule notifications** — Auto-notify employees when schedule published or updated after finalization

### New Prisma models
- WeeklySchedule (org-scoped, unique per location+week)
- ScheduleEntry (employee×day cells with role, times, availability)
- ScheduleComment (required notes on finalized schedule edits)

### New fields on existing models
- User: targetHoursPerWeek, sortOrder
- Location: roles (JSON array of pharmacy role names)

### New API routes
- GET/POST /api/schedules — fetch/save weekly schedules with entry upsert
- GET/PUT /api/employees — employee availability + target hours
- PUT /api/employees/reorder — sort order
- PUT /api/locations/[id]/roles — per-location role management

### New libraries
- schedule-types.ts — types, day/role constants, default availability factory
- schedule-time-utils.ts — 12h↔decimal conversion, bar positioning, time options
- schedule-conflicts.ts — time validation, time-off overlap, over-hours detection

### New components (7)
- daily-timeline, weekly-overview, schedule-editor, employee-form, employee-list, role-manager, employee-avatar + breadcrumbs

### Multi-page SaaS layout
- /app/time-tracking/ — Hub with clock in/out + schedule nav cards
- /app/time-tracking/schedule/ — Daily timeline + weekly overview
- /app/time-tracking/planner/ — Weekly schedule editor
- /app/time-tracking/team/ — Employee list + availability editor
- /app/time-tracking/roles/ — Role management
- All pages use breadcrumb navigation

### Testing
- 368 tests passing (39 new: schedule-time-utils 24, schedule-conflicts 15)

---

## v0.5.0 — 04/04/2026 — Live pages + Resend integration

### Provider detail page
- Full provider profile with Rx analytics, top drugs, payer mix bar, brand/generic ratio
- Tabbed view: Analytics (with 30/60/90 day selector), Drugs (ranked bar chart), Notes
- New drugs detection (drugs in current period not in prior)
- NPPES enrichment indicator

### Live dashboard
- Fetches real data from prescriptions dashboard, alerts, and notifications APIs
- Stat cards: total Rx with trend, active providers, concentration risk, unread notifications
- Top prescribers bar chart (top 5)
- New prescriber and dormant prescriber alert cards
- Quick actions grid (upload Rx, search NPI, log visit, clock in)
- Onboarding CTA when no data uploaded

### Locations UI
- Location cards with address, staff count, NPI, phone
- Create location modal with full address fields
- Plan limit enforcement

### Email
- Default from address set to `onboarding@resend.dev` (Resend sandbox)

---

## v0.4.1 — 04/04/2026 — Full test audit + NPI validation fix

### Test suite expansion
- 329 tests across 10 files (was 266 across 9)
- New: nppes.test.ts (37 tests) — NPPES API proxy with fetch mocking, query param construction, result parsing
- Expanded: analytics (+13), csv-parser (+7), correlations (+3), permissions (+5), tokens (+2), overtime (+4), time-rounding (+3)

### Bug fix
- NPI validation in CSV parser now enforces exactly 10 digits (was only checking minimum length, allowing 11+ char NPIs and non-numeric strings)

### Edge cases added
- Trend calculation: current=0 with prior>0 correctly returns DOWN at -100%
- CSV parser: extra columns silently ignored, whitespace trimmed, strict 10-digit NPI
- Correlations: empty drugsPromoted, all-generic brand shift, boundary precision
- Overtime: zero-duration entries, 100-entry large dataset, single-day aggregation
- Time rounding: midnight boundary crossover for all increment sizes
- NPPES: missing fields graceful defaults, zip truncation, LOCATION vs MAILING address priority

### TypeScript
- Zero compile errors under strict mode

---

## v0.4.0 — 04/04/2026 — Full UI build + team management

### Time tracking UI
- Clock in/out with large toggle button and active status indicator
- Recent entries table (last 7 days) with date, start/end, duration, break, notes
- Manual time entry form via modal
- PTO request page with submit form and approve/deny actions
- Status filters (all/pending/approved/denied)

### Team management UI
- Team member list with role badges, location, last active
- Invite modal (email + role selection)
- Inline permission editor per user (7 modules x 4 access levels)
- Deactivate/reactivate users
- Pending invitations section

### Settings UI
- Three-tab layout: General, Branding, Billing
- General: org name, timezone
- Branding: brand name, brand color (with color picker), logo URL
- Billing: current plan display, plan comparison cards (Starter/Growth/Pro)

### Profile + notifications
- Notification list with unread indicators
- Mark all read functionality
- Semantic date formatting

---

## v0.3.0 — 04/04/2026 — Time tracking + notification system

### Time tracking (ported from Timecraft)
- Clock in/out toggle (POST /api/time-entries/clock)
- Manual time entry creation with date, start/end time, breaks, notes
- Time entry listing with date range filtering
- Overtime calculation: daily + weekly thresholds with proper deduplication
- Time rounding: NONE, NEAREST_5, NEAREST_15, NEAREST_30
- Organization-level settings: pay period type, OT thresholds, rounding rules, break defaults

### PTO management
- Submit time off requests (vacation, sick, personal, other)
- Manager approve/deny with optional response notes
- Role-based visibility (technicians see only their own requests)

### Scheduling infrastructure (schema ready, APIs in next phase)
- Shift assignments with location, role labels, publish status
- Availability preferences by day of week
- Availability overrides for specific dates
- Shift swap requests with approval workflow
- Schedule templates with JSON shift patterns
- Coverage requirements by day/time/department

### Notification system
- In-app notifications stored in database
- Email notifications via Resend with branded template
- Notification API: list (with unread filter), mark read, mark all read
- Automated notifications for:
  - Schedule published / updated → employees
  - PTO submitted → managers/owners
  - PTO approved / denied → employee
  - Shift swap requested → target employee
  - Shift swap approved / denied → requester
  - Timesheet approved / rejected → employee
  - Shift reminders

### Prisma schema
- 13 new models (Department, TimeEntry, Timesheet, ShiftAssignment, AvailabilityPreference, AvailabilityOverride, PtoRequest, ShiftSwapRequest, ScheduleTemplate, CoverageRequirement, PayRate, TimesheetAmendment, Notification)
- 11 new enums
- 8 time tracking settings on Organization

### Testing
- 266 tests passing (51 new: overtime 21, time-rounding 30)
- Overtime tests cover daily OT, weekly OT, combined, entry-level OT, day breakdowns
- Rounding tests cover all 4 rules with boundary values

---

## v0.2.0 — 04/04/2026 — Auth enhancements + data protection

### Email verification
- New users must verify their email before proceeding to org setup
- Verification email sent via Resend with branded HTML template
- Single-use verification tokens (1 hour expiry)
- Verify page at /verify?token=xxx with loading/success/error states
- Signup flow updated: register → "check your email" → verify → sign in → org setup

### Password reset
- "Forgot password?" link on login page
- Forgot password page at /forgot-password — enter email, receive reset link
- Reset password page at /reset-password?token=xxx — set new password with confirmation
- Rate limited (5 requests/min per IP)
- Does not leak whether an email exists (always returns success)
- Single-use reset tokens (1 hour expiry), namespaced with "reset:" prefix

### Data protection
- Seed script now refuses to run if database contains existing data (requires --force flag)
- Production environment blocked entirely without --force
- Prevents accidental data deletion in production

### New libraries
- src/lib/tokens.ts — createVerificationToken, validateVerificationToken (single-use, auto-cleanup)

### Testing
- 215 tests passing (17 new for token system)
- Token tests cover: creation, validation, expiry, single-use enforcement, namespace isolation

---

## v0.1.0 — 04/04/2026 — Initial MVP

### Core platform
- Auth.js v5 with JWT sessions, email/password login
- Three roles: OWNER, PHARMACIST, TECHNICIAN
- Per-user, per-module configurable permissions (NONE / VIEW / EDIT / FULL)
- Multi-location support with plan-based limits (Starter: 1, Growth: 3, Pro: unlimited)
- Team management: invite users via email, assign roles and locations, deactivate/reactivate
- Organization settings: name, timezone, branding (color, logo, name)
- Stripe subscription placeholders (Starter $99, Growth $199, Pro $299)
- Audit log for all mutations
- Rate limiting on registration endpoint
- Apple design system: glass sidebar, SF Pro typography, Apple Blue (#0071e3) accent

### Provider directory
- Search NPPES NPI registry by name, NPI, state, specialty
- Add providers from search results with auto-populated fields
- Provider CRUD with tags, notes, specialty filtering
- Paginated provider list with search
- Plan limit: 50 providers on Starter

### Prescription analytics
- CSV upload with drag-and-drop (flexible header detection)
- Supports MM/DD/YYYY and YYYY-MM-DD date formats
- Auto-matches uploaded NPIs to existing providers
- Dashboard: total Rx volume, trend (UP/DOWN/STABLE with ±5% threshold), top prescribers bar chart
- Concentration risk: "Top 5 providers account for X% of volume"
- New prescriber alerts: NPIs seen in last 30 days not seen before
- Dormant prescriber alerts: NPIs active 30-60 days ago but silent in last 30 days
- Plan limits: Starter 1 upload/month, Growth/Pro unlimited

### Drug rep tracker
- Drug rep directory: name, company, email, phone, territory
- Visit logging: date, duration, providers discussed, drugs promoted, samples left, notes, follow-up date
- Rep visit / Rx volume correlation analysis: ±4 week pre/post comparison
- New promoted drug detection: flags when a drug promoted during a visit appears in post-visit Rx data
- Brand/generic shift detection after rep visits
- Plan limits: Starter 10 visits/month, Growth/Pro unlimited

### Testing
- 198 unit tests across 6 test files
- Covered: permissions, rate limiting, utilities, analytics calculations, CSV parsing, correlation analysis

### Infrastructure
- Next.js 16 + TypeScript strict + Tailwind v4 + shadcn/ui
- PostgreSQL on Neon + Prisma 7
- Deployed to Vercel
- GitHub repo: mohammedtzafer/rxdesk

### Seed data
- Demo org: Valley Health Pharmacy (GROWTH plan)
- 2 locations, 6 users, 10 providers, 400 Rx records, 4 drug reps, 8 visits
- See docs/seed-data.md for full reference

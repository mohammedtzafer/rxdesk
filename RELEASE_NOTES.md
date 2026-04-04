# RxDesk release notes

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

# RxDesk release notes

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

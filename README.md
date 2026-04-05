# RxDesk

SaaS platform for independent pharmacies and chains. Prescriber relationship management, drug rep tracking, prescription analytics, and time tracking.

## Modules

- **Provider directory** — NPI search, NPPES enrichment, prescriber profiles with analytics
- **Prescription analytics** — CSV import, volume trends, brand/generic ratios, concentration risk, competitive signals
- **Drug rep tracker** — Visit logging, provider linking, Rx volume correlation
- **Time tracking** — Clock in/out, timesheets, scheduling, PTO (from Timecraft)
- **Core platform** — Auth, multi-tenancy, billing, team management, audit logs

## Tech stack

- Next.js 16 (App Router) + TypeScript strict
- Tailwind CSS v4 + shadcn/ui (Apple design system)
- PostgreSQL + Prisma 7 (@prisma/adapter-neon)
- Auth.js v5 (JWT sessions)
- Stripe (subscriptions)
- Resend (email)
- Vitest (testing)
- Deploy to Vercel

## Getting started

```bash
npm install
cp .env.example .env.local  # fill in secrets
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

## Sales materials

- [One-pager](docs/rxdesk-one-pager.docx) — 2-page Word document for prospective customers
- [Pitch deck](docs/rxdesk-pitch-deck.pptx) — 6-slide PowerPoint presentation
- **Regenerate after adding features:** `node scripts/create-sales-docs.mjs`

## Docs

- [MVP design spec](docs/superpowers/specs/2026-04-04-rxdesk-mvp-design.md)
- [Market research](docs/rxdesk-market-research.md)
- [API reference](docs/api-reference.md)
- [Pharmacy integration research](docs/pharmacy-integration-research.md)
- [Reports design](docs/reports-design.md)

# RxDesk lessons learned

## 04/04/2026 — Git author must match GitHub account

**What happened:** All commits were made with the local machine default email (`mohammedzafer@Mohammeds-MacBook-Pro-3.local`). Vercel Hobby plan rejected the deploy because it couldn't associate the committer with a GitHub user. Had to rewrite all commit history with `git rebase --root`.

**Fix:** After `git init`, immediately run:
```bash
git config user.email "mohammedtzafer@gmail.com"
git config user.name "Mohammed Zafer"
```

**Prevention:** Do this at project scaffolding time, before any commits.

## 04/04/2026 — Prisma 7 config requires dotenv for .env.local

**What happened:** `prisma db push` failed because `prisma.config.ts` used `import "dotenv/config"` which only reads `.env`, not `.env.local`. Next.js projects use `.env.local` by convention.

**Fix:** Use explicit `dotenv.config({ path: ".env.local" })` in `prisma.config.ts`.

## 04/04/2026 — PrismaNeon adapter constructor

**What happened:** Seed script used `neon()` function + `new PrismaNeon(sql)` pattern from older docs. The working pattern (matching `src/lib/db.ts`) is `new PrismaNeon({ connectionString })`.

**Fix:** Always match the adapter pattern in `src/lib/db.ts`.

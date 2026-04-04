# RxDesk Plan 1: Core Platform Implementation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the foundational platform -- auth, permissions, locations, app shell with Apple design, team management, and billing.

**Architecture:** Next.js 16 App Router with Prisma 7 on Neon PostgreSQL. Auth.js v5 JWT sessions with OWNER/PHARMACIST/TECHNICIAN roles. Per-module permission system. Apple-inspired glass sidebar navigation. Multi-tenant with organizationId scoping.

**Tech Stack:** Next.js 16, React 19, TypeScript strict, Tailwind v4, shadcn/ui, Prisma 7, Auth.js v5, Stripe, Resend, Vitest

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `components.json`
- Create: `prisma.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `vitest.config.ts`

### Steps

- [ ] 1.1 Create the project directory and initialize package.json

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
mkdir -p src/app src/lib src/components/ui src/generated prisma tests
```

```json
// package.json
{
  "name": "rxdesk",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "npx tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.11.1",
    "@neondatabase/serverless": "^1.0.2",
    "@prisma/adapter-neon": "^7.6.0",
    "@prisma/client": "^7.5.0",
    "@stripe/stripe-js": "^8.11.0",
    "bcryptjs": "^3.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "dotenv": "^17.3.1",
    "lucide-react": "^1.0.1",
    "next": "16.2.1",
    "next-auth": "^5.0.0-beta.30",
    "next-themes": "^0.4.6",
    "prisma": "^7.5.0",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "resend": "^6.9.4",
    "shadcn": "^4.1.0",
    "sonner": "^2.0.7",
    "stripe": "^20.4.1",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "tsx": "^4.21.0",
    "typescript": "^5",
    "vitest": "^4.1.1"
  }
}
```

- [ ] 1.2 Create TypeScript config

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] 1.3 Create Next.js config

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

- [ ] 1.4 Create PostCSS config

```javascript
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] 1.5 Create ESLint config

```javascript
// eslint.config.mjs
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

- [ ] 1.6 Create shadcn/ui config

```json
// components.json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

- [ ] 1.7 Create Prisma config

```typescript
// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

- [ ] 1.8 Create .env.example

```bash
# .env.example
DATABASE_URL="postgresql://user:password@host:5432/rxdesk?sslmode=require"
AUTH_SECRET="generate-with-openssl-rand-base64-32"

# Optional: Google OAuth
# AUTH_GOOGLE_ID=""
# AUTH_GOOGLE_SECRET=""

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_PUBLISHABLE_KEY=""
STRIPE_WEBHOOK_SECRET=""
STRIPE_STARTER_PRICE_ID=""
STRIPE_GROWTH_PRICE_ID=""
STRIPE_PRO_PRICE_ID=""

# Resend
RESEND_API_KEY=""
RESEND_FROM_EMAIL="RxDesk <noreply@rxdesk.app>"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- [ ] 1.9 Create .gitignore

```
# .gitignore
node_modules/
.next/
.env
.env.local
*.tsbuildinfo
next-env.d.ts
src/generated/
coverage/
dist/
build/
.vercel/
```

- [ ] 1.10 Create Vitest config

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] 1.11 Install dependencies

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npm install
```

- [ ] 1.12 Install shadcn/ui components

```bash
npx shadcn@latest add button card input label dialog dropdown-menu select separator skeleton tabs textarea badge checkbox switch table avatar popover radio-group sonner accordion
```

- [ ] 1.13 Verify build compiles (after creating minimal src/app files in later tasks)

- [ ] 1.14 Commit: `git init && git add -A && git commit -m "chore: scaffold RxDesk project with Next.js 16, Prisma 7, Auth.js v5"`

---

## Task 2: Prisma schema

**Files:**
- Create: `prisma/schema.prisma`

### Steps

- [ ] 2.1 Create the full Prisma schema with all core platform models

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ─── Auth.js Models ──────────────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── Enums ──────────────────────────────────────────────────────

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

enum Plan {
  STARTER
  GROWTH
  PRO
}

enum InviteStatus {
  PENDING
  ACCEPTED
  CANCELLED
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

// ─── Core Models ─────────────────────────────────────────────────

model Organization {
  id                   String   @id @default(cuid())
  name                 String
  timezone             String   @default("America/New_York")
  plan                 Plan     @default(STARTER)
  trialEndsAt          DateTime?
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  subscriptionEndsAt   DateTime?
  brandColor           String?
  logoUrl              String?
  brandName            String?
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt

  users       User[]
  locations   Location[]
  permissions Permission[]
  invites     Invite[]
  auditLogs   AuditLog[]
}

model User {
  id             String    @id @default(cuid())
  name           String?
  email          String    @unique
  phone          String?
  emailVerified  DateTime?
  image          String?
  hashedPassword String?
  role           Role      @default(TECHNICIAN)
  active         Boolean   @default(true)
  organizationId String?
  locationId     String?
  lastActiveAt   DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  organization Organization? @relation(fields: [organizationId], references: [id])
  location     Location?     @relation(fields: [locationId], references: [id])
  accounts     Account[]
  sessions     Session[]
  permissions  Permission[]
  auditLogs    AuditLog[]
  invitesSent  Invite[]      @relation("InvitedBy")

  @@index([organizationId])
  @@index([locationId])
}

model Location {
  id             String   @id @default(cuid())
  organizationId String
  name           String
  address        String?
  city           String?
  state          String?
  zip            String?
  phone          String?
  npiNumber      String?
  licenseNumber  String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])
  users        User[]

  @@unique([organizationId, name])
  @@index([organizationId])
}

model Permission {
  id             String   @id @default(cuid())
  userId         String
  organizationId String
  module         Module
  access         Access
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id])

  @@unique([userId, module])
  @@index([userId])
  @@index([organizationId])
}

model Invite {
  id             String       @id @default(cuid())
  email          String
  role           Role         @default(TECHNICIAN)
  organizationId String
  invitedById    String
  locationId     String?
  token          String       @unique
  status         InviteStatus @default(PENDING)
  expiresAt      DateTime
  createdAt      DateTime     @default(now())

  organization Organization @relation(fields: [organizationId], references: [id])
  invitedBy    User         @relation("InvitedBy", fields: [invitedById], references: [id])

  @@index([organizationId])
  @@index([token])
}

model AuditLog {
  id             String   @id @default(cuid())
  organizationId String
  userId         String?
  action         String
  entityType     String
  entityId       String
  metadata       Json?
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id])
  user         User?        @relation(fields: [userId], references: [id])

  @@index([organizationId, createdAt])
  @@index([organizationId, entityType, entityId])
}
```

- [ ] 2.2 Generate the Prisma client

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npx prisma generate
```

- [ ] 2.3 Push the schema to the database (for dev)

```bash
npx prisma db push
```

- [ ] 2.4 Commit: `git add -A && git commit -m "feat: add Prisma schema with Organization, User, Location, Permission, Invite, AuditLog"`

---

## Task 3: Database utilities

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/utils.ts`
- Create: `src/lib/env.ts`

### Steps

- [ ] 3.1 Create the Prisma client singleton

```typescript
// src/lib/db.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
```

- [ ] 3.2 Create the cn utility

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] 3.3 Create the environment validation

```typescript
// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_STARTER_PRICE_ID: z.string().optional(),
  STRIPE_GROWTH_PRICE_ID: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

- [ ] 3.4 Commit: `git add -A && git commit -m "feat: add database client singleton, cn utility, and env validation"`

---

## Task 4: Auth system

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-helpers.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/app/api/auth/setup-org/route.ts`

### Steps

- [ ] 4.1 Create the Auth.js configuration

```typescript
// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { Role } from "@/generated/prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      organizationId: string;
      locationId: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: Role;
    organizationId?: string | null;
    locationId?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    organizationId: string;
    locationId: string | null;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/signup",
  },
  trustHost: true,
  providers: [
    ...(process.env.AUTH_GOOGLE_ID
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await db.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            hashedPassword: true,
            active: true,
            role: true,
            organizationId: true,
            locationId: true,
          },
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) {
          return null;
        }

        if (!user.active) {
          return null;
        }

        // Update last active -- fire and forget
        db.user
          .update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
          })
          .catch(() => {});

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          locationId: user.locationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role ?? "TECHNICIAN";
        token.organizationId = user.organizationId ?? "";
        token.locationId = user.locationId ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.organizationId = token.organizationId as string;
      session.user.locationId = (token.locationId as string | null) ?? null;
      return session;
    },
  },
});
```

- [ ] 4.2 Create auth helper functions

```typescript
// src/lib/auth-helpers.ts
import { auth } from "./auth";
import { redirect } from "next/navigation";
import { db } from "./db";
import type { Module, Access } from "@/generated/prisma/client";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requireOrgAccess() {
  const session = await requireAuth();
  if (!session.user.organizationId) {
    redirect("/signup");
  }
  return session;
}

export async function requireRole(roles: string[]) {
  const session = await requireOrgAccess();
  if (!roles.includes(session.user.role)) {
    redirect("/app/dashboard");
  }
  return session;
}

/**
 * Check if a user has the required access level for a module.
 * OWNER always has FULL access.
 * Returns the user's access level for the module.
 */
export async function getUserModuleAccess(
  userId: string,
  module: Module
): Promise<Access> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (!user) return "NONE";
  if (user.role === "OWNER") return "FULL";

  const permission = await db.permission.findUnique({
    where: { userId_module: { userId, module } },
  });

  return permission?.access ?? "NONE";
}

/**
 * Check if a user meets the minimum access level for a module.
 */
export function meetsAccessLevel(
  userAccess: Access,
  requiredAccess: Access
): boolean {
  const levels: Record<Access, number> = {
    NONE: 0,
    VIEW: 1,
    EDIT: 2,
    FULL: 3,
  };
  return levels[userAccess] >= levels[requiredAccess];
}

/**
 * Require a minimum access level for a module. Redirects if not met.
 */
export async function requireModuleAccess(
  module: Module,
  minimumAccess: Access
) {
  const session = await requireOrgAccess();
  const access = await getUserModuleAccess(session.user.id, module);

  if (!meetsAccessLevel(access, minimumAccess)) {
    redirect("/app/dashboard");
  }

  return { session, access };
}

/**
 * API-safe version: returns null instead of redirecting.
 */
export async function checkApiAuth() {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId) {
    return null;
  }
  return session;
}

/**
 * API-safe module access check. Returns access level or null if unauthorized.
 */
export async function checkApiModuleAccess(
  userId: string,
  module: Module,
  minimumAccess: Access
): Promise<{ allowed: boolean; access: Access }> {
  const access = await getUserModuleAccess(userId, module);
  return {
    allowed: meetsAccessLevel(access, minimumAccess),
    access,
  };
}
```

- [ ] 4.3 Create the NextAuth route handler

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] 4.4 Create the registration API route

```typescript
// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success } = rateLimit(`register:${ip}`, 10, 60 * 1000);
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await db.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: "OWNER",
      },
    });

    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
```

- [ ] 4.5 Create the org setup API route

```typescript
// src/app/api/auth/setup-org/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDefaultPermissions } from "@/lib/permissions";

const setupOrgSchema = z.object({
  pharmacyName: z.string().min(1, "Pharmacy name is required"),
  timezone: z.string(),
  locationName: z.string().min(1, "Location name is required"),
  locationAddress: z.string().optional(),
  locationCity: z.string().optional(),
  locationState: z.string().optional(),
  locationZip: z.string().optional(),
  locationPhone: z.string().optional(),
  locationNpi: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = setupOrgSchema.parse(body);

    // Create organization with 14-day trial
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const org = await db.organization.create({
      data: {
        name: data.pharmacyName,
        timezone: data.timezone,
        trialEndsAt,
      },
    });

    // Create first location
    const location = await db.location.create({
      data: {
        organizationId: org.id,
        name: data.locationName,
        address: data.locationAddress,
        city: data.locationCity,
        state: data.locationState,
        zip: data.locationZip,
        phone: data.locationPhone,
        npiNumber: data.locationNpi,
      },
    });

    // Link user to organization as OWNER with primary location
    await db.user.update({
      where: { id: session.user.id },
      data: {
        organizationId: org.id,
        locationId: location.id,
        role: "OWNER",
      },
    });

    // Create default OWNER permissions (FULL on everything)
    const defaultPerms = getDefaultPermissions("OWNER");
    await db.permission.createMany({
      data: defaultPerms.map((p) => ({
        userId: session.user.id,
        organizationId: org.id,
        module: p.module,
        access: p.access,
      })),
    });

    return NextResponse.json({
      success: true,
      organizationId: org.id,
      locationId: location.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/auth/setup-org error:", error);
    return NextResponse.json(
      { error: "Failed to set up organization" },
      { status: 500 }
    );
  }
}
```

- [ ] 4.6 Create rate limiter

```typescript
// src/lib/rate-limit.ts
/**
 * Simple in-memory rate limiter.
 * For production at scale, use Redis-based rate limiting (e.g. @upstash/ratelimit).
 */

const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = requests.get(key);

  if (!record || now > record.resetAt) {
    requests.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: limit - record.count };
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

// Clean up expired entries periodically (every 5 min)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of requests) {
      if (now > record.resetAt) {
        requests.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}
```

- [ ] 4.7 Commit: `git add -A && git commit -m "feat: add Auth.js v5 config with JWT sessions, register and org setup routes, rate limiter"`

---

## Task 5: Permission helpers

**Files:**
- Create: `src/lib/permissions.ts`

### Steps

- [ ] 5.1 Create the permissions utility module

```typescript
// src/lib/permissions.ts
import type { Role, Module, Access } from "@/generated/prisma/client";

/**
 * All modules in the system.
 */
export const ALL_MODULES: Module[] = [
  "PROVIDERS",
  "PRESCRIPTIONS",
  "DRUG_REPS",
  "TIME_TRACKING",
  "TEAM",
  "REPORTS",
  "SETTINGS",
];

/**
 * Human-readable labels for modules.
 */
export const MODULE_LABELS: Record<Module, string> = {
  PROVIDERS: "Providers",
  PRESCRIPTIONS: "Prescriptions",
  DRUG_REPS: "Drug reps",
  TIME_TRACKING: "Time tracking",
  TEAM: "Team",
  REPORTS: "Reports",
  SETTINGS: "Settings",
};

/**
 * Human-readable labels for access levels.
 */
export const ACCESS_LABELS: Record<Access, string> = {
  NONE: "No access",
  VIEW: "View only",
  EDIT: "Can edit",
  FULL: "Full access",
};

/**
 * Default permission sets per role.
 */
const DEFAULT_PERMISSIONS: Record<Role, Record<Module, Access>> = {
  OWNER: {
    PROVIDERS: "FULL",
    PRESCRIPTIONS: "FULL",
    DRUG_REPS: "FULL",
    TIME_TRACKING: "FULL",
    TEAM: "FULL",
    REPORTS: "FULL",
    SETTINGS: "FULL",
  },
  PHARMACIST: {
    PROVIDERS: "FULL",
    PRESCRIPTIONS: "FULL",
    DRUG_REPS: "FULL",
    TIME_TRACKING: "FULL",
    TEAM: "NONE",
    REPORTS: "VIEW",
    SETTINGS: "NONE",
  },
  TECHNICIAN: {
    PROVIDERS: "VIEW",
    PRESCRIPTIONS: "NONE",
    DRUG_REPS: "NONE",
    TIME_TRACKING: "EDIT",
    TEAM: "NONE",
    REPORTS: "NONE",
    SETTINGS: "NONE",
  },
};

/**
 * Get the default permissions for a role as an array of {module, access} pairs.
 */
export function getDefaultPermissions(
  role: Role
): Array<{ module: Module; access: Access }> {
  const perms = DEFAULT_PERMISSIONS[role];
  return ALL_MODULES.map((module) => ({
    module,
    access: perms[module],
  }));
}

/**
 * Get default access level for a specific role and module.
 */
export function getDefaultAccess(role: Role, module: Module): Access {
  return DEFAULT_PERMISSIONS[role][module];
}

/**
 * Check if a role's permissions are editable.
 * OWNER permissions cannot be modified.
 */
export function isRoleEditable(role: Role): boolean {
  return role !== "OWNER";
}

/**
 * Numeric access levels for comparison.
 */
export const ACCESS_LEVEL: Record<Access, number> = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  FULL: 3,
};

/**
 * All access level options for use in dropdowns.
 */
export const ACCESS_OPTIONS: Array<{ value: Access; label: string }> = [
  { value: "NONE", label: "No access" },
  { value: "VIEW", label: "View only" },
  { value: "EDIT", label: "Can edit" },
  { value: "FULL", label: "Full access" },
];
```

- [ ] 5.2 Commit: `git add -A && git commit -m "feat: add permission helpers with default role permissions and access level utilities"`

---

## Task 6: Apple design system globals

**Files:**
- Create: `src/app/globals.css`

### Steps

- [ ] 6.1 Create the global CSS with Apple design system tokens

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

:root {
  /* Apple design system colors */
  --rx-blue: #0071e3;
  --rx-blue-hover: #0077ED;
  --rx-background: #f5f5f7;
  --rx-foreground: #1d1d1f;
  --rx-secondary: rgba(0, 0, 0, 0.8);
  --rx-muted-text: rgba(0, 0, 0, 0.48);
  --rx-link-light: #0066cc;
  --rx-link-dark: #2997ff;
  --rx-destructive: #EF4444;

  /* Trend colors (analytics only) */
  --rx-trend-up: #22C55E;
  --rx-trend-down: #EF4444;
  --rx-trend-stable: #9CA3AF;

  /* shadcn/ui theme tokens -- Apple design */
  --background: #f5f5f7;
  --foreground: #1d1d1f;
  --card: #ffffff;
  --card-foreground: #1d1d1f;
  --popover: #ffffff;
  --popover-foreground: #1d1d1f;
  --primary: #0071e3;
  --primary-foreground: #ffffff;
  --secondary: #f5f5f7;
  --secondary-foreground: #1d1d1f;
  --muted: #f5f5f7;
  --muted-foreground: rgba(0, 0, 0, 0.48);
  --accent: #e8f0fe;
  --accent-foreground: #0071e3;
  --destructive: #EF4444;
  --destructive-foreground: #ffffff;
  --border: rgba(0, 0, 0, 0.08);
  --input: rgba(0, 0, 0, 0.08);
  --ring: #0071e3;

  /* Radius -- Apple 8px */
  --radius: 0.5rem;

  /* Sidebar -- dark glass */
  --sidebar: rgba(0, 0, 0, 0.8);
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #0071e3;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(255, 255, 255, 0.1);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255, 255, 255, 0.1);
  --sidebar-ring: #0071e3;

  /* Charts */
  --chart-1: #0071e3;
  --chart-2: #22C55E;
  --chart-3: #F59E0B;
  --chart-4: #EF4444;
  --chart-5: rgba(0, 0, 0, 0.48);
}

@theme inline {
  --font-sans: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-heading: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --radius-2xl: calc(var(--radius) + 8px);

  /* RxDesk semantic color tokens */
  --color-rx-blue: var(--rx-blue);
  --color-rx-background: var(--rx-background);
  --color-rx-foreground: var(--rx-foreground);
  --color-rx-destructive: var(--rx-destructive);
  --color-rx-trend-up: var(--rx-trend-up);
  --color-rx-trend-down: var(--rx-trend-down);
  --color-rx-trend-stable: var(--rx-trend-stable);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "tnum" 1;
  }
  html {
    font-family: "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 17px;
    line-height: 1.47;
    letter-spacing: -0.374px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Apple typography scale */
  h1 {
    font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 40px;
    font-weight: 600;
    line-height: 1.10;
    letter-spacing: normal;
    color: #1d1d1f;
  }
  h2 {
    font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 28px;
    font-weight: 400;
    line-height: 1.14;
    letter-spacing: 0.196px;
    color: #1d1d1f;
  }
  h3 {
    font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 21px;
    font-weight: 700;
    line-height: 1.19;
    letter-spacing: 0.231px;
    color: #1d1d1f;
  }
  h4 {
    font-size: 17px;
    font-weight: 600;
    line-height: 1.24;
    letter-spacing: -0.374px;
    color: #1d1d1f;
  }

  /* Caption */
  .text-caption {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.29;
    letter-spacing: -0.224px;
  }

  /* Micro */
  .text-micro {
    font-size: 12px;
    font-weight: 400;
    line-height: 1.33;
    letter-spacing: -0.12px;
  }
}

/* Glass sidebar effect */
.glass-sidebar {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
}

/* Elevated card shadow (Apple style) */
.card-elevated {
  box-shadow: rgba(0, 0, 0, 0.22) 3px 5px 30px 0px;
}
```

- [ ] 6.2 Commit: `git add -A && git commit -m "feat: add Apple design system CSS tokens, typography scale, and glass sidebar styles"`

---

## Task 7: shadcn/ui component installation

**Files:**
- Create: Multiple files in `src/components/ui/`

### Steps

- [ ] 7.1 Install all required shadcn/ui components

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npx shadcn@latest add button card input label dialog dropdown-menu select separator skeleton tabs textarea badge checkbox switch table avatar popover radio-group sonner accordion
```

This installs: `button.tsx`, `card.tsx`, `input.tsx`, `label.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `separator.tsx`, `skeleton.tsx`, `tabs.tsx`, `textarea.tsx`, `badge.tsx`, `checkbox.tsx`, `switch.tsx`, `table.tsx`, `avatar.tsx`, `popover.tsx`, `radio-group.tsx`, `sonner.tsx`, `accordion.tsx` into `src/components/ui/`.

- [ ] 7.2 Verify components are installed

```bash
ls src/components/ui/
```

Expected: All component files listed above exist.

- [ ] 7.3 Commit: `git add -A && git commit -m "feat: install shadcn/ui components (button, card, input, dialog, table, etc.)"`

---

## Task 8: App shell component

**Files:**
- Create: `src/components/app-shell.tsx`

### Steps

- [ ] 8.1 Create the Apple-design glass sidebar app shell

```tsx
// src/components/app-shell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  FileText,
  Briefcase,
  Clock,
  BarChart3,
  Settings,
  MapPin,
  User,
  Menu,
  X,
  Bell,
  Pill,
} from "lucide-react";
import type { Role, Module, Access } from "@/generated/prisma/client";
import { meetsAccessLevel } from "@/lib/auth-helpers";

type PlanType = "STARTER" | "GROWTH" | "PRO";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: Role;
  };
  plan: PlanType;
  permissions: Record<Module, Access>;
  branding: {
    brandColor: string | null;
    logoUrl: string | null;
    brandName: string | null;
  };
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
  module?: Module;
  requiredAccess?: Access;
  roles?: Role[];
  matchPrefix?: string;
}

const navItems: NavItem[] = [
  {
    icon: Home,
    label: "Dashboard",
    path: "/app/dashboard",
  },
  {
    icon: Users,
    label: "Providers",
    path: "/app/providers",
    module: "PROVIDERS",
    requiredAccess: "VIEW",
    matchPrefix: "/app/providers",
  },
  {
    icon: FileText,
    label: "Prescriptions",
    path: "/app/prescriptions",
    module: "PRESCRIPTIONS",
    requiredAccess: "VIEW",
    matchPrefix: "/app/prescriptions",
  },
  {
    icon: Briefcase,
    label: "Drug reps",
    path: "/app/drug-reps",
    module: "DRUG_REPS",
    requiredAccess: "VIEW",
    matchPrefix: "/app/drug-reps",
  },
  {
    icon: Clock,
    label: "Time tracking",
    path: "/app/time-tracking",
    module: "TIME_TRACKING",
    requiredAccess: "VIEW",
    matchPrefix: "/app/time-tracking",
  },
  {
    icon: Users,
    label: "Team",
    path: "/app/team",
    module: "TEAM",
    requiredAccess: "VIEW",
  },
  {
    icon: MapPin,
    label: "Locations",
    path: "/app/locations",
    roles: ["OWNER"],
  },
  {
    icon: BarChart3,
    label: "Reports",
    path: "/app/reports",
    module: "REPORTS",
    requiredAccess: "VIEW",
  },
  {
    icon: Settings,
    label: "Settings",
    path: "/app/settings",
    module: "SETTINGS",
    requiredAccess: "VIEW",
    matchPrefix: "/app/settings",
  },
  {
    icon: User,
    label: "Profile",
    path: "/app/profile",
  },
];

// Mobile bottom tab items -- max 5
const mobileTabItems: NavItem[] = [
  {
    icon: Home,
    label: "Dashboard",
    path: "/app/dashboard",
  },
  {
    icon: Users,
    label: "Providers",
    path: "/app/providers",
    module: "PROVIDERS",
    requiredAccess: "VIEW",
  },
  {
    icon: FileText,
    label: "Rx",
    path: "/app/prescriptions",
    module: "PRESCRIPTIONS",
    requiredAccess: "VIEW",
  },
  {
    icon: Briefcase,
    label: "Reps",
    path: "/app/drug-reps",
    module: "DRUG_REPS",
    requiredAccess: "VIEW",
  },
  {
    icon: Menu,
    label: "More",
    path: "#more",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function PlanBadge({ plan }: { plan: PlanType }) {
  const colors: Record<PlanType, string> = {
    STARTER: "bg-white/10 text-white/60",
    GROWTH: "bg-[#0071e3]/20 text-[#2997ff]",
    PRO: "bg-[#22C55E]/20 text-[#22C55E]",
  };

  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${colors[plan]}`}
    >
      {plan}
    </span>
  );
}

export function AppShell({
  children,
  user,
  plan,
  permissions,
  branding,
}: AppShellProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const canSee = (item: NavItem): boolean => {
    // If no module restriction, always visible
    if (!item.module && !item.roles) return true;

    // Role-based check
    if (item.roles && !item.roles.includes(user.role)) return false;

    // Module-based check
    if (item.module && item.requiredAccess) {
      const userAccess = permissions[item.module] ?? "NONE";
      return meetsAccessLevel(userAccess, item.requiredAccess);
    }

    return true;
  };

  const filteredNav = navItems.filter(canSee);
  const filteredMobileTabs = mobileTabItems.filter(canSee);

  const isActive = (item: NavItem) => {
    if (item.matchPrefix) {
      return pathname.startsWith(item.matchPrefix);
    }
    return pathname === item.path;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      {/* Desktop sidebar -- glass effect */}
      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-60 md:flex-col z-30">
        <div className="flex flex-col flex-grow glass-sidebar overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center h-16 px-5 border-b border-white/10">
            <Link href="/app/dashboard" className="flex items-center gap-2.5">
              {branding.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={branding.logoUrl}
                  alt=""
                  className="h-7 w-7 rounded object-contain"
                />
              ) : (
                <div className="h-7 w-7 rounded-lg bg-[#0071e3] flex items-center justify-center">
                  <Pill className="h-4 w-4 text-white" />
                </div>
              )}
              <span className="font-semibold text-[17px] text-white tracking-tight">
                {branding.brandName || "RxDesk"}
              </span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {filteredNav.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item)
                    ? "bg-[#0071e3] text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="text-[14px] font-medium tracking-tight">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-[12px] text-white/50 capitalize">
                  {user.role.toLowerCase()}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <PlanBadge plan={plan} />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {(sidebarOpen || mobileMoreOpen) && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => {
              setSidebarOpen(false);
              setMobileMoreOpen(false);
            }}
          />
          <div className="fixed inset-y-0 left-0 w-72 glass-sidebar shadow-xl">
            <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                {branding.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={branding.logoUrl}
                    alt=""
                    className="h-7 w-7 rounded object-contain"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-[#0071e3] flex items-center justify-center">
                    <Pill className="h-4 w-4 text-white" />
                  </div>
                )}
                <span className="font-semibold text-[17px] text-white tracking-tight">
                  {branding.brandName || "RxDesk"}
                </span>
              </div>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  setMobileMoreOpen(false);
                }}
                className="p-2 text-white/70 hover:text-white"
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="px-3 py-4 space-y-0.5">
              {filteredNav.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => {
                    setSidebarOpen(false);
                    setMobileMoreOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive(item)
                      ? "bg-[#0071e3] text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  <span className="text-[14px] font-medium tracking-tight">
                    {item.label}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-[12px] text-white/50 capitalize">
                    {user.role.toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <PlanBadge plan={plan} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-60 flex flex-col flex-1 pb-16 md:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-4 md:px-6 bg-white/80 backdrop-blur-xl border-b border-black/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 text-[#1d1d1f]/60"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 ml-auto">
            <button
              className="p-2 text-[#1d1d1f]/40 hover:text-[#1d1d1f] relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-xl border-t border-black/5 flex items-center justify-around h-16 px-2">
        {filteredMobileTabs.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              if (item.path === "#more") {
                setMobileMoreOpen(true);
              } else {
                window.location.href = item.path;
              }
            }}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-1 min-w-[56px] ${
              item.path !== "#more" && isActive(item)
                ? "text-[#0071e3]"
                : "text-[#1d1d1f]/40"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] 8.2 Commit: `git add -A && git commit -m "feat: add Apple-design glass sidebar app shell with permission-aware navigation"`

---

## Task 9: Root layout and authenticated layout

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/(app)/app/layout.tsx`
- Create: `src/app/(app)/app/app-shell-wrapper.tsx`
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/not-found.tsx`

### Steps

- [ ] 9.1 Create root layout

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "RxDesk -- Know your prescribers. Grow your scripts.",
  description:
    "RxDesk helps independent pharmacies track prescriber relationships, manage drug rep visits, and grow prescription volume with affordable analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
```

- [ ] 9.2 Create app shell wrapper (client boundary)

```tsx
// src/app/(app)/app/app-shell-wrapper.tsx
"use client";

import { AppShell } from "@/components/app-shell";
import type { Role, Module, Access } from "@/generated/prisma/client";

interface AppShellWrapperProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: Role;
  };
  plan: "STARTER" | "GROWTH" | "PRO";
  permissions: Record<Module, Access>;
  branding: {
    brandColor: string | null;
    logoUrl: string | null;
    brandName: string | null;
  };
}

export function AppShellWrapper({
  children,
  user,
  plan,
  permissions,
  branding,
}: AppShellWrapperProps) {
  return (
    <AppShell
      user={user}
      plan={plan}
      permissions={permissions}
      branding={branding}
    >
      {children}
    </AppShell>
  );
}
```

- [ ] 9.3 Create authenticated app layout

```tsx
// src/app/(app)/app/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AppShellWrapper } from "./app-shell-wrapper";
import { getDefaultPermissions } from "@/lib/permissions";
import type { Module, Access, Plan } from "@/generated/prisma/client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.organizationId) {
    redirect("/signup");
  }

  let plan: "STARTER" | "GROWTH" | "PRO" = "STARTER";
  let branding: {
    brandColor: string | null;
    logoUrl: string | null;
    brandName: string | null;
  } = {
    brandColor: null,
    logoUrl: null,
    brandName: null,
  };
  let permissions: Record<Module, Access> = {
    PROVIDERS: "NONE",
    PRESCRIPTIONS: "NONE",
    DRUG_REPS: "NONE",
    TIME_TRACKING: "NONE",
    TEAM: "NONE",
    REPORTS: "NONE",
    SETTINGS: "NONE",
  };

  try {
    const [org, userPermissions] = await Promise.all([
      db.organization.findUnique({
        where: { id: session.user.organizationId },
        select: {
          plan: true,
          brandColor: true,
          logoUrl: true,
          brandName: true,
        },
      }),
      db.permission.findMany({
        where: {
          userId: session.user.id,
          organizationId: session.user.organizationId,
        },
      }),
    ]);

    plan = (org?.plan as "STARTER" | "GROWTH" | "PRO") ?? "STARTER";
    branding = {
      brandColor: org?.brandColor ?? null,
      logoUrl: org?.logoUrl ?? null,
      brandName: org?.brandName ?? null,
    };

    // Build permissions map from DB records
    if (session.user.role === "OWNER") {
      // OWNER always gets FULL on everything
      const ownerPerms = getDefaultPermissions("OWNER");
      for (const p of ownerPerms) {
        permissions[p.module] = p.access;
      }
    } else if (userPermissions.length > 0) {
      for (const p of userPermissions) {
        permissions[p.module] = p.access;
      }
    } else {
      // No permissions set yet -- use role defaults
      const defaults = getDefaultPermissions(session.user.role);
      for (const p of defaults) {
        permissions[p.module] = p.access;
      }
    }
  } catch {
    // DB not available yet -- use defaults
  }

  return (
    <AppShellWrapper
      user={{
        name: session.user.name ?? "User",
        role: session.user.role,
      }}
      plan={plan}
      permissions={permissions}
      branding={branding}
    >
      {children}
    </AppShellWrapper>
  );
}
```

- [ ] 9.4 Create auth layout (minimal wrapper for login/signup pages)

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

- [ ] 9.5 Create 404 page

```tsx
// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-[80px] font-semibold text-[#1d1d1f] leading-none">
          404
        </h1>
        <p className="mt-4 text-[17px] text-[#1d1d1f]/48">
          This page could not be found.
        </p>
        <Link
          href="/app/dashboard"
          className="mt-6 inline-block px-5 py-2.5 bg-[#0071e3] text-white text-[14px] font-medium rounded-lg hover:bg-[#0077ED] transition-colors"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
```

- [ ] 9.6 Create a minimal landing page

```tsx
// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <h1 className="text-[56px] font-semibold leading-[1.07] tracking-tight text-center max-w-3xl">
        Know your prescribers. Grow your scripts.
      </h1>
      <p className="mt-6 text-[21px] text-white/60 text-center max-w-xl leading-[1.38]">
        The affordable platform for independent pharmacies to track prescriber
        relationships, manage drug rep visits, and protect revenue.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/signup"
          className="px-8 py-3 bg-[#0071e3] text-white text-[17px] font-medium rounded-[980px] hover:bg-[#0077ED] transition-colors"
        >
          Start free trial
        </Link>
        <Link
          href="/login"
          className="px-8 py-3 text-[#2997ff] text-[17px] font-medium hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
```

- [ ] 9.7 Create dashboard placeholder

```tsx
// src/app/(app)/app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="mt-2 text-[#1d1d1f]/48">
        Welcome to RxDesk. Your pharmacy analytics will appear here.
      </p>
    </div>
  );
}
```

- [ ] 9.8 Commit: `git add -A && git commit -m "feat: add root layout, authenticated app layout with permission loading, landing page, and 404"`

---

## Task 10: Login page

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

### Steps

- [ ] 10.1 Create the login page with Apple design

```tsx
// src/app/(auth)/login/page.tsx
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Eye, EyeOff, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
          <p className="text-[#1d1d1f]/48">Loading...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/app/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-8" style={{ boxShadow: "rgba(0, 0, 0, 0.04) 0px 1px 4px" }}>
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#0071e3] flex items-center justify-center">
                <Pill className="h-5 w-5 text-white" />
              </div>
              <span className="font-semibold text-[24px] text-[#1d1d1f] tracking-tight">
                RxDesk
              </span>
            </div>
          </div>

          <h2 className="text-center mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px] ${
                  error ? "ring-2 ring-[#EF4444]" : ""
                }`}
                required
                autoComplete="email"
              />
            </div>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px] pr-10 ${
                  error ? "ring-2 ring-[#EF4444]" : ""
                }`}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1d1d1f]/30"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex justify-end">
              <a
                href="#"
                className="text-[14px] text-[#0066cc] hover:underline"
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <p className="text-[14px] text-[#EF4444]">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#0071e3] hover:bg-[#0077ED] text-white h-11 rounded-lg text-[17px] font-medium"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/5" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-[14px] text-[#1d1d1f]/30">
                  or
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-lg text-[17px] border-black/10"
              onClick={handleGoogleSignIn}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <p className="text-center text-[14px] text-[#1d1d1f]/48 mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-[#0066cc] hover:underline"
              >
                Start free trial
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] 10.2 Commit: `git add -A && git commit -m "feat: add login page with Apple design, email/password and Google OAuth"`

---

## Task 11: Signup and org setup flow

**Files:**
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/app/(auth)/invite/[token]/page.tsx`

### Steps

- [ ] 11.1 Create the multi-step signup page (account -> org -> location -> done)

```tsx
// src/app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    // Step 1: Account
    fullName: "",
    email: "",
    password: "",
    // Step 2: Organization + Location
    pharmacyName: "",
    timezone: "America/New_York",
    locationName: "Main pharmacy",
    locationAddress: "",
    locationCity: "",
    locationState: "",
    locationZip: "",
    locationPhone: "",
    locationNpi: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateAccount = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create account");
        return;
      }

      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupOrg = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pharmacyName: formData.pharmacyName,
          timezone: formData.timezone,
          locationName: formData.locationName,
          locationAddress: formData.locationAddress || undefined,
          locationCity: formData.locationCity || undefined,
          locationState: formData.locationState || undefined,
          locationZip: formData.locationZip || undefined,
          locationPhone: formData.locationPhone || undefined,
          locationNpi: formData.locationNpi || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to set up organization");
        return;
      }

      setStep(3);
      setTimeout(() => {
        router.push("/app/dashboard");
        router.refresh();
      }, 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength =
    formData.password.length === 0
      ? 0
      : formData.password.length >= 12
        ? 100
        : formData.password.length >= 8
          ? 66
          : 33;

  const strengthColor =
    passwordStrength >= 66
      ? "bg-[#22C55E]"
      : passwordStrength >= 33
        ? "bg-[#F59E0B]"
        : "bg-[#EF4444]";

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {step !== 3 && (
          <>
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0071e3] flex items-center justify-center">
                  <Pill className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-[24px] text-[#1d1d1f] tracking-tight">
                  RxDesk
                </span>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-center mb-8 gap-2">
              {[1, 2].map((num) => (
                <div
                  key={num}
                  className={`h-1.5 w-20 rounded-full transition-colors ${
                    num === step
                      ? "bg-[#0071e3]"
                      : num < step
                        ? "bg-[#22C55E]"
                        : "bg-black/10"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: "rgba(0, 0, 0, 0.04) 0px 1px 4px" }}
        >
          {/* Step 1 -- Create account */}
          {step === 1 && (
            <>
              <h2 className="mb-2">Create your account</h2>
              <p className="text-[14px] text-[#1d1d1f]/48 mb-6">
                Start your 14-day free trial. No credit card required.
              </p>
              <div className="space-y-4">
                <Input
                  placeholder="Full name"
                  value={formData.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                  autoComplete="name"
                />
                <Input
                  type="email"
                  placeholder="Work email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                  autoComplete="email"
                />
                <div>
                  <Input
                    type="password"
                    placeholder="Password (8+ characters)"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                    autoComplete="new-password"
                  />
                  {formData.password.length > 0 && (
                    <div className="mt-2 h-1 bg-black/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthColor} transition-all`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-[14px] text-[#EF4444]">{error}</p>
                )}

                <Button
                  onClick={handleCreateAccount}
                  className="w-full bg-[#0071e3] hover:bg-[#0077ED] text-white h-11 rounded-lg text-[17px] font-medium"
                  disabled={
                    loading ||
                    !formData.fullName ||
                    !formData.email ||
                    formData.password.length < 8
                  }
                >
                  {loading ? "Creating account..." : "Continue"}
                </Button>
                <p className="text-center text-[14px] text-[#1d1d1f]/48">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="text-[#0066cc] hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* Step 2 -- Organization + First Location */}
          {step === 2 && (
            <>
              <h2 className="mb-2">Set up your pharmacy</h2>
              <p className="text-[14px] text-[#1d1d1f]/48 mb-6">
                Tell us about your pharmacy so we can configure RxDesk for you.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                    Pharmacy name
                  </label>
                  <Input
                    placeholder="Community Pharmacy Group"
                    value={formData.pharmacyName}
                    onChange={(e) =>
                      updateField("pharmacyName", e.target.value)
                    }
                    className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                    Timezone
                  </label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => updateField("timezone", e.target.value)}
                    className="w-full h-11 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[17px] text-[#1d1d1f]"
                  >
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  </select>
                </div>

                <div className="border-t border-black/5 pt-4 mt-4">
                  <h3 className="mb-3">First location</h3>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                    Location name
                  </label>
                  <Input
                    placeholder="Main pharmacy"
                    value={formData.locationName}
                    onChange={(e) =>
                      updateField("locationName", e.target.value)
                    }
                    className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                    Street address
                  </label>
                  <Input
                    placeholder="123 Main Street"
                    value={formData.locationAddress}
                    onChange={(e) =>
                      updateField("locationAddress", e.target.value)
                    }
                    className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                  />
                </div>

                <div className="grid grid-cols-6 gap-3">
                  <div className="col-span-3">
                    <Input
                      placeholder="City"
                      value={formData.locationCity}
                      onChange={(e) =>
                        updateField("locationCity", e.target.value)
                      }
                      className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                    />
                  </div>
                  <div className="col-span-1">
                    <select
                      value={formData.locationState}
                      onChange={(e) =>
                        updateField("locationState", e.target.value)
                      }
                      className="w-full h-11 px-2 bg-[#f5f5f7] border-0 rounded-lg text-[14px] text-[#1d1d1f]"
                    >
                      <option value="">ST</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="ZIP"
                      value={formData.locationZip}
                      onChange={(e) =>
                        updateField("locationZip", e.target.value)
                      }
                      className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                      Phone
                    </label>
                    <Input
                      placeholder="(555) 123-4567"
                      value={formData.locationPhone}
                      onChange={(e) =>
                        updateField("locationPhone", e.target.value)
                      }
                      className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                      Pharmacy NPI
                    </label>
                    <Input
                      placeholder="1234567890"
                      value={formData.locationNpi}
                      onChange={(e) =>
                        updateField("locationNpi", e.target.value)
                      }
                      className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-[14px] text-[#EF4444]">{error}</p>
                )}

                <Button
                  onClick={handleSetupOrg}
                  className="w-full bg-[#0071e3] hover:bg-[#0077ED] text-white h-11 rounded-lg text-[17px] font-medium"
                  disabled={
                    loading ||
                    !formData.pharmacyName ||
                    !formData.locationName
                  }
                >
                  {loading ? "Setting up..." : "Launch RxDesk"}
                </Button>
              </div>
            </>
          )}

          {/* Step 3 -- Success */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-[#22C55E]/10 mb-4">
                <Check className="h-8 w-8 text-[#22C55E]" />
              </div>
              <h2 className="mb-2">RxDesk is ready</h2>
              <p className="text-[14px] text-[#1d1d1f]/48 mb-6">
                Your 14-day free trial has started. Redirecting to your
                dashboard...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] 11.2 Create the invite acceptance page

```tsx
// src/app/(auth)/invite/[token]/page.tsx
"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Pill, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [invite, setInvite] = useState<{
    email: string;
    role: string;
    organizationName: string;
    inviterName: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
  });

  useEffect(() => {
    fetch(`/api/invites/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Invalid or expired invitation");
          return;
        }
        const data = await res.json();
        setInvite(data);
      })
      .catch(() => {
        setError("Failed to verify invitation");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: formData.name,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to accept invitation");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <p className="text-[#1d1d1f]/48">Verifying invitation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div
          className="bg-white rounded-2xl p-8"
          style={{ boxShadow: "rgba(0, 0, 0, 0.04) 0px 1px 4px" }}
        >
          <div className="flex justify-center mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3] flex items-center justify-center">
              <Pill className="h-5 w-5 text-white" />
            </div>
          </div>

          {error && !invite && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#EF4444]/10 mb-4">
                <AlertCircle className="h-6 w-6 text-[#EF4444]" />
              </div>
              <h2 className="mb-2">Invalid invitation</h2>
              <p className="text-[14px] text-[#1d1d1f]/48">{error}</p>
            </div>
          )}

          {success && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-[#22C55E]/10 mb-4">
                <Check className="h-6 w-6 text-[#22C55E]" />
              </div>
              <h2 className="mb-2">Welcome aboard</h2>
              <p className="text-[14px] text-[#1d1d1f]/48">
                Redirecting to sign in...
              </p>
            </div>
          )}

          {invite && !success && (
            <>
              <h2 className="text-center mb-2">Join {invite.organizationName}</h2>
              <p className="text-[14px] text-[#1d1d1f]/48 text-center mb-6">
                {invite.inviterName} invited you as a{" "}
                <span className="font-medium text-[#1d1d1f]">
                  {invite.role.toLowerCase()}
                </span>
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                    Email
                  </label>
                  <Input
                    value={invite.email}
                    disabled
                    className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px] text-[#1d1d1f]/48"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                    Your name
                  </label>
                  <Input
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                    Create password
                  </label>
                  <Input
                    type="password"
                    placeholder="8+ characters"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="h-11 bg-[#f5f5f7] border-0 rounded-lg text-[17px]"
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <p className="text-[14px] text-[#EF4444]">{error}</p>
                )}

                <Button
                  onClick={handleAccept}
                  className="w-full bg-[#0071e3] hover:bg-[#0077ED] text-white h-11 rounded-lg text-[17px] font-medium"
                  disabled={
                    submitting ||
                    !formData.name ||
                    formData.password.length < 8
                  }
                >
                  {submitting ? "Joining..." : "Accept invitation"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] 11.3 Create invite verification and acceptance API routes

```typescript
// src/app/api/invites/verify/route.ts
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400 });
    }

    const invite = await db.invite.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    });

    if (!invite) {
      return Response.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    if (invite.status !== "PENDING") {
      return Response.json(
        { error: "This invitation has already been used" },
        { status: 410 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return Response.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    return Response.json({
      email: invite.email,
      role: invite.role,
      organizationName: invite.organization.name,
      inviterName: invite.invitedBy.name ?? "A team member",
    });
  } catch (error) {
    console.error("GET /api/invites/verify error:", error);
    return Response.json(
      { error: "Failed to verify invitation" },
      { status: 500 }
    );
  }
}
```

```typescript
// src/app/api/invites/accept/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { getDefaultPermissions } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

const acceptSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, name, password } = acceptSchema.parse(body);

    const invite = await db.invite.findUnique({
      where: { token },
    });

    if (!invite || invite.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: invite.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and set permissions in a transaction
    const user = await db.user.create({
      data: {
        name,
        email: invite.email,
        hashedPassword,
        role: invite.role,
        organizationId: invite.organizationId,
        locationId: invite.locationId,
        active: true,
      },
    });

    // Create default permissions for the role
    const defaultPerms = getDefaultPermissions(invite.role);
    await db.permission.createMany({
      data: defaultPerms.map((p) => ({
        userId: user.id,
        organizationId: invite.organizationId,
        module: p.module,
        access: p.access,
      })),
    });

    // Mark invite as accepted
    await db.invite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });

    await writeAuditLog({
      organizationId: invite.organizationId,
      userId: user.id,
      action: "user.invite_accepted",
      entityType: "User",
      entityId: user.id,
      metadata: { email: invite.email, role: invite.role },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("POST /api/invites/accept error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
```

- [ ] 11.4 Commit: `git add -A && git commit -m "feat: add signup flow (account + org + location), invite acceptance page and API routes"`

---

## Task 12: Location management API and UI

**Files:**
- Create: `src/app/api/locations/route.ts`
- Create: `src/app/api/locations/[id]/route.ts`
- Create: `src/app/(app)/app/locations/page.tsx`

### Steps

- [ ] 12.1 Create locations API routes

```typescript
// src/app/api/locations/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const createLocationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  npiNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
});

// GET /api/locations -- list all locations in the org
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await db.location.findMany({
      where: { organizationId: session.user.organizationId },
      include: {
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    return Response.json(locations);
  } catch (error) {
    console.error("GET /api/locations error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/locations -- create a new location
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createLocationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { organizationId } = session.user;

    // Check plan limits
    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });
    const locationCount = await db.location.count({
      where: { organizationId },
    });

    const planLimits: Record<string, number> = {
      STARTER: 1,
      GROWTH: 3,
      PRO: 999999,
    };

    const limit = planLimits[org?.plan ?? "STARTER"] ?? 1;
    if (locationCount >= limit) {
      return Response.json(
        {
          error: `Your ${org?.plan ?? "Starter"} plan supports up to ${limit} location${limit === 1 ? "" : "s"}. Upgrade to add more.`,
        },
        { status: 403 }
      );
    }

    const location = await db.location.create({
      data: {
        organizationId,
        ...parsed.data,
      },
    });

    await writeAuditLog({
      organizationId,
      userId: session.user.id,
      action: "location.created",
      entityType: "Location",
      entityId: location.id,
      metadata: { name: parsed.data.name },
    });

    return Response.json(location, { status: 201 });
  } catch (error) {
    console.error("POST /api/locations error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 12.2 Create location detail API route

```typescript
// src/app/api/locations/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";

const updateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  npiNumber: z.string().optional().nullable(),
  licenseNumber: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// GET /api/locations/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const location = await db.location.findFirst({
      where: {
        id,
        organizationId: session.user.organizationId,
      },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!location) {
      return Response.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return Response.json(location);
  } catch (error) {
    console.error("GET /api/locations/[id] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/locations/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { organizationId } = session.user;

    // Verify location belongs to org
    const existing = await db.location.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return Response.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const updated = await db.location.update({
      where: { id },
      data: parsed.data,
    });

    await writeAuditLog({
      organizationId,
      userId: session.user.id,
      action: "location.updated",
      entityType: "Location",
      entityId: id,
      metadata: parsed.data,
    });

    return Response.json(updated);
  } catch (error) {
    console.error("PUT /api/locations/[id] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/locations/[id] -- soft delete (deactivate)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { organizationId } = session.user;

    const existing = await db.location.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      return Response.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Don't allow deleting the last active location
    const activeCount = await db.location.count({
      where: { organizationId, isActive: true },
    });
    if (activeCount <= 1) {
      return Response.json(
        { error: "Cannot deactivate the last location" },
        { status: 400 }
      );
    }

    await db.location.update({
      where: { id },
      data: { isActive: false },
    });

    await writeAuditLog({
      organizationId,
      userId: session.user.id,
      action: "location.deactivated",
      entityType: "Location",
      entityId: id,
      metadata: { name: existing.name },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/locations/[id] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 12.3 Create locations management page

```tsx
// src/app/(app)/app/locations/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { MapPin, Plus, Pencil, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  npiNumber: string | null;
  licenseNumber: string | null;
  isActive: boolean;
  _count: { users: number };
}

const EMPTY_FORM = {
  name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  npiNumber: "",
  licenseNumber: "",
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch("/api/locations");
      if (res.ok) {
        const data = await res.json();
        setLocations(data);
      }
    } catch {
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openCreate = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setFormData({
      name: loc.name,
      address: loc.address ?? "",
      city: loc.city ?? "",
      state: loc.state ?? "",
      zip: loc.zip ?? "",
      phone: loc.phone ?? "",
      npiNumber: loc.npiNumber ?? "",
      licenseNumber: loc.licenseNumber ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const url = editingId
        ? `/api/locations/${editingId}`
        : "/api/locations";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address || undefined,
          city: formData.city || undefined,
          state: formData.state || undefined,
          zip: formData.zip || undefined,
          phone: formData.phone || undefined,
          npiNumber: formData.npiNumber || undefined,
          licenseNumber: formData.licenseNumber || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save location");
        return;
      }

      toast.success(editingId ? "Location updated" : "Location created");
      setDialogOpen(false);
      fetchLocations();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm("Deactivate this location? Team members assigned here will need to be reassigned.")) {
      return;
    }

    try {
      const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to deactivate location");
        return;
      }
      toast.success("Location deactivated");
      fetchLocations();
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Locations</h1>
          <p className="mt-1 text-[14px] text-[#1d1d1f]/48">
            Manage your pharmacy locations
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add location
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5 animate-pulse h-24"
            />
          ))}
        </div>
      ) : locations.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center">
          <MapPin className="h-12 w-12 text-[#1d1d1f]/20 mx-auto mb-4" />
          <h3>No locations yet</h3>
          <p className="text-[14px] text-[#1d1d1f]/48 mt-2 mb-6">
            Add your first pharmacy location to get started.
          </p>
          <Button
            onClick={openCreate}
            className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
          >
            Add location
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="bg-white rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-[#0071e3]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[17px]">{loc.name}</h3>
                    {!loc.isActive && (
                      <Badge variant="secondary" className="text-[11px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-[14px] text-[#1d1d1f]/48 mt-0.5">
                    {[loc.address, loc.city, loc.state, loc.zip]
                      .filter(Boolean)
                      .join(", ") || "No address on file"}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    {loc.phone && (
                      <span className="text-[12px] text-[#1d1d1f]/48">
                        {loc.phone}
                      </span>
                    )}
                    {loc.npiNumber && (
                      <span className="text-[12px] text-[#1d1d1f]/48">
                        NPI: {loc.npiNumber}
                      </span>
                    )}
                    <span className="text-[12px] text-[#1d1d1f]/48">
                      {loc._count.users} team member
                      {loc._count.users !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(loc)}
                  className="p-2 text-[#1d1d1f]/30 hover:text-[#1d1d1f] rounded-lg hover:bg-[#f5f5f7] transition-colors"
                  aria-label="Edit location"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {loc.isActive && (
                  <button
                    onClick={() => handleDeactivate(loc.id)}
                    className="p-2 text-[#1d1d1f]/30 hover:text-[#EF4444] rounded-lg hover:bg-[#f5f5f7] transition-colors"
                    aria-label="Deactivate location"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit location" : "Add location"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Location name
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Downtown pharmacy"
                className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Address
              </label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="123 Main Street"
                className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-6 gap-3">
              <div className="col-span-3">
                <Input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  placeholder="City"
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
                />
              </div>
              <div className="col-span-1">
                <Input
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      state: e.target.value,
                    }))
                  }
                  placeholder="ST"
                  maxLength={2}
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <Input
                  value={formData.zip}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      zip: e.target.value,
                    }))
                  }
                  placeholder="ZIP"
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                  Phone
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="(555) 123-4567"
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                  Pharmacy NPI
                </label>
                <Input
                  value={formData.npiNumber}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      npiNumber: e.target.value,
                    }))
                  }
                  placeholder="1234567890"
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                License number
              </label>
              <Input
                value={formData.licenseNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    licenseNumber: e.target.value,
                  }))
                }
                placeholder="PH-12345"
                className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !formData.name}
                className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
              >
                {submitting
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Add location"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] 12.4 Commit: `git add -A && git commit -m "feat: add location management CRUD API and UI with plan limits"`

---

## Task 13: Team management API and UI

**Files:**
- Create: `src/app/api/team/route.ts`
- Create: `src/app/api/team/[id]/route.ts`
- Create: `src/app/api/team/[id]/permissions/route.ts`
- Create: `src/app/api/invites/route.ts`
- Create: `src/app/(app)/app/team/page.tsx`

### Steps

- [ ] 13.1 Create team list API route

```typescript
// src/app/api/team/route.ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkApiModuleAccess } from "@/lib/auth-helpers";

// GET /api/team -- list all users in the org
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = session.user;

    const { allowed } = await checkApiModuleAccess(
      session.user.id,
      "TEAM",
      "VIEW"
    );
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await db.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastActiveAt: true,
        location: { select: { id: true, name: true } },
        permissions: {
          select: { module: true, access: true },
        },
      },
      orderBy: { name: "asc" },
    });

    // Also get pending invites
    const invites = await db.invite.findMany({
      where: { organizationId, status: "PENDING" },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return Response.json({ users, invites });
  } catch (error) {
    console.error("GET /api/team error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 13.2 Create team member detail API route (update role, deactivate/reactivate)

```typescript
// src/app/api/team/[id]/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { checkApiModuleAccess } from "@/lib/auth-helpers";

const updateUserSchema = z.object({
  role: z.enum(["OWNER", "PHARMACIST", "TECHNICIAN"]).optional(),
  active: z.boolean().optional(),
  locationId: z.string().optional().nullable(),
});

// PUT /api/team/[id] -- update user role, active status, or location
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = session.user;

    const { allowed } = await checkApiModuleAccess(
      session.user.id,
      "TEAM",
      "FULL"
    );
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Verify the user belongs to this org
    const targetUser = await db.user.findFirst({
      where: { id, organizationId },
    });
    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Cannot modify yourself if deactivating
    if (parsed.data.active === false && id === session.user.id) {
      return Response.json(
        { error: "Cannot deactivate yourself" },
        { status: 400 }
      );
    }

    // Cannot change OWNER role
    if (targetUser.role === "OWNER" && parsed.data.role && parsed.data.role !== "OWNER") {
      return Response.json(
        { error: "Cannot change the role of an owner" },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        locationId: true,
      },
    });

    // Determine audit action
    let action = "user.updated";
    if (parsed.data.active === false) action = "user.deactivated";
    if (parsed.data.active === true) action = "user.reactivated";
    if (parsed.data.role) action = "user.role_changed";

    await writeAuditLog({
      organizationId,
      userId: session.user.id,
      action,
      entityType: "User",
      entityId: id,
      metadata: parsed.data,
    });

    return Response.json(updated);
  } catch (error) {
    console.error("PUT /api/team/[id] error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 13.3 Create per-user permission management API

```typescript
// src/app/api/team/[id]/permissions/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { checkApiModuleAccess } from "@/lib/auth-helpers";

const permissionSchema = z.object({
  permissions: z.array(
    z.object({
      module: z.enum([
        "PROVIDERS",
        "PRESCRIPTIONS",
        "DRUG_REPS",
        "TIME_TRACKING",
        "TEAM",
        "REPORTS",
        "SETTINGS",
      ]),
      access: z.enum(["NONE", "VIEW", "EDIT", "FULL"]),
    })
  ),
});

// GET /api/team/[id]/permissions
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = session.user;

    const permissions = await db.permission.findMany({
      where: { userId: id, organizationId },
      select: { module: true, access: true },
    });

    return Response.json(permissions);
  } catch (error) {
    console.error("GET /api/team/[id]/permissions error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/team/[id]/permissions -- bulk update permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = session.user;

    const { allowed } = await checkApiModuleAccess(
      session.user.id,
      "TEAM",
      "FULL"
    );
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify user belongs to org
    const targetUser = await db.user.findFirst({
      where: { id, organizationId },
    });
    if (!targetUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Cannot modify OWNER permissions
    if (targetUser.role === "OWNER") {
      return Response.json(
        { error: "Owner permissions cannot be modified" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = permissionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Delete existing and recreate (simple upsert strategy)
    await db.permission.deleteMany({
      where: { userId: id, organizationId },
    });

    await db.permission.createMany({
      data: parsed.data.permissions.map((p) => ({
        userId: id,
        organizationId,
        module: p.module,
        access: p.access,
      })),
    });

    await writeAuditLog({
      organizationId,
      userId: session.user.id,
      action: "user.permissions_updated",
      entityType: "User",
      entityId: id,
      metadata: { permissions: parsed.data.permissions },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("PUT /api/team/[id]/permissions error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 13.4 Create invite API route

```typescript
// src/app/api/invites/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { sendInviteEmail } from "@/lib/email";
import { checkApiModuleAccess } from "@/lib/auth-helpers";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["PHARMACIST", "TECHNICIAN"]),
  locationId: z.string().optional(),
});

// POST /api/invites -- send an invite
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, organizationId } = session.user;

    const { allowed } = await checkApiModuleAccess(userId, "TEAM", "FULL");
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { email, role, locationId } = parsed.data;

    // Check if user already exists in the org
    const existingUser = await db.user.findFirst({
      where: { email, organizationId },
    });
    if (existingUser) {
      return Response.json(
        { error: "A user with this email already belongs to this organization" },
        { status: 409 }
      );
    }

    // Check for existing pending invite
    const existingInvite = await db.invite.findFirst({
      where: { email, organizationId, status: "PENDING" },
    });
    if (existingInvite) {
      return Response.json(
        { error: "A pending invite already exists for this email" },
        { status: 409 }
      );
    }

    // Check plan team member limits
    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });
    const planLimits: Record<string, number> = {
      STARTER: 3,
      GROWTH: 15,
      PRO: 999999,
    };
    const limit = planLimits[org?.plan ?? "STARTER"] ?? 3;

    const [activeUserCount, pendingInviteCount] = await Promise.all([
      db.user.count({ where: { organizationId, active: true } }),
      db.invite.count({ where: { organizationId, status: "PENDING" } }),
    ]);

    if (activeUserCount + pendingInviteCount >= limit) {
      return Response.json(
        {
          error: `Your ${org?.plan ?? "Starter"} plan supports up to ${limit} team members. Upgrade to add more.`,
        },
        { status: 403 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await db.invite.create({
      data: {
        email,
        role,
        organizationId,
        invitedById: userId,
        locationId: locationId ?? null,
        token,
        expiresAt,
      },
    });

    await writeAuditLog({
      organizationId,
      userId,
      action: "user.invited",
      entityType: "Invite",
      entityId: invite.id,
      metadata: { email, role },
    });

    // Fire-and-forget email
    const inviter = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    void sendInviteEmail(
      email,
      org?.name ?? "your pharmacy",
      inviter?.name ?? "A team admin",
      token
    );

    return Response.json(invite, { status: 201 });
  } catch (error) {
    console.error("POST /api/invites error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 13.5 Create the team management page

```tsx
// src/app/(app)/app/team/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  MoreVertical,
  Shield,
  UserMinus,
  UserCheck,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  ALL_MODULES,
  MODULE_LABELS,
  ACCESS_OPTIONS,
  getDefaultPermissions,
} from "@/lib/permissions";
import type { Role, Module, Access } from "@/generated/prisma/client";

interface TeamUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  active: boolean;
  lastActiveAt: string | null;
  location: { id: string; name: string } | null;
  permissions: Array<{ module: Module; access: Access }>;
}

interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

export default function TeamPage() {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"PHARMACIST" | "TECHNICIAN">("PHARMACIST");
  const [inviteLocationId, setInviteLocationId] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Permission dialog
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [permUserName, setPermUserName] = useState("");
  const [permUserRole, setPermUserRole] = useState<Role>("TECHNICIAN");
  const [permData, setPermData] = useState<Record<Module, Access>>(
    {} as Record<Module, Access>
  );
  const [permSaving, setPermSaving] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const [teamRes, locRes] = await Promise.all([
        fetch("/api/team"),
        fetch("/api/locations"),
      ]);
      if (teamRes.ok) {
        const data = await teamRes.json();
        setUsers(data.users);
        setInvites(data.invites);
      }
      if (locRes.ok) {
        const locs = await locRes.json();
        setLocations(locs.map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })));
      }
    } catch {
      toast.error("Failed to load team");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async () => {
    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          locationId: inviteLocationId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to send invite");
        return;
      }

      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      fetchTeam();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "deactivate" : "reactivate";
    if (!confirm(`${currentlyActive ? "Deactivate" : "Reactivate"} this team member?`)) return;

    try {
      const res = await fetch(`/api/team/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentlyActive }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || `Failed to ${action}`);
        return;
      }

      toast.success(`User ${action}d`);
      fetchTeam();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const openPermissions = (user: TeamUser) => {
    setPermUserId(user.id);
    setPermUserName(user.name ?? user.email);
    setPermUserRole(user.role);

    // Build current permissions map
    const map = {} as Record<Module, Access>;
    const defaults = getDefaultPermissions(user.role);
    for (const d of defaults) {
      map[d.module] = d.access;
    }
    // Override with actual permissions
    for (const p of user.permissions) {
      map[p.module] = p.access;
    }
    setPermData(map);
    setPermDialogOpen(true);
  };

  const handleSavePermissions = async () => {
    if (!permUserId) return;
    setPermSaving(true);
    try {
      const permissions = ALL_MODULES.map((m) => ({
        module: m,
        access: permData[m] ?? "NONE",
      }));

      const res = await fetch(`/api/team/${permUserId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update permissions");
        return;
      }

      toast.success("Permissions updated");
      setPermDialogOpen(false);
      fetchTeam();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPermSaving(false);
    }
  };

  const roleBadgeColor: Record<Role, string> = {
    OWNER: "bg-[#0071e3]/10 text-[#0071e3]",
    PHARMACIST: "bg-[#22C55E]/10 text-[#15803D]",
    TECHNICIAN: "bg-[#F59E0B]/10 text-[#92400E]",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Team</h1>
          <p className="mt-1 text-[14px] text-[#1d1d1f]/48">
            Manage your pharmacy team and permissions
          </p>
        </div>
        <Button
          onClick={() => setInviteOpen(true)}
          className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite member
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-5 animate-pulse h-20"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Active team members */}
          <div className="bg-white rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-black/5">
              <h4>
                Team members ({users.filter((u) => u.active).length})
              </h4>
            </div>
            {users.filter((u) => u.active).length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-10 w-10 text-[#1d1d1f]/20 mx-auto mb-3" />
                <p className="text-[14px] text-[#1d1d1f]/48">
                  No active team members yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-black/5">
                {users
                  .filter((u) => u.active)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0">
                          {(user.name ?? user.email)
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-medium text-[#1d1d1f]">
                              {user.name ?? user.email}
                            </span>
                            <span
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${roleBadgeColor[user.role]}`}
                            >
                              {user.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[12px] text-[#1d1d1f]/48">
                              {user.email}
                            </span>
                            {user.location && (
                              <span className="text-[12px] text-[#1d1d1f]/30">
                                {user.location.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {user.role !== "OWNER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 text-[#1d1d1f]/30 hover:text-[#1d1d1f] rounded-lg hover:bg-[#f5f5f7]">
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openPermissions(user)}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Manage permissions
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleActive(user.id, true)
                              }
                              className="text-[#EF4444]"
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="bg-white rounded-xl overflow-hidden mt-4">
              <div className="px-5 py-3 border-b border-black/5">
                <h4>Pending invites ({invites.length})</h4>
              </div>
              <div className="divide-y divide-black/5">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-[#f5f5f7] flex items-center justify-center">
                        <Mail className="h-4 w-4 text-[#1d1d1f]/30" />
                      </div>
                      <div>
                        <span className="text-[14px] text-[#1d1d1f]">
                          {inv.email}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${roleBadgeColor[inv.role]}`}
                          >
                            {inv.role}
                          </span>
                          <span className="text-[12px] text-[#1d1d1f]/30">
                            Expires{" "}
                            {new Date(inv.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deactivated users */}
          {users.filter((u) => !u.active).length > 0 && (
            <div className="bg-white rounded-xl overflow-hidden mt-4">
              <div className="px-5 py-3 border-b border-black/5">
                <h4>
                  Deactivated ({users.filter((u) => !u.active).length})
                </h4>
              </div>
              <div className="divide-y divide-black/5">
                {users
                  .filter((u) => !u.active)
                  .map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between px-5 py-3 opacity-60"
                    >
                      <div>
                        <span className="text-[14px] text-[#1d1d1f]">
                          {user.name ?? user.email}
                        </span>
                        <span className="text-[12px] text-[#1d1d1f]/48 ml-2">
                          {user.email}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleActive(user.id, false)}
                        className="text-[14px] text-[#0066cc] hover:underline flex items-center gap-1"
                      >
                        <UserCheck className="h-4 w-4" />
                        Reactivate
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Email address
              </label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="pharmacist@example.com"
                className="h-11 bg-[#f5f5f7] border-0 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Role
              </label>
              <div className="flex gap-2">
                {(["PHARMACIST", "TECHNICIAN"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    className={`flex-1 px-4 py-2.5 text-[14px] font-medium rounded-lg border transition-colors ${
                      inviteRole === r
                        ? "bg-[#0071e3]/10 border-[#0071e3] text-[#0071e3]"
                        : "bg-white border-black/10 text-[#1d1d1f]/60"
                    }`}
                  >
                    {r.charAt(0) + r.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            {locations.length > 1 && (
              <div>
                <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                  Location (optional)
                </label>
                <select
                  value={inviteLocationId}
                  onChange={(e) => setInviteLocationId(e.target.value)}
                  className="w-full h-11 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px]"
                >
                  <option value="">No specific location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setInviteOpen(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteSubmitting || !inviteEmail}
                className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
              >
                {inviteSubmitting ? "Sending..." : "Send invite"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions dialog */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>Permissions for {permUserName}</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-[#1d1d1f]/48 mt-1">
            Role: {permUserRole}. Customize what this user can access.
          </p>
          <div className="mt-4 space-y-3">
            {ALL_MODULES.map((mod) => (
              <div
                key={mod}
                className="flex items-center justify-between py-2"
              >
                <span className="text-[14px] font-medium text-[#1d1d1f]">
                  {MODULE_LABELS[mod]}
                </span>
                <select
                  value={permData[mod] ?? "NONE"}
                  onChange={(e) =>
                    setPermData((prev) => ({
                      ...prev,
                      [mod]: e.target.value as Access,
                    }))
                  }
                  className="h-9 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] min-w-[140px]"
                >
                  {ACCESS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-black/5">
            <Button
              variant="outline"
              onClick={() => setPermDialogOpen(false)}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePermissions}
              disabled={permSaving}
              className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
            >
              {permSaving ? "Saving..." : "Save permissions"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] 13.6 Commit: `git add -A && git commit -m "feat: add team management with invites, role changes, and per-user permission configuration"`

---

## Task 14: Settings page with billing

**Files:**
- Create: `src/lib/stripe.ts`
- Create: `src/lib/email.ts`
- Create: `src/app/api/settings/route.ts`
- Create: `src/app/api/stripe/checkout/route.ts`
- Create: `src/app/api/stripe/portal/route.ts`
- Create: `src/app/api/stripe/webhook/route.ts`
- Create: `src/app/(app)/app/settings/page.tsx`

### Steps

- [ ] 14.1 Create Stripe utility

```typescript
// src/lib/stripe.ts
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}
```

- [ ] 14.2 Create email utility

```typescript
// src/lib/email.ts
import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
  }
  return _resend;
}

const FROM =
  process.env.RESEND_FROM_EMAIL || "RxDesk <noreply@rxdesk.app>";

// ─── Shared layout ──────────────────────────────────────────────

function emailLayout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f7;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="background-color:#0071e3;padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">RxDesk</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:18px;color:#1d1d1f;">${title}</h2>
          ${body}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 32px;border-top:1px solid rgba(0,0,0,0.08);">
          <p style="margin:0;font-size:12px;color:rgba(0,0,0,0.48);text-align:center;">
            RxDesk &mdash; Know your prescribers. Grow your scripts.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td style="background-color:#0071e3;border-radius:8px;padding:12px 24px;">
    <a href="${href}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${label}</a>
  </td></tr>
</table>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#1d1d1f;">${text}</p>`;
}

function detail(label: string, value: string): string {
  return `<p style="margin:0 0 8px;font-size:14px;color:#1d1d1f;"><strong>${label}:</strong> ${value}</p>`;
}

// ─── Send functions ─────────────────────────────────────────────

export async function sendInviteEmail(
  email: string,
  organizationName: string,
  inviterName: string,
  inviteToken: string
): Promise<void> {
  try {
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;

    await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `You've been invited to join ${organizationName} on RxDesk`,
      html: emailLayout(
        `Join ${organizationName} on RxDesk`,
        `${paragraph("Hi there,")}
         ${paragraph(`<strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on RxDesk.`)}
         ${ctaButton("Accept invitation", inviteUrl)}
         ${paragraph("This invitation will expire in 7 days. If you weren't expecting this email, you can safely ignore it.")}`
      ),
    });
  } catch (error) {
    console.error("Failed to send invite email:", error);
  }
}
```

- [ ] 14.3 Create settings API route

```typescript
// src/app/api/settings/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { checkApiModuleAccess } from "@/lib/auth-helpers";

const settingsUpdateSchema = z.object({
  name: z.string().min(1, "Organization name is required").optional(),
  timezone: z.string().optional(),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a hex color like #0071e3")
    .optional()
    .nullable(),
  logoUrl: z.string().url("Must be a valid URL").optional().nullable(),
  brandName: z.string().max(100).optional().nullable(),
});

// GET /api/settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = session.user;

    const { allowed } = await checkApiModuleAccess(
      session.user.id,
      "SETTINGS",
      "VIEW"
    );
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        timezone: true,
        plan: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionEndsAt: true,
        brandColor: true,
        logoUrl: true,
        brandName: true,
        createdAt: true,
      },
    });

    if (!org) {
      return Response.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return Response.json(org);
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = session.user;

    const { allowed } = await checkApiModuleAccess(
      session.user.id,
      "SETTINGS",
      "EDIT"
    );
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = settingsUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updated = await db.organization.update({
      where: { id: organizationId },
      data: parsed.data,
    });

    await writeAuditLog({
      organizationId,
      userId: session.user.id,
      action: "organization.settings_updated",
      entityType: "Organization",
      entityId: organizationId,
      metadata: parsed.data,
    });

    return Response.json(updated);
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 14.4 Create Stripe checkout route

```typescript
// src/app/api/stripe/checkout/route.ts
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

const checkoutSchema = z.object({
  priceId: z.string().min(1, "priceId is required"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return Response.json(
        { error: "Only owners can manage subscriptions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const { priceId } = parsed.data;
    const { organizationId } = session.user;

    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return Response.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    let stripeCustomerId = org.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        name: org.name,
        metadata: { organizationId },
      });
      stripeCustomerId = customer.id;

      await db.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/app/settings?billing=success`,
      cancel_url: `${appUrl}/app/settings?billing=canceled`,
      subscription_data: {
        trial_period_days: org.trialEndsAt && new Date(org.trialEndsAt) > new Date() ? undefined : 14,
      },
      metadata: { organizationId },
    });

    return Response.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[STRIPE_CHECKOUT]", error);
    return Response.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
```

- [ ] 14.5 Create Stripe portal route

```typescript
// src/app/api/stripe/portal/route.ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OWNER") {
      return Response.json(
        { error: "Only owners can manage subscriptions" },
        { status: 403 }
      );
    }

    const { organizationId } = session.user;

    const org = await db.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.stripeCustomerId) {
      return Response.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${appUrl}/app/settings`,
    });

    return Response.json({ url: portalSession.url });
  } catch (error) {
    console.error("[STRIPE_PORTAL]", error);
    return Response.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
```

- [ ] 14.6 Create Stripe webhook route

```typescript
// src/app/api/stripe/webhook/route.ts
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import type { Plan } from "@/generated/prisma/client";

const PRICE_TO_PLAN: Record<string, Plan> = {
  [process.env.STRIPE_STARTER_PRICE_ID ?? ""]: "STARTER",
  [process.env.STRIPE_GROWTH_PRICE_ID ?? ""]: "GROWTH",
  [process.env.STRIPE_PRO_PRICE_ID ?? ""]: "PRO",
};

function planFromPriceId(priceId: string): Plan {
  return PRICE_TO_PLAN[priceId] ?? "STARTER";
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return Response.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("[STRIPE_WEBHOOK] Signature verification failed:", error);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const organizationId = session.metadata?.organizationId;

        if (!organizationId || !session.subscription) {
          console.error(
            "[STRIPE_WEBHOOK] Missing organizationId or subscription"
          );
          break;
        }

        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string
        );
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : "STARTER";

        await db.organization.update({
          where: { id: organizationId },
          data: {
            stripeSubscriptionId: subscription.id,
            plan,
          },
        });

        console.log(
          `[STRIPE_WEBHOOK] Org ${organizationId} subscribed to ${plan}`
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = priceId ? planFromPriceId(priceId) : "STARTER";

        const org = await db.organization.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!org) {
          console.error(
            `[STRIPE_WEBHOOK] No org found for subscription ${subscription.id}`
          );
          break;
        }

        await db.organization.update({
          where: { id: org.id },
          data: { plan },
        });

        console.log(
          `[STRIPE_WEBHOOK] Org ${org.id} plan updated to ${plan}`
        );
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const org = await db.organization.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (!org) break;

        await db.organization.update({
          where: { id: org.id },
          data: {
            plan: "STARTER",
            stripeSubscriptionId: null,
          },
        });

        console.log(
          `[STRIPE_WEBHOOK] Org ${org.id} downgraded to STARTER`
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(
          `[STRIPE_WEBHOOK] Payment failed for customer ${invoice.customer}`
        );
        break;
      }

      default:
        console.log(
          `[STRIPE_WEBHOOK] Unhandled event type: ${event.type}`
        );
    }
  } catch (error) {
    console.error(`[STRIPE_WEBHOOK] Error handling ${event.type}:`, error);
    return Response.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return Response.json({ received: true });
}
```

- [ ] 14.7 Create settings page

```tsx
// src/app/(app)/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Settings, CreditCard, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface OrgSettings {
  id: string;
  name: string;
  timezone: string;
  plan: string;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  brandColor: string | null;
  logoUrl: string | null;
  brandName: string | null;
  createdAt: string;
}

const PLANS = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$99/mo",
    features: [
      "50 providers",
      "1 CSV upload/month",
      "10 drug rep visits/month",
      "5 team members",
      "1 location",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    price: "$199/mo",
    features: [
      "Unlimited providers",
      "Unlimited CSV uploads",
      "Unlimited drug rep visits",
      "15 team members",
      "3 locations",
      "Alerts and advanced analytics",
      "CSV export",
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: "$299/mo",
    features: [
      "Everything in Growth",
      "Unlimited team members",
      "Unlimited locations",
      "CSV + PDF export",
      "White-label branding",
      "API access",
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandName, setBrandName] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          setName(data.name);
          setTimezone(data.timezone);
          setBrandColor(data.brandColor ?? "");
          setLogoUrl(data.logoUrl ?? "");
          setBrandName(data.brandName ?? "");
        }
      })
      .catch(() => {
        toast.error("Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          timezone,
          brandColor: brandColor || null,
          logoUrl: logoUrl || null,
          brandName: brandName || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
        return;
      }

      toast.success("Settings saved");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    const priceMap: Record<string, string | undefined> = {
      STARTER: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
      GROWTH: process.env.NEXT_PUBLIC_STRIPE_GROWTH_PRICE_ID,
      PRO: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    };
    const priceId = priceMap[planId];
    if (!priceId) {
      toast.error("Pricing not configured yet");
      return;
    }

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to start checkout");
        return;
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to open billing portal");
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      toast.error("Something went wrong");
    }
  };

  if (loading) {
    return (
      <div>
        <h1>Settings</h1>
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 animate-pulse h-32"
            />
          ))}
        </div>
      </div>
    );
  }

  const isTrialActive =
    settings?.trialEndsAt && new Date(settings.trialEndsAt) > new Date();

  return (
    <div>
      <h1>Settings</h1>
      <p className="mt-1 text-[14px] text-[#1d1d1f]/48 mb-6">
        Manage your organization settings and billing
      </p>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-[#f5f5f7] rounded-lg p-1">
          <TabsTrigger value="general" className="rounded-md">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-md">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="branding" className="rounded-md">
            <Palette className="h-4 w-4 mr-2" />
            Branding
          </TabsTrigger>
        </TabsList>

        {/* General tab */}
        <TabsContent value="general">
          <div className="bg-white rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Organization name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11 bg-[#f5f5f7] border-0 rounded-lg max-w-md"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="h-11 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] max-w-md w-full"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">
                  Pacific Time (PT)
                </option>
              </select>
            </div>
            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Billing tab */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Current plan */}
            <div className="bg-white rounded-xl p-6">
              <h3 className="mb-4">Current plan</h3>
              <div className="flex items-center gap-3">
                <span className="text-[21px] font-semibold text-[#1d1d1f]">
                  {settings?.plan}
                </span>
                {isTrialActive && (
                  <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                    Trial ends{" "}
                    {new Date(settings!.trialEndsAt!).toLocaleDateString()}
                  </span>
                )}
              </div>
              {settings?.stripeSubscriptionId && (
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  className="mt-4 rounded-lg"
                >
                  Manage billing
                </Button>
              )}
            </div>

            {/* Plan comparison */}
            <div className="grid md:grid-cols-3 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`bg-white rounded-xl p-6 ${
                    settings?.plan === plan.id
                      ? "ring-2 ring-[#0071e3]"
                      : ""
                  }`}
                >
                  <h3>{plan.name}</h3>
                  <p className="text-[28px] font-semibold text-[#1d1d1f] mt-2">
                    {plan.price}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="text-[14px] text-[#1d1d1f]/60 flex items-start gap-2"
                      >
                        <span className="text-[#22C55E] mt-0.5">&#10003;</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {settings?.plan !== plan.id && (
                    <Button
                      onClick={() => handleCheckout(plan.id)}
                      className="w-full mt-6 bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
                    >
                      {settings?.plan === "STARTER" ||
                      (settings?.plan === "GROWTH" && plan.id === "PRO")
                        ? "Upgrade"
                        : "Switch"}
                    </Button>
                  )}
                  {settings?.plan === plan.id && (
                    <p className="text-center text-[14px] text-[#0071e3] font-medium mt-6">
                      Current plan
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Branding tab */}
        <TabsContent value="branding">
          <div className="bg-white rounded-xl p-6 space-y-5">
            <p className="text-[14px] text-[#1d1d1f]/48">
              Customize RxDesk with your pharmacy branding. Available on Pro
              plan.
            </p>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Display name
              </label>
              <Input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="My Pharmacy"
                className="h-11 bg-[#f5f5f7] border-0 rounded-lg max-w-md"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Brand color
              </label>
              <div className="flex items-center gap-3 max-w-md">
                <input
                  type="color"
                  value={brandColor || "#0071e3"}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-11 w-14 rounded-lg border-0 cursor-pointer"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  placeholder="#0071e3"
                  className="h-11 bg-[#f5f5f7] border-0 rounded-lg flex-1"
                />
              </div>
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#1d1d1f] mb-1.5">
                Logo URL
              </label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="h-11 bg-[#f5f5f7] border-0 rounded-lg max-w-md"
              />
            </div>
            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#0071e3] hover:bg-[#0077ED] text-white rounded-lg"
              >
                {saving ? "Saving..." : "Save branding"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] 14.8 Commit: `git add -A && git commit -m "feat: add settings page with org config, Stripe billing (checkout/portal/webhook), and branding"`

---

## Task 15: Audit log system

**Files:**
- Create: `src/lib/audit.ts`
- Create: `src/app/api/audit-log/route.ts`

### Steps

- [ ] 15.1 Create the audit log utility

```typescript
// src/lib/audit.ts
import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

interface AuditLogInput {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Write an audit log entry. Best-effort -- does not throw on failure.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

// Common action constants for RxDesk
export const AuditActions = {
  // User lifecycle
  USER_INVITED: "user.invited",
  USER_INVITE_ACCEPTED: "user.invite_accepted",
  USER_DEACTIVATED: "user.deactivated",
  USER_REACTIVATED: "user.reactivated",
  USER_ROLE_CHANGED: "user.role_changed",
  USER_PERMISSIONS_UPDATED: "user.permissions_updated",

  // Organization
  SETTINGS_UPDATED: "organization.settings_updated",
  PLAN_CHANGED: "organization.plan_changed",

  // Locations
  LOCATION_CREATED: "location.created",
  LOCATION_UPDATED: "location.updated",
  LOCATION_DEACTIVATED: "location.deactivated",

  // Providers (Plan 2)
  PROVIDER_CREATED: "provider.created",
  PROVIDER_UPDATED: "provider.updated",
  PROVIDER_DELETED: "provider.deleted",
  PROVIDER_IMPORTED: "provider.imported",

  // Prescriptions (Plan 2)
  PRESCRIPTION_UPLOADED: "prescription.uploaded",

  // Drug reps (Plan 2)
  DRUG_REP_CREATED: "drug_rep.created",
  DRUG_REP_UPDATED: "drug_rep.updated",
  DRUG_REP_DELETED: "drug_rep.deleted",
  DRUG_REP_VISIT_LOGGED: "drug_rep_visit.logged",

  // Time tracking (Plan 3)
  CLOCK_IN: "time_entry.clock_in",
  CLOCK_OUT: "time_entry.clock_out",
  TIME_ENTRY_CREATED: "time_entry.created",
  TIME_ENTRY_UPDATED: "time_entry.updated",
  TIME_ENTRY_DELETED: "time_entry.deleted",
} as const;
```

- [ ] 15.2 Create audit log API route

```typescript
// src/app/api/audit-log/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkApiModuleAccess } from "@/lib/auth-helpers";

// GET /api/audit-log -- paginated audit log for the org
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.organizationId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId } = session.user;

    // Only SETTINGS:VIEW or higher can see audit logs
    const { allowed } = await checkApiModuleAccess(
      session.user.id,
      "SETTINGS",
      "VIEW"
    );
    if (!allowed) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = request.nextUrl;
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "50", 10),
      100
    );
    const entityType = url.searchParams.get("entityType");
    const action = url.searchParams.get("action");

    const where: Record<string, unknown> = { organizationId };
    if (entityType) where.entityType = entityType;
    if (action) where.action = { contains: action };

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return Response.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/audit-log error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

- [ ] 15.3 Commit: `git add -A && git commit -m "feat: add audit log system with write utility, action constants, and paginated API"`

---

## Task 16: Seed data script

**Files:**
- Create: `prisma/seed.ts`

### Steps

- [ ] 16.1 Create seed script with realistic pharmacy data

```typescript
// prisma/seed.ts
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

const PASSWORD = "password123";

async function main() {
  console.log("Seeding RxDesk database...\n");

  // Clean existing data (reverse dependency order)
  await db.auditLog.deleteMany();
  await db.permission.deleteMany();
  await db.invite.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();
  await db.location.deleteMany();
  await db.organization.deleteMany();

  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  // ─── Organization ────────────────────────────────────────────────
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const org = await db.organization.create({
    data: {
      name: "Valley Health Pharmacy",
      timezone: "America/New_York",
      plan: "GROWTH",
      trialEndsAt,
    },
  });
  console.log(`Created org: ${org.name} (${org.id})`);

  // ─── Locations ───────────────────────────────────────────────────
  const mainLocation = await db.location.create({
    data: {
      organizationId: org.id,
      name: "Main pharmacy",
      address: "445 Oak Street",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      phone: "(217) 555-0100",
      npiNumber: "1234567890",
      licenseNumber: "PH-IL-2024-001",
    },
  });
  console.log(`  Created location: ${mainLocation.name}`);

  const downtownLocation = await db.location.create({
    data: {
      organizationId: org.id,
      name: "Downtown branch",
      address: "89 Main Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      phone: "(217) 555-0200",
      npiNumber: "0987654321",
      licenseNumber: "PH-IL-2024-002",
    },
  });
  console.log(`  Created location: ${downtownLocation.name}`);

  // ─── Users ───────────────────────────────────────────────────────
  const usersData = [
    {
      name: "Dr. Sarah Mitchell",
      email: "sarah@valleyhealth.com",
      role: "OWNER" as const,
      locationId: mainLocation.id,
    },
    {
      name: "James Park",
      email: "james@valleyhealth.com",
      role: "PHARMACIST" as const,
      locationId: mainLocation.id,
    },
    {
      name: "Maria Gonzalez",
      email: "maria@valleyhealth.com",
      role: "PHARMACIST" as const,
      locationId: downtownLocation.id,
    },
    {
      name: "Tyler Brooks",
      email: "tyler@valleyhealth.com",
      role: "TECHNICIAN" as const,
      locationId: mainLocation.id,
    },
    {
      name: "Aisha Johnson",
      email: "aisha@valleyhealth.com",
      role: "TECHNICIAN" as const,
      locationId: mainLocation.id,
    },
    {
      name: "Kevin Nguyen",
      email: "kevin@valleyhealth.com",
      role: "TECHNICIAN" as const,
      locationId: downtownLocation.id,
    },
  ];

  // Permission defaults by role
  const rolePermissions = {
    OWNER: {
      PROVIDERS: "FULL",
      PRESCRIPTIONS: "FULL",
      DRUG_REPS: "FULL",
      TIME_TRACKING: "FULL",
      TEAM: "FULL",
      REPORTS: "FULL",
      SETTINGS: "FULL",
    },
    PHARMACIST: {
      PROVIDERS: "FULL",
      PRESCRIPTIONS: "FULL",
      DRUG_REPS: "FULL",
      TIME_TRACKING: "FULL",
      TEAM: "NONE",
      REPORTS: "VIEW",
      SETTINGS: "NONE",
    },
    TECHNICIAN: {
      PROVIDERS: "VIEW",
      PRESCRIPTIONS: "NONE",
      DRUG_REPS: "NONE",
      TIME_TRACKING: "EDIT",
      TEAM: "NONE",
      REPORTS: "NONE",
      SETTINGS: "NONE",
    },
  } as const;

  for (const u of usersData) {
    const user = await db.user.create({
      data: {
        name: u.name,
        email: u.email,
        hashedPassword,
        role: u.role,
        organizationId: org.id,
        locationId: u.locationId,
        active: true,
        lastActiveAt: new Date(),
      },
    });

    // Create permissions
    const perms = rolePermissions[u.role];
    const permData = Object.entries(perms).map(([module, access]) => ({
      userId: user.id,
      organizationId: org.id,
      module: module as "PROVIDERS" | "PRESCRIPTIONS" | "DRUG_REPS" | "TIME_TRACKING" | "TEAM" | "REPORTS" | "SETTINGS",
      access: access as "NONE" | "VIEW" | "EDIT" | "FULL",
    }));

    await db.permission.createMany({ data: permData });

    console.log(`  Created user: ${u.name} (${u.role})`);
  }

  // ─── Pending invite ──────────────────────────────────────────────
  const owner = await db.user.findFirst({
    where: { email: "sarah@valleyhealth.com" },
  });

  if (owner) {
    await db.invite.create({
      data: {
        email: "newtech@valleyhealth.com",
        role: "TECHNICIAN",
        organizationId: org.id,
        invitedById: owner.id,
        locationId: downtownLocation.id,
        token: "seed-invite-token-001",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    console.log("  Created pending invite: newtech@valleyhealth.com");
  }

  // ─── Audit log entries ───────────────────────────────────────────
  if (owner) {
    await db.auditLog.createMany({
      data: [
        {
          organizationId: org.id,
          userId: owner.id,
          action: "organization.settings_updated",
          entityType: "Organization",
          entityId: org.id,
          metadata: { name: "Valley Health Pharmacy" },
        },
        {
          organizationId: org.id,
          userId: owner.id,
          action: "location.created",
          entityType: "Location",
          entityId: mainLocation.id,
          metadata: { name: "Main pharmacy" },
        },
        {
          organizationId: org.id,
          userId: owner.id,
          action: "location.created",
          entityType: "Location",
          entityId: downtownLocation.id,
          metadata: { name: "Downtown branch" },
        },
        {
          organizationId: org.id,
          userId: owner.id,
          action: "user.invited",
          entityType: "Invite",
          entityId: "seed-invite",
          metadata: { email: "newtech@valleyhealth.com", role: "TECHNICIAN" },
        },
      ],
    });
    console.log("  Created sample audit log entries");
  }

  console.log("\nSeed complete.");
  console.log("\nLogin credentials:");
  console.log("  Owner:      sarah@valleyhealth.com / password123");
  console.log("  Pharmacist: james@valleyhealth.com / password123");
  console.log("  Technician: tyler@valleyhealth.com / password123");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
```

- [ ] 16.2 Run the seed

```bash
cd /Users/mohammedzafer/Documents/claude/projects/rxdesk
npm run db:seed
```

Expected output:
```
Seeding RxDesk database...

Created org: Valley Health Pharmacy (...)
  Created location: Main pharmacy
  Created location: Downtown branch
  Created user: Dr. Sarah Mitchell (OWNER)
  Created user: James Park (PHARMACIST)
  Created user: Maria Gonzalez (PHARMACIST)
  Created user: Tyler Brooks (TECHNICIAN)
  Created user: Aisha Johnson (TECHNICIAN)
  Created user: Kevin Nguyen (TECHNICIAN)
  Created pending invite: newtech@valleyhealth.com
  Created sample audit log entries

Seed complete.

Login credentials:
  Owner:      sarah@valleyhealth.com / password123
  Pharmacist: james@valleyhealth.com / password123
  Technician: tyler@valleyhealth.com / password123
```

- [ ] 16.3 Commit: `git add -A && git commit -m "feat: add seed script with Valley Health Pharmacy demo data (3 roles, 2 locations, permissions)"`

---

## Verification checklist

After all 16 tasks are complete, verify:

- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] `npm run lint` passes
- [ ] Login page renders at `/login`
- [ ] Signup flow works end-to-end (creates user, org, location, permissions)
- [ ] App shell shows glass sidebar on desktop, bottom tabs on mobile
- [ ] Nav items are filtered by user permissions
- [ ] Locations CRUD works
- [ ] Team invite flow works
- [ ] Permission editing works (non-OWNER users only)
- [ ] Settings page loads org settings
- [ ] Audit log API returns paginated entries
- [ ] Seed data creates all expected records

---

## TDD brief

### Unit tests

| Test | Input | Expected output | Component |
|------|-------|-----------------|-----------|
| getDefaultPermissions returns 7 modules for OWNER | `"OWNER"` | Array of 7 items, all `access: "FULL"` | `src/lib/permissions.ts` |
| getDefaultPermissions TECHNICIAN has EDIT on TIME_TRACKING | `"TECHNICIAN"` | TIME_TRACKING entry has `access: "EDIT"` | `src/lib/permissions.ts` |
| meetsAccessLevel VIEW >= VIEW | `("VIEW", "VIEW")` | `true` | `src/lib/auth-helpers.ts` |
| meetsAccessLevel VIEW < EDIT | `("VIEW", "EDIT")` | `false` | `src/lib/auth-helpers.ts` |
| meetsAccessLevel FULL >= all levels | `("FULL", "FULL")` | `true` | `src/lib/auth-helpers.ts` |
| isRoleEditable returns false for OWNER | `"OWNER"` | `false` | `src/lib/permissions.ts` |
| isRoleEditable returns true for PHARMACIST | `"PHARMACIST"` | `true` | `src/lib/permissions.ts` |
| rateLimit allows under limit | 3 calls within 10 limit | All succeed | `src/lib/rate-limit.ts` |
| rateLimit blocks over limit | 11 calls within 10 limit | 11th fails | `src/lib/rate-limit.ts` |

### Integration tests

| Test | Setup | Action | Assertion |
|------|-------|--------|-----------|
| POST /api/auth/register creates user | Empty DB | POST with valid name/email/password | 200, user created with OWNER role |
| POST /api/auth/register rejects duplicate | Existing user in DB | POST with same email | 409 error |
| POST /api/auth/register validates password | Empty DB | POST with 5-char password | 400 error |
| POST /api/locations requires OWNER | Authenticated as PHARMACIST | POST to create location | 403 error |
| POST /api/invites enforces plan limits | Org at team limit | POST invite | 403 error |
| PUT /api/team/[id]/permissions blocks OWNER edit | OWNER user | PUT permissions | 400 error |
| GET /api/audit-log paginates | 60 audit logs | GET page=2 limit=50 | Returns entries 51-60 |

### E2E tests

| Test | User flow | Expected behavior |
|------|-----------|-------------------|
| Full signup flow | Visit /signup, fill form, submit, fill org+location form, submit | Redirected to /app/dashboard with sidebar visible |
| Login with seed user | Visit /login, enter sarah@valleyhealth.com / password123 | Redirected to dashboard, sees all nav items |
| Technician sees limited nav | Login as tyler@valleyhealth.com | Only sees Dashboard, Providers (view), Time tracking in nav |
| Create location | Login as owner, navigate to Locations, click Add, fill form | Location appears in list |
| Invite team member | Login as owner, navigate to Team, click Invite, fill email+role | Invite appears in Pending invites section |
| Edit permissions | Login as owner, Team page, click user menu, Manage permissions, change a module, save | Permission persisted (verify via API) |

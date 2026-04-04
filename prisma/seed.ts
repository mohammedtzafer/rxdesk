import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local before any other imports that might need env vars
config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "../src/generated/prisma/client";
import { neon } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

// ─── Inline permission defaults (mirrors src/lib/permissions.ts) ─────────────
// We inline these to avoid Next.js-specific path resolution issues in seed context

type Role = "OWNER" | "PHARMACIST" | "TECHNICIAN";
type Module =
  | "PROVIDERS"
  | "PRESCRIPTIONS"
  | "DRUG_REPS"
  | "TIME_TRACKING"
  | "TEAM"
  | "REPORTS"
  | "SETTINGS";
type Access = "NONE" | "VIEW" | "EDIT" | "FULL";

const ALL_MODULES: Module[] = [
  "PROVIDERS",
  "PRESCRIPTIONS",
  "DRUG_REPS",
  "TIME_TRACKING",
  "TEAM",
  "REPORTS",
  "SETTINGS",
];

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

function getDefaultPermissions(
  role: Role
): Array<{ module: Module; access: Access }> {
  const perms = DEFAULT_PERMISSIONS[role];
  return ALL_MODULES.map((module) => ({ module, access: perms[module] }));
}

// ─── Prisma client ────────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in .env.local");
  }
  const sql = neon(connectionString);
  const adapter = new PrismaNeon(sql);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick<T>(items: Array<{ value: T; weight: number }>): T {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  let rand = Math.random() * total;
  for (const item of items) {
    rand -= item.weight;
    if (rand <= 0) return item.value;
  }
  return items[items.length - 1].value;
}

type PayerType = "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH";

const PAYER_WEIGHTS: Array<{ value: PayerType; weight: number }> = [
  { value: "COMMERCIAL", weight: 50 },
  { value: "MEDICARE", weight: 25 },
  { value: "MEDICAID", weight: 15 },
  { value: "CASH", weight: 10 },
];

interface DrugDef {
  name: string;
  isGeneric: boolean;
  ndcPrefix: string;
}

const DRUGS: DrugDef[] = [
  { name: "Lisinopril", isGeneric: true, ndcPrefix: "00378-1234" },
  { name: "Metformin", isGeneric: true, ndcPrefix: "00093-1010" },
  { name: "Atorvastatin", isGeneric: true, ndcPrefix: "00071-0156" },
  { name: "Amlodipine", isGeneric: true, ndcPrefix: "00069-1530" },
  { name: "Omeprazole", isGeneric: true, ndcPrefix: "00185-3902" },
  { name: "Sertraline", isGeneric: true, ndcPrefix: "00049-4960" },
  { name: "Levothyroxine", isGeneric: true, ndcPrefix: "00074-7068" },
  { name: "Lipitor", isGeneric: false, ndcPrefix: "00071-0157" },
  { name: "Eliquis", isGeneric: false, ndcPrefix: "00003-3972" },
  { name: "Jardiance", isGeneric: false, ndcPrefix: "00597-0140" },
  { name: "Ozempic", isGeneric: false, ndcPrefix: "00169-4060" },
  { name: "Humira", isGeneric: false, ndcPrefix: "00074-9374" },
  { name: "Xarelto", isGeneric: false, ndcPrefix: "50458-0579" },
  { name: "Entresto", isGeneric: false, ndcPrefix: "00078-0620" },
];

// Specialty-appropriate drug pools (indices into DRUGS array)
const DRUG_POOLS: Record<string, number[]> = {
  "Internal Medicine": [0, 1, 2, 3, 4, 5, 6, 7, 8], // Anderson
  "Family Medicine": [0, 1, 2, 3, 4, 5, 6, 9, 10],   // Chang
  Cardiology: [0, 2, 3, 7, 8, 12, 13],                // Torres
  Endocrinology: [1, 6, 9, 10, 11],                   // White
  Psychiatry: [5],                                     // Kim
  Orthopedics: [8, 12],                               // Green
  Pulmonology: [0, 4, 7],                             // Brown
  Dermatology: [11],                                  // Davis
  Gastroenterology: [1, 4, 9],                        // Miller
  "OB/GYN": [0, 1, 6],                               // Watson
};

function generateNdc(prefix: string): string {
  const suffix = String(randomBetween(10, 99));
  return `${prefix}-${suffix}`;
}

// ─── Prescription generation ──────────────────────────────────────────────────

interface ProviderRxConfig {
  npi: string;
  specialty: string;
  targetCount: number;
  // date distribution: [minDaysAgo, maxDaysAgo] — older = declining
  dateRange: [number, number];
  // optional: second date range and its weight (0-1) for bimodal distributions
  oldBias?: { dateRange: [number, number]; weight: number };
}

function buildRxRecords(
  orgId: string,
  locationId: string,
  uploadId: string,
  providersMap: Record<string, string>, // npi -> providerId
  config: ProviderRxConfig
): Array<{
  organizationId: string;
  locationId: string;
  uploadId: string;
  providerId: string | undefined;
  providerNpi: string;
  drugName: string;
  drugNdc: string;
  isGeneric: boolean;
  fillDate: Date;
  quantity: number;
  daysSupply: number;
  payerType: PayerType;
}> {
  const records = [];
  const drugIndices = DRUG_POOLS[config.specialty] ?? [0, 1, 2];
  const drugs = drugIndices.map((i) => DRUGS[i]);

  for (let i = 0; i < config.targetCount; i++) {
    let daysBack: number;

    if (config.oldBias && Math.random() < config.oldBias.weight) {
      const [min, max] = config.oldBias.dateRange;
      daysBack = randomBetween(min, max);
    } else {
      const [min, max] = config.dateRange;
      daysBack = randomBetween(min, max);
    }

    const drug = pickRandom(drugs);
    const fillDate = daysAgo(daysBack);

    records.push({
      organizationId: orgId,
      locationId,
      uploadId,
      providerId: providersMap[config.npi] ?? undefined,
      providerNpi: config.npi,
      drugName: drug.name,
      drugNdc: generateNdc(drug.ndcPrefix),
      isGeneric: drug.isGeneric,
      fillDate,
      quantity: pickRandom([30, 60, 90]),
      daysSupply: pickRandom([30, 60, 90]),
      payerType: weightedPick(PAYER_WEIGHTS),
    });
  }

  return records;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const prisma = createPrismaClient();

  console.log("Connecting to database...");

  // ── Clean existing data ──────────────────────────────────────────────────────
  console.log("Cleaning existing data...");

  await prisma.drugRepVisitProvider.deleteMany();
  await prisma.drugRepVisit.deleteMany();
  await prisma.drugRep.deleteMany();
  await prisma.prescriptionRecord.deleteMany();
  await prisma.prescriptionUpload.deleteMany();
  await prisma.provider.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.organization.deleteMany();

  console.log("Existing data cleared.");

  // ── Organization ─────────────────────────────────────────────────────────────
  console.log("Creating organization...");

  const org = await prisma.organization.create({
    data: {
      name: "Valley Health Pharmacy",
      timezone: "America/New_York",
      plan: "GROWTH",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Locations ─────────────────────────────────────────────────────────────────
  console.log("Creating locations...");

  const mainStreetLocation = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: "Main Street",
      address: "123 Main St",
      city: "Albany",
      state: "NY",
      zip: "12207",
      npiNumber: "1234567890",
      isActive: true,
    },
  });

  const westsideLocation = await prisma.location.create({
    data: {
      organizationId: org.id,
      name: "Westside",
      address: "456 Oak Ave",
      city: "Albany",
      state: "NY",
      zip: "12205",
      npiNumber: "0987654321",
      isActive: true,
    },
  });

  // ── Users ─────────────────────────────────────────────────────────────────────
  console.log("Creating users...");

  const passwordHash = await bcrypt.hash("password123", 12);

  interface UserDef {
    name: string;
    email: string;
    role: Role;
    locationId: string;
  }

  const userDefs: UserDef[] = [
    {
      name: "Sarah Chen",
      email: "sarah@valleyhealth.com",
      role: "OWNER",
      locationId: mainStreetLocation.id,
    },
    {
      name: "Diego Martinez",
      email: "diego@valleyhealth.com",
      role: "PHARMACIST",
      locationId: mainStreetLocation.id,
    },
    {
      name: "Priya Patel",
      email: "priya@valleyhealth.com",
      role: "PHARMACIST",
      locationId: westsideLocation.id,
    },
    {
      name: "Marcus Johnson",
      email: "marcus@valleyhealth.com",
      role: "TECHNICIAN",
      locationId: mainStreetLocation.id,
    },
    {
      name: "Mei Lin",
      email: "mei@valleyhealth.com",
      role: "TECHNICIAN",
      locationId: westsideLocation.id,
    },
    {
      name: "James Wilson",
      email: "james@valleyhealth.com",
      role: "TECHNICIAN",
      locationId: mainStreetLocation.id,
    },
  ];

  const createdUsers: Array<{ id: string; email: string; role: Role }> = [];

  for (const def of userDefs) {
    const user = await prisma.user.create({
      data: {
        name: def.name,
        email: def.email,
        hashedPassword: passwordHash,
        role: def.role,
        organizationId: org.id,
        locationId: def.locationId,
        emailVerified: new Date(),
        active: true,
        lastActiveAt: daysAgo(randomBetween(0, 7)),
      },
    });
    createdUsers.push({ id: user.id, email: user.email, role: def.role });
  }

  // ── Permissions ───────────────────────────────────────────────────────────────
  console.log("Creating permissions...");

  const permissionData: Array<{
    userId: string;
    organizationId: string;
    module: Module;
    access: Access;
  }> = [];

  for (const user of createdUsers) {
    const perms = getDefaultPermissions(user.role);
    for (const perm of perms) {
      permissionData.push({
        userId: user.id,
        organizationId: org.id,
        module: perm.module,
        access: perm.access,
      });
    }
  }

  await prisma.permission.createMany({ data: permissionData });

  // ── Providers ─────────────────────────────────────────────────────────────────
  console.log("Creating providers...");

  interface ProviderDef {
    npi: string;
    firstName: string;
    lastName: string;
    suffix: string;
    specialty: string;
    practiceName: string;
    tags: string[];
  }

  const providerDefs: ProviderDef[] = [
    {
      npi: "1111111111",
      firstName: "Robert",
      lastName: "Anderson",
      suffix: "MD",
      specialty: "Internal Medicine",
      practiceName: "Albany Medical Group",
      tags: ["high-value"],
    },
    {
      npi: "2222222222",
      firstName: "Lisa",
      lastName: "Chang",
      suffix: "MD",
      specialty: "Family Medicine",
      practiceName: "Capital Family Practice",
      tags: ["high-value"],
    },
    {
      npi: "3333333333",
      firstName: "Michael",
      lastName: "Torres",
      suffix: "MD",
      specialty: "Cardiology",
      practiceName: "Heart Care Associates",
      tags: ["high-value"],
    },
    {
      npi: "4444444444",
      firstName: "Jennifer",
      lastName: "White",
      suffix: "MD",
      specialty: "Endocrinology",
      practiceName: "Albany Endocrine Center",
      tags: [],
    },
    {
      npi: "5555555555",
      firstName: "David",
      lastName: "Kim",
      suffix: "MD",
      specialty: "Psychiatry",
      practiceName: "MindWell Clinic",
      tags: [],
    },
    {
      npi: "6666666666",
      firstName: "Rachel",
      lastName: "Green",
      suffix: "MD",
      specialty: "Orthopedics",
      practiceName: "Albany Bone & Joint",
      tags: [],
    },
    {
      npi: "7777777777",
      firstName: "William",
      lastName: "Brown",
      suffix: "MD",
      specialty: "Pulmonology",
      practiceName: "Lung Care Associates",
      tags: ["declining"],
    },
    {
      npi: "8888888888",
      firstName: "Sarah",
      lastName: "Davis",
      suffix: "MD",
      specialty: "Dermatology",
      practiceName: "Clear Skin Dermatology",
      tags: [],
    },
    {
      npi: "9999999999",
      firstName: "James",
      lastName: "Miller",
      suffix: "MD",
      specialty: "Gastroenterology",
      practiceName: "GI Associates",
      tags: [],
    },
    {
      npi: "1010101010",
      firstName: "Emily",
      lastName: "Watson",
      suffix: "MD",
      specialty: "OB/GYN",
      practiceName: "Women's Health Albany",
      tags: ["new"],
    },
  ];

  const createdProviders: Array<{ id: string; npi: string }> = [];

  for (const def of providerDefs) {
    const provider = await prisma.provider.create({
      data: {
        organizationId: org.id,
        npi: def.npi,
        firstName: def.firstName,
        lastName: def.lastName,
        suffix: def.suffix,
        specialty: def.specialty,
        practiceName: def.practiceName,
        practiceCity: "Albany",
        practiceState: "NY",
        tags: def.tags,
        isActive: true,
        enrichedFromNppes: false,
      },
    });
    createdProviders.push({ id: provider.id, npi: def.npi });
  }

  const providersMap: Record<string, string> = {};
  for (const p of createdProviders) {
    providersMap[p.npi] = p.id;
  }

  // ── Prescription Upload ───────────────────────────────────────────────────────
  console.log("Creating prescription upload...");

  // Use sarah (OWNER) as the uploader
  const sarahUser = createdUsers.find((u) => u.email === "sarah@valleyhealth.com")!;

  const upload = await prisma.prescriptionUpload.create({
    data: {
      organizationId: org.id,
      locationId: mainStreetLocation.id,
      uploadedById: sarahUser.id,
      fileName: "valley_health_rx_6month_export.csv",
      rowCount: 400, // approximate — will update below
      dateRangeStart: daysAgo(180),
      dateRangeEnd: new Date(),
      status: "COMPLETED",
    },
  });

  // ── Prescription Records (~400 total) ─────────────────────────────────────────
  console.log("Generating prescription records (~400 records)...");

  const rxConfigs: ProviderRxConfig[] = [
    // Anderson — high volume, even spread across 6 months
    {
      npi: "1111111111",
      specialty: "Internal Medicine",
      targetCount: 80,
      dateRange: [1, 180],
    },
    // Chang — high volume, even spread
    {
      npi: "2222222222",
      specialty: "Family Medicine",
      targetCount: 70,
      dateRange: [1, 180],
    },
    // Torres — cardiology, even spread
    {
      npi: "3333333333",
      specialty: "Cardiology",
      targetCount: 60,
      dateRange: [1, 180],
    },
    // White — endocrinology, even spread
    {
      npi: "4444444444",
      specialty: "Endocrinology",
      targetCount: 50,
      dateRange: [1, 180],
    },
    // Kim — psychiatry, even spread
    {
      npi: "5555555555",
      specialty: "Psychiatry",
      targetCount: 40,
      dateRange: [1, 180],
    },
    // Green — orthopedics, even spread
    {
      npi: "6666666666",
      specialty: "Orthopedics",
      targetCount: 30,
      dateRange: [1, 180],
    },
    // Brown — declining: most 3-6 months ago, very few recent
    {
      npi: "7777777777",
      specialty: "Pulmonology",
      targetCount: 25,
      dateRange: [1, 30],   // recent = rare
      oldBias: { dateRange: [90, 180], weight: 0.85 },
    },
    // Davis — dermatology, even spread
    {
      npi: "8888888888",
      specialty: "Dermatology",
      targetCount: 20,
      dateRange: [1, 180],
    },
    // Miller — gastroenterology, even spread
    {
      npi: "9999999999",
      specialty: "Gastroenterology",
      targetCount: 15,
      dateRange: [1, 180],
    },
    // Watson — new: all in last 30 days only
    {
      npi: "1010101010",
      specialty: "OB/GYN",
      targetCount: 10,
      dateRange: [1, 30],
    },
  ];

  let allRxRecords: ReturnType<typeof buildRxRecords> = [];

  for (const config of rxConfigs) {
    const records = buildRxRecords(
      org.id,
      mainStreetLocation.id,
      upload.id,
      providersMap,
      config
    );
    allRxRecords = allRxRecords.concat(records);
  }

  const BATCH_SIZE = 100;
  let insertedCount = 0;
  for (let i = 0; i < allRxRecords.length; i += BATCH_SIZE) {
    const batch = allRxRecords.slice(i, i + BATCH_SIZE);
    await prisma.prescriptionRecord.createMany({ data: batch });
    insertedCount += batch.length;
    console.log(`  Inserted ${insertedCount}/${allRxRecords.length} prescription records...`);
  }

  // Update upload rowCount to actual
  await prisma.prescriptionUpload.update({
    where: { id: upload.id },
    data: { rowCount: allRxRecords.length },
  });

  console.log(`Created ${allRxRecords.length} prescription records.`);

  // ── Drug Reps ─────────────────────────────────────────────────────────────────
  console.log("Creating drug reps...");

  const [harper, santos, bradley, liu] = await Promise.all([
    prisma.drugRep.create({
      data: {
        organizationId: org.id,
        firstName: "John",
        lastName: "Harper",
        company: "Pfizer",
        email: "john.harper@pfizer.example.com",
        territory: "Northeast Territory",
      },
    }),
    prisma.drugRep.create({
      data: {
        organizationId: org.id,
        firstName: "Maria",
        lastName: "Santos",
        company: "Merck",
        email: "maria.santos@merck.example.com",
        territory: "Capital Region",
      },
    }),
    prisma.drugRep.create({
      data: {
        organizationId: org.id,
        firstName: "Tom",
        lastName: "Bradley",
        company: "AstraZeneca",
        email: "tom.bradley@astrazeneca.example.com",
        territory: "Upstate NY",
      },
    }),
    prisma.drugRep.create({
      data: {
        organizationId: org.id,
        firstName: "Amy",
        lastName: "Liu",
        company: "Novo Nordisk",
        email: "amy.liu@novonordisk.example.com",
        territory: "Northeast",
      },
    }),
  ]);

  // ── Drug Rep Visits ───────────────────────────────────────────────────────────
  console.log("Creating drug rep visits...");

  const diegoUser = createdUsers.find((u) => u.email === "diego@valleyhealth.com")!;

  interface VisitDef {
    drugRepId: string;
    visitDate: Date;
    drugsPromoted: string[];
    samplesLeft: string[];
    notes: string;
    providerNpis: string[];
    locationId: string;
    loggedById: string;
  }

  const visitDefs: VisitDef[] = [
    // 1. Harper (Pfizer) 3 months ago — Eliquis, Anderson + Torres
    {
      drugRepId: harper.id,
      visitDate: daysAgo(90),
      drugsPromoted: ["Eliquis"],
      samplesLeft: [],
      notes: "Discussed Eliquis efficacy data with Dr. Anderson and Dr. Torres. Shared recent ARISTOTLE trial outcomes.",
      providerNpis: ["1111111111", "3333333333"],
      locationId: mainStreetLocation.id,
      loggedById: diegoUser.id,
    },
    // 2. Santos (Merck) 2.5 months ago — Jardiance, White
    {
      drugRepId: santos.id,
      visitDate: daysAgo(75),
      drugsPromoted: ["Jardiance"],
      samplesLeft: [],
      notes: "Presented Jardiance cardiovascular outcomes data to Dr. White. She expressed interest in expanded use for early-stage T2D patients.",
      providerNpis: ["4444444444"],
      locationId: mainStreetLocation.id,
      loggedById: diegoUser.id,
    },
    // 3. Bradley (AstraZeneca) 2 months ago — Entresto, Torres
    {
      drugRepId: bradley.id,
      visitDate: daysAgo(60),
      drugsPromoted: ["Entresto"],
      samplesLeft: [],
      notes: "Reviewed PARADIGM-HF data with Dr. Torres. He requested dosing reference cards for the team.",
      providerNpis: ["3333333333"],
      locationId: mainStreetLocation.id,
      loggedById: sarahUser.id,
    },
    // 4. Liu (Novo Nordisk) 6 weeks ago — Ozempic, White + Chang
    {
      drugRepId: liu.id,
      visitDate: daysAgo(42),
      drugsPromoted: ["Ozempic"],
      samplesLeft: [],
      notes: "Covered SUSTAIN-6 cardiovascular benefit data with Dr. White and Dr. Chang. Both interested in weight management use case.",
      providerNpis: ["4444444444", "2222222222"],
      locationId: mainStreetLocation.id,
      loggedById: diegoUser.id,
    },
    // 5. Harper (Pfizer) 5 weeks ago — Lipitor, Anderson, left samples
    {
      drugRepId: harper.id,
      visitDate: daysAgo(35),
      drugsPromoted: ["Lipitor"],
      samplesLeft: ["Lipitor 20mg (30 count)", "Lipitor 40mg (30 count)"],
      notes: "Left Lipitor samples with Dr. Anderson's office. Discussed statin therapy escalation protocols for high-risk patients.",
      providerNpis: ["1111111111"],
      locationId: mainStreetLocation.id,
      loggedById: sarahUser.id,
    },
    // 6. Santos (Merck) 3 weeks ago — Jardiance, Chang + Kim
    {
      drugRepId: santos.id,
      visitDate: daysAgo(21),
      drugsPromoted: ["Jardiance"],
      samplesLeft: [],
      notes: "Follow-up with Dr. Chang and Dr. Kim. Discussed Jardiance's emerging data on heart failure in non-diabetic patients.",
      providerNpis: ["2222222222", "5555555555"],
      locationId: mainStreetLocation.id,
      loggedById: diegoUser.id,
    },
    // 7. Bradley (AstraZeneca) 2 weeks ago — Xarelto, Torres + Anderson
    {
      drugRepId: bradley.id,
      visitDate: daysAgo(14),
      drugsPromoted: ["Xarelto"],
      samplesLeft: [],
      notes: "Presented Xarelto vs. warfarin comparison to Dr. Torres and Dr. Anderson. Both requested patient co-pay cards.",
      providerNpis: ["3333333333", "1111111111"],
      locationId: mainStreetLocation.id,
      loggedById: diegoUser.id,
    },
    // 8. Liu (Novo Nordisk) 1 week ago — Ozempic, White, left samples
    {
      drugRepId: liu.id,
      visitDate: daysAgo(7),
      drugsPromoted: ["Ozempic"],
      samplesLeft: ["Ozempic 0.25mg pen (4-week starter)", "Ozempic 0.5mg pen (4-week)"],
      notes: "Dropped off Ozempic starter pens for Dr. White's new T2D patients. Discussed SELECT cardiovascular trial results.",
      providerNpis: ["4444444444"],
      locationId: mainStreetLocation.id,
      loggedById: sarahUser.id,
    },
  ];

  for (const def of visitDefs) {
    const visit = await prisma.drugRepVisit.create({
      data: {
        organizationId: org.id,
        locationId: def.locationId,
        drugRepId: def.drugRepId,
        visitDate: def.visitDate,
        durationMinutes: pickRandom([15, 20, 30, 45]),
        drugsPromoted: def.drugsPromoted,
        samplesLeft: def.samplesLeft,
        notes: def.notes,
        loggedById: def.loggedById,
      },
    });

    // Link visit to providers
    const visitProviderData = def.providerNpis.map((npi) => ({
      drugRepVisitId: visit.id,
      providerId: providersMap[npi],
    }));

    await prisma.drugRepVisitProvider.createMany({ data: visitProviderData });
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────────
  console.log("Creating audit log entries...");

  const auditLogs = [
    {
      organizationId: org.id,
      userId: sarahUser.id,
      action: "create",
      entityType: "Organization",
      entityId: org.id,
      metadata: { name: "Valley Health Pharmacy", plan: "GROWTH" },
      createdAt: daysAgo(180),
    },
    {
      organizationId: org.id,
      userId: sarahUser.id,
      action: "create",
      entityType: "Location",
      entityId: westsideLocation.id,
      metadata: { name: "Westside", address: "456 Oak Ave, Albany, NY 12205" },
      createdAt: daysAgo(179),
    },
    {
      organizationId: org.id,
      userId: sarahUser.id,
      action: "invite",
      entityType: "User",
      entityId: diegoUser.id,
      metadata: { email: "diego@valleyhealth.com", role: "PHARMACIST" },
      createdAt: daysAgo(178),
    },
    {
      organizationId: org.id,
      userId: sarahUser.id,
      action: "upload",
      entityType: "PrescriptionUpload",
      entityId: upload.id,
      metadata: {
        fileName: "valley_health_rx_6month_export.csv",
        rowCount: allRxRecords.length,
        status: "COMPLETED",
      },
      createdAt: daysAgo(30),
    },
    {
      organizationId: org.id,
      userId: sarahUser.id,
      action: "update",
      entityType: "Organization",
      entityId: org.id,
      metadata: {
        field: "brandColor",
        previousValue: null,
        newValue: "#2563eb",
      },
      createdAt: daysAgo(10),
    },
  ];

  await prisma.auditLog.createMany({ data: auditLogs });

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("");
  console.log("Seed complete. Summary:");
  console.log("  Organization: Valley Health Pharmacy");
  console.log("  Locations: 2 (Main Street, Westside)");
  console.log(`  Users: ${createdUsers.length}`);
  console.log(`  Providers: ${createdProviders.length}`);
  console.log(`  Prescription records: ${allRxRecords.length}`);
  console.log("  Drug reps: 4");
  console.log("  Drug rep visits: 8");
  console.log("  Audit log entries: 5");
  console.log("");
  console.log("Login credentials (all passwords: password123):");
  for (const def of userDefs) {
    console.log(`  ${def.email}  [${def.role}]`);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});

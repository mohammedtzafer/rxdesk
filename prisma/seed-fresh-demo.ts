import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

// ─── Prisma client ─────────────────────────────────────────────────────────────

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set in .env.local");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
  } as unknown as ConstructorParameters<typeof PrismaClient>[0]);
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type Role = "OWNER" | "PHARMACIST" | "TECHNICIAN" | "DRUG_REP";
type Module =
  | "PROVIDERS"
  | "PRESCRIPTIONS"
  | "DRUG_REPS"
  | "TIME_TRACKING"
  | "SCHEDULING"
  | "TEAM"
  | "REPORTS"
  | "SETTINGS";
type Access = "NONE" | "VIEW" | "EDIT" | "FULL";
type PayerType = "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH";

const ALL_MODULES: Module[] = [
  "PROVIDERS",
  "PRESCRIPTIONS",
  "DRUG_REPS",
  "TIME_TRACKING",
  "SCHEDULING",
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
    SCHEDULING: "FULL",
    TEAM: "FULL",
    REPORTS: "FULL",
    SETTINGS: "FULL",
  },
  PHARMACIST: {
    PROVIDERS: "FULL",
    PRESCRIPTIONS: "FULL",
    DRUG_REPS: "FULL",
    TIME_TRACKING: "FULL",
    SCHEDULING: "FULL",
    TEAM: "NONE",
    REPORTS: "VIEW",
    SETTINGS: "NONE",
  },
  TECHNICIAN: {
    PROVIDERS: "VIEW",
    PRESCRIPTIONS: "NONE",
    DRUG_REPS: "NONE",
    TIME_TRACKING: "EDIT",
    SCHEDULING: "VIEW",
    TEAM: "NONE",
    REPORTS: "NONE",
    SETTINGS: "NONE",
  },
  DRUG_REP: {
    PROVIDERS: "NONE",
    PRESCRIPTIONS: "NONE",
    DRUG_REPS: "FULL",
    TIME_TRACKING: "NONE",
    SCHEDULING: "NONE",
    TEAM: "NONE",
    REPORTS: "NONE",
    SETTINGS: "NONE",
  },
};

function getDefaultPermissions(role: Role): Array<{ module: Module; access: Access }> {
  const perms = DEFAULT_PERMISSIONS[role];
  return ALL_MODULES.map((module) => ({ module, access: perms[module] }));
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Returns a Date at midnight UTC for N days ago
function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(0, 0, 0, 0);
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

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function getWorkdays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    if (isWeekday(current)) days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getLastNMondays(n: number): Date[] {
  const mondays: Date[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToMonday);
  lastMonday.setHours(0, 0, 0, 0);
  for (let i = 0; i < n; i++) {
    const monday = new Date(lastMonday);
    monday.setDate(lastMonday.getDate() - i * 7);
    mondays.push(monday);
  }
  return mondays;
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function dateAtTime(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function generateNdc(prefix: string): string {
  return `${prefix}-${String(randomBetween(10, 99))}`;
}

// ─── Drug definitions ──────────────────────────────────────────────────────────

interface DrugDef {
  name: string;
  isGeneric: boolean;
  ndcPrefix: string;
}

const ALL_DRUGS: Record<string, DrugDef> = {
  Lisinopril:         { name: "Lisinopril",        isGeneric: true,  ndcPrefix: "00378-1234" },
  Metformin:          { name: "Metformin",          isGeneric: true,  ndcPrefix: "00093-1010" },
  Atorvastatin:       { name: "Atorvastatin",       isGeneric: true,  ndcPrefix: "00071-0156" },
  Amlodipine:         { name: "Amlodipine",         isGeneric: true,  ndcPrefix: "00069-1530" },
  Omeprazole:         { name: "Omeprazole",         isGeneric: true,  ndcPrefix: "00185-3902" },
  Sertraline:         { name: "Sertraline",         isGeneric: true,  ndcPrefix: "00049-4960" },
  Levothyroxine:      { name: "Levothyroxine",      isGeneric: true,  ndcPrefix: "00074-7068" },
  Eliquis:            { name: "Eliquis",            isGeneric: false, ndcPrefix: "00003-3972" },
  Xarelto:            { name: "Xarelto",            isGeneric: false, ndcPrefix: "50458-0579" },
  Entresto:           { name: "Entresto",           isGeneric: false, ndcPrefix: "00078-0620" },
  Metoprolol:         { name: "Metoprolol",         isGeneric: true,  ndcPrefix: "00378-5050" },
  Jardiance:          { name: "Jardiance",          isGeneric: false, ndcPrefix: "00597-0140" },
  Ozempic:            { name: "Ozempic",            isGeneric: false, ndcPrefix: "00169-4060" },
  Glipizide:          { name: "Glipizide",          isGeneric: true,  ndcPrefix: "00049-3830" },
  Lexapro:            { name: "Lexapro",            isGeneric: false, ndcPrefix: "00456-2005" },
  Wellbutrin:         { name: "Wellbutrin",         isGeneric: false, ndcPrefix: "00173-0177" },
  Trazodone:          { name: "Trazodone",          isGeneric: true,  ndcPrefix: "00591-5765" },
  Buspirone:          { name: "Buspirone",          isGeneric: true,  ndcPrefix: "00093-1062" },
  Ibuprofen:          { name: "Ibuprofen",          isGeneric: true,  ndcPrefix: "00536-3603" },
  Naproxen:           { name: "Naproxen",           isGeneric: true,  ndcPrefix: "00536-4007" },
  Cyclobenzaprine:    { name: "Cyclobenzaprine",    isGeneric: true,  ndcPrefix: "00378-3560" },
  Gabapentin:         { name: "Gabapentin",         isGeneric: true,  ndcPrefix: "00093-1078" },
  Meloxicam:          { name: "Meloxicam",          isGeneric: true,  ndcPrefix: "00378-1506" },
  Albuterol:          { name: "Albuterol",          isGeneric: true,  ndcPrefix: "59310-0579" },
  Fluticasone:        { name: "Fluticasone",        isGeneric: true,  ndcPrefix: "00173-0719" },
  Montelukast:        { name: "Montelukast",        isGeneric: true,  ndcPrefix: "00006-0711" },
  Prednisone:         { name: "Prednisone",         isGeneric: true,  ndcPrefix: "00054-4742" },
  Tiotropium:         { name: "Tiotropium",         isGeneric: false, ndcPrefix: "00597-0095" },
  Tretinoin:          { name: "Tretinoin",          isGeneric: true,  ndcPrefix: "45802-0099" },
  Clobetasol:         { name: "Clobetasol",         isGeneric: true,  ndcPrefix: "00168-0135" },
  Doxycycline:        { name: "Doxycycline",        isGeneric: true,  ndcPrefix: "00093-3081" },
  Hydroxyzine:        { name: "Hydroxyzine",        isGeneric: true,  ndcPrefix: "00591-0456" },
  Pantoprazole:       { name: "Pantoprazole",       isGeneric: true,  ndcPrefix: "00093-0831" },
  Ondansetron:        { name: "Ondansetron",        isGeneric: true,  ndcPrefix: "00093-0774" },
  Dicyclomine:        { name: "Dicyclomine",        isGeneric: true,  ndcPrefix: "00603-3888" },
  Sucralfate:         { name: "Sucralfate",         isGeneric: true,  ndcPrefix: "00054-3568" },
  Amoxicillin:        { name: "Amoxicillin",        isGeneric: true,  ndcPrefix: "00093-4155" },
  Azithromycin:       { name: "Azithromycin",       isGeneric: true,  ndcPrefix: "00093-7169" },
  Ciprofloxacin:      { name: "Ciprofloxacin",      isGeneric: true,  ndcPrefix: "00093-0875" },
  "Prenatal vitamins":{ name: "Prenatal vitamins",  isGeneric: true,  ndcPrefix: "00067-0154" },
  Progesterone:       { name: "Progesterone",       isGeneric: true,  ndcPrefix: "00143-9697" },
  Colchicine:         { name: "Colchicine",         isGeneric: true,  ndcPrefix: "00603-3340" },
  Hydroxychloroquine: { name: "Hydroxychloroquine", isGeneric: true,  ndcPrefix: "00591-0402" },
  Methotrexate:       { name: "Methotrexate",       isGeneric: true,  ndcPrefix: "00093-1046" },
  Tacrolimus:         { name: "Tacrolimus",         isGeneric: true,  ndcPrefix: "00469-0617" },
  Furosemide:         { name: "Furosemide",         isGeneric: true,  ndcPrefix: "00093-0074" },
};

// Specialty → drug names (expanded to cover all 15 providers)
const SPECIALTY_DRUGS: Record<string, string[]> = {
  "Internal Medicine": ["Lisinopril", "Metformin", "Atorvastatin", "Amlodipine", "Omeprazole", "Eliquis"],
  "Family Medicine":   ["Lisinopril", "Metformin", "Levothyroxine", "Omeprazole", "Sertraline", "Amlodipine"],
  Cardiology:          ["Eliquis", "Xarelto", "Entresto", "Amlodipine", "Metoprolol", "Furosemide"],
  Endocrinology:       ["Metformin", "Jardiance", "Ozempic", "Levothyroxine", "Glipizide"],
  Psychiatry:          ["Sertraline", "Lexapro", "Wellbutrin", "Trazodone", "Buspirone"],
  Orthopedics:         ["Ibuprofen", "Naproxen", "Cyclobenzaprine", "Gabapentin", "Meloxicam"],
  Pulmonology:         ["Albuterol", "Fluticasone", "Montelukast", "Prednisone", "Tiotropium"],
  Dermatology:         ["Tretinoin", "Clobetasol", "Doxycycline", "Hydroxyzine"],
  Gastroenterology:    ["Omeprazole", "Pantoprazole", "Ondansetron", "Dicyclomine", "Sucralfate"],
  "OB/GYN":            ["Prenatal vitamins", "Progesterone", "Metformin", "Levothyroxine", "Sertraline"],
  Pediatrics:          ["Amoxicillin", "Azithromycin", "Albuterol", "Montelukast", "Hydroxyzine"],
  "Urgent Care":       ["Amoxicillin", "Azithromycin", "Ciprofloxacin", "Prednisone", "Ibuprofen"],
  Rheumatology:        ["Colchicine", "Hydroxychloroquine", "Methotrexate", "Prednisone", "Naproxen"],
  Nephrology:          ["Tacrolimus", "Furosemide", "Lisinopril", "Amlodipine", "Metoprolol"],
};

// ─── Payer weights ─────────────────────────────────────────────────────────────

const PAYER_WEIGHTS: Array<{ value: PayerType; weight: number }> = [
  { value: "COMMERCIAL", weight: 50 },
  { value: "MEDICARE",   weight: 25 },
  { value: "MEDICAID",   weight: 15 },
  { value: "CASH",       weight: 10 },
];

// ─── Rx generation ─────────────────────────────────────────────────────────────

// Monthly targets per provider: [oct, nov, dec, jan, feb, mar]
// monthIndex 0 = 5 months ago (Oct 2025), 5 = current month (Mar 2026)
const PROVIDER_MONTHLY_COUNTS: Record<string, number[]> = {
  "1111111111": [20, 22, 24, 26, 28, 30], // Anderson — GROWING
  "2222222222": [18, 18, 19, 18, 19, 18], // Chang — STABLE
  "3333333333": [10, 12, 14, 16, 18, 20], // Torres — GROWING
  "4444444444": [12, 12, 11, 12, 12, 13], // White — STABLE
  "5555555555": [ 6,  7,  8,  9, 10, 11], // Kim — GROWING
  "6666666666": [14, 12, 10,  8,  7,  6], // Green — DECLINING
  "7777777777": [10,  8,  6,  4,  3,  2], // Brown — SHARP DECLINE
  "8888888888": [ 5,  5,  5,  5,  5,  5], // Davis — STABLE
  "9999999999": [ 4,  4,  4,  4,  4,  4], // Miller — STABLE
  "1010101010": [ 0,  0,  0,  0,  8, 10], // Watson — NEW
  "1111222233": [ 0,  5,  8, 10, 12, 14], // Thompson — NEW/GROWING
  "2222333344": [ 6,  6,  6,  6,  6,  6], // Amy Chen — STABLE
  "3333444455": [10, 10, 10, 10, 10, 10], // Brian Lee — STABLE
  "4444555566": [ 3,  4,  5,  6,  7,  8], // Karen Wright — GROWING
  "5555666677": [ 4,  4,  4,  4,  4,  4], // Daniel Park — STABLE
};

interface ProviderConfig {
  npi: string;
  specialty: string;
}

function buildRxBatch(
  orgId: string,
  locationId: string,
  uploadId: string,
  providersMap: Record<string, string>,
  config: ProviderConfig,
  monthIndex: number,   // 0 = 5 months ago
  targetCount: number
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
  if (targetCount === 0) return [];

  const drugNames = SPECIALTY_DRUGS[config.specialty] ?? ["Lisinopril"];
  // monthIndex 0 = 5 months ago (oldest), 5 = current month
  const monthsBack = 5 - monthIndex;
  // Month window in days-ago: monthsBack months ago ± 15 days
  const monthCenterDaysAgo = monthsBack * 30;
  const monthStartDaysAgo  = monthCenterDaysAgo + 15;
  const monthEndDaysAgo    = Math.max(0, monthCenterDaysAgo - 15);

  const records = [];
  for (let i = 0; i < targetCount; i++) {
    const daysBack  = randomBetween(monthEndDaysAgo, monthStartDaysAgo);
    const fillDate  = daysAgo(daysBack);
    // dateOfOrigin is 1–3 days before fillDate
    const originDaysBack = daysBack + randomBetween(1, 3);
    const dateOfOrigin   = daysAgo(originDaysBack);
    const drugName  = pickRandom(drugNames);
    const drug      = ALL_DRUGS[drugName] ?? ALL_DRUGS["Lisinopril"];

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

// ─── Time entry builder ────────────────────────────────────────────────────────

interface StaffTimeConfig {
  userId: string;
  name: string;
  daysPerWeek: 4 | 5;
  skipDayOfWeek?: number;
  avgHoursPerDay: number;
  hasOvertimeWeeks: boolean;
  locationId: string;
}

function buildTimeEntry(
  config: StaffTimeConfig,
  orgId: string,
  workday: Date
) {
  const startMinuteVariant = randomBetween(0, 60);
  const startMinute = startMinuteVariant % 60;
  const actualStartHour = 8 + Math.floor(startMinuteVariant / 60);

  let targetHours = config.avgHoursPerDay;
  if (config.hasOvertimeWeeks && Math.random() < 0.2) {
    targetHours = randomBetween(9, 10);
  }
  const jitterMinutes  = randomBetween(-15, 15);
  const totalMinutes   = Math.round(targetHours * 60) + jitterMinutes;
  const breakMinutes   = 30;
  const workedMinutes  = totalMinutes - breakMinutes;
  const regularHours   = Math.min(8, workedMinutes / 60);
  const overtimeHours  = Math.max(0, workedMinutes / 60 - 8);

  const startTime = dateAtTime(workday, actualStartHour, startMinute);
  const endTime   = new Date(startTime.getTime() + totalMinutes * 60_000);

  return {
    userId: config.userId,
    organizationId: orgId,
    locationId: config.locationId,
    date: workday,
    startTime,
    endTime,
    durationMinutes: totalMinutes,
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    breakMinutes,
    breakType: "UNPAID" as const,
    isClockIn: true,
  };
}

// ─── Schedule entry builder ────────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface StaffDef {
  employeeId: string;
  employeeName: string;
  role: string;
  daysOff?: string[];
}

function buildScheduleEntries(
  scheduleId: string,
  staff: StaffDef[],
  weekVariant: number
) {
  const startTimes = ["8:00 AM", "8:30 AM", "9:00 AM", "8:00 AM", "8:30 AM", "9:00 AM", "8:00 AM", "8:30 AM"];
  const endTimes   = ["4:00 PM", "4:30 PM", "5:00 PM", "4:00 PM", "5:00 PM", "4:30 PM", "4:00 PM", "5:00 PM"];
  const startTime  = startTimes[weekVariant % startTimes.length];
  const endTime    = endTimes[weekVariant % endTimes.length];

  const entries = [];
  for (const member of staff) {
    for (const day of DAYS_OF_WEEK) {
      const isOff = member.daysOff?.includes(day) ?? false;
      entries.push({
        scheduleId,
        employeeId: member.employeeId,
        employeeName: member.employeeName,
        day,
        available: !isOff,
        startTime: isOff ? "Off" : startTime,
        endTime:   isOff ? "Off" : endTime,
        role: member.role,
      });
    }
  }
  return entries;
}

// ─── Batch insert helper ───────────────────────────────────────────────────────

async function batchInsert<T>(
  label: string,
  items: T[],
  batchSize: number,
  insertFn: (batch: T[]) => Promise<void>
): Promise<void> {
  let done = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await insertFn(batch);
    done += batch.length;
    process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
  }
  process.stdout.write("\n");
}

// ─── Patient data ──────────────────────────────────────────────────────────────

const FAKE_PATIENTS = [
  { firstName: "Robert",      lastName: "Nguyen",     phone: "5185550101", dob: "1968-03-14" },
  { firstName: "Mary",        lastName: "Thompson",   phone: "5185550102", dob: "1975-07-22" },
  { firstName: "James",       lastName: "Rodriguez",  phone: "5185550103", dob: "1952-11-05" },
  { firstName: "Patricia",    lastName: "Williams",   phone: "5185550104", dob: "1983-01-30" },
  { firstName: "Michael",     lastName: "Brown",      phone: "5185550105", dob: "1944-06-18" },
  { firstName: "Linda",       lastName: "Jones",      phone: "5185550106", dob: "1990-09-03" },
  { firstName: "William",     lastName: "Garcia",     phone: "5185550107", dob: "1961-04-27" },
  { firstName: "Barbara",     lastName: "Miller",     phone: "5185550108", dob: "1978-12-11" },
  { firstName: "David",       lastName: "Davis",      phone: "5185550109", dob: "1955-08-07" },
  { firstName: "Susan",       lastName: "Wilson",     phone: "5185550110", dob: "1987-02-19" },
  { firstName: "Richard",     lastName: "Moore",      phone: "5185550111", dob: "1970-05-15" },
  { firstName: "Jessica",     lastName: "Taylor",     phone: "5185550112", dob: "1995-10-23" },
  { firstName: "Thomas",      lastName: "Anderson",   phone: "5185550113", dob: "1948-07-09" },
  { firstName: "Sarah",       lastName: "Thomas",     phone: "5185550114", dob: "1982-03-28" },
  { firstName: "Charles",     lastName: "Jackson",    phone: "5185550115", dob: "1965-11-14" },
  { firstName: "Karen",       lastName: "White",      phone: "5185550116", dob: "1973-06-02" },
  { firstName: "Christopher", lastName: "Harris",     phone: "5185550117", dob: "1991-08-30" },
  { firstName: "Nancy",       lastName: "Martin",     phone: "5185550118", dob: "1957-04-16" },
  { firstName: "Matthew",     lastName: "Thompson",   phone: "5185550119", dob: "1986-01-07" },
  { firstName: "Betty",       lastName: "Lee",        phone: "5185550120", dob: "1943-09-25" },
  { firstName: "Daniel",      lastName: "Perez",      phone: "5185550121", dob: "1979-05-10" },
  { firstName: "Angela",      lastName: "Robinson",   phone: "5185550122", dob: "1963-11-29" },
  { firstName: "Donald",      lastName: "Clark",      phone: "5185550123", dob: "1958-03-17" },
  { firstName: "Lisa",        lastName: "Walker",     phone: "5185550124", dob: "1993-07-04" },
  { firstName: "Kevin",       lastName: "Hall",       phone: "5185550125", dob: "1985-09-22" },
];

// ─── Provider name map (for prescription events) ───────────────────────────────

const PROVIDER_NAMES: Record<string, string> = {
  "1111111111": "Dr. Robert Anderson",
  "2222222222": "Dr. Lisa Chang",
  "3333333333": "Dr. Michael Torres",
  "4444444444": "Dr. Jennifer White",
  "5555555555": "Dr. David Kim",
  "6666666666": "Dr. Rachel Green",
  "7777777777": "Dr. William Brown",
  "8888888888": "Dr. Sarah Davis",
  "9999999999": "Dr. James Miller",
  "1010101010": "Dr. Emily Watson",
  "1111222233": "Dr. Mark Thompson",
  "2222333344": "Dr. Amy Chen",
  "3333444455": "Dr. Brian Lee",
  "4444555566": "Dr. Karen Wright",
  "5555666677": "Dr. Daniel Park",
};

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.argv.includes("--force")) {
    console.error("This will DELETE and re-create Valley Health Pharmacy data.");
    console.error("Run with --force to proceed:");
    console.error("  npx tsx prisma/seed-fresh-demo.ts --force");
    process.exit(1);
  }

  const prisma = createPrismaClient();

  console.log("\nRxDesk — Fresh demo seed for Valley Health Pharmacy");
  console.log("====================================================");

  // ─── Step 1: Find and delete Valley Health Pharmacy data ──────────────────────

  console.log("\n[1/12] Finding Valley Health Pharmacy org...");

  const vhOrg = await prisma.organization.findFirst({
    where: { name: "Valley Health Pharmacy" },
  });

  if (vhOrg) {
    console.log(`  Found org: ${vhOrg.id}. Deleting all data...`);

    // Delete in FK-safe reverse order
    // DrugRepVisitProvider → DrugRepVisit
    const vhVisits = await prisma.drugRepVisit.findMany({
      where: { organizationId: vhOrg.id },
      select: { id: true },
    });
    const vhVisitIds = vhVisits.map((v) => v.id);
    if (vhVisitIds.length > 0) {
      await prisma.drugRepVisitProvider.deleteMany({
        where: { drugRepVisitId: { in: vhVisitIds } },
      });
    }
    await prisma.drugRepVisit.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.drugRep.deleteMany({ where: { organizationId: vhOrg.id } });

    // PatientNotification → PrescriptionEvent → Patient
    await prisma.patientNotification.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.prescriptionEvent.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.patient.deleteMany({ where: { organizationId: vhOrg.id } });

    // Notification templates
    await prisma.notificationTemplate.deleteMany({ where: { organizationId: vhOrg.id } });

    // Schedule entries + comments are cascade from WeeklySchedule
    await prisma.weeklySchedule.deleteMany({ where: { organizationId: vhOrg.id } });

    // Prescription records + uploads
    await prisma.prescriptionRecord.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.prescriptionUpload.deleteMany({ where: { organizationId: vhOrg.id } });

    // Providers
    await prisma.provider.deleteMany({ where: { organizationId: vhOrg.id } });

    // Time tracking
    await prisma.timeEntry.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.timesheet.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.ptoRequest.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.shiftSwapRequest.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.shiftAssignment.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.availabilityPreference.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.availabilityOverride.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.payRate.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.payrollExport.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.department.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.scheduleTemplate.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.coverageRequirement.deleteMany({ where: { organizationId: vhOrg.id } });

    // User-related
    await prisma.permission.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.invite.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.auditLog.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.notification.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.pmsConnection.deleteMany({ where: { organizationId: vhOrg.id } });

    // UserLocation — need user IDs first
    const vhUsers = await prisma.user.findMany({
      where: { organizationId: vhOrg.id },
      select: { id: true },
    });
    const vhUserIds = vhUsers.map((u) => u.id);
    if (vhUserIds.length > 0) {
      await prisma.userLocation.deleteMany({ where: { userId: { in: vhUserIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: vhUserIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: vhUserIds } } });
    }

    await prisma.user.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.location.deleteMany({ where: { organizationId: vhOrg.id } });
    await prisma.organization.delete({ where: { id: vhOrg.id } });

    console.log("  Deleted all Valley Health Pharmacy data.");
  } else {
    console.log("  No existing Valley Health Pharmacy org found — starting fresh.");
  }

  // ─── Step 2: Organization ──────────────────────────────────────────────────────

  console.log("\n[2/12] Creating organization...");

  const org = await prisma.organization.create({
    data: {
      name: "Valley Health Pharmacy",
      timezone: "America/New_York",
      plan: "GROWTH",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`  Created org: ${org.id}`);

  // ─── Step 3: Locations ─────────────────────────────────────────────────────────

  console.log("\n[3/12] Creating locations...");

  const mainStreet = await prisma.location.create({
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

  const westside = await prisma.location.create({
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

  console.log(`  Main Street: ${mainStreet.id}`);
  console.log(`  Westside:    ${westside.id}`);

  // ─── Step 4: Users ─────────────────────────────────────────────────────────────

  console.log("\n[4/12] Creating users...");

  const passwordHash = await bcrypt.hash("password123", 12);

  interface UserDef {
    name: string;
    email: string;
    role: Role;
    locationId: string;
    isFieldRep?: boolean;
  }

  const userDefs: UserDef[] = [
    { name: "Sarah Chen",     email: "sarah@valleyhealth.com",  role: "OWNER",       locationId: mainStreet.id },
    { name: "Diego Martinez", email: "diego@valleyhealth.com",  role: "PHARMACIST",  locationId: mainStreet.id },
    { name: "Priya Patel",    email: "priya@valleyhealth.com",  role: "PHARMACIST",  locationId: westside.id   },
    { name: "Marcus Johnson", email: "marcus@valleyhealth.com", role: "TECHNICIAN",  locationId: mainStreet.id },
    { name: "Mei Lin",        email: "mei@valleyhealth.com",    role: "TECHNICIAN",  locationId: westside.id   },
    { name: "James Wilson",   email: "james@valleyhealth.com",  role: "TECHNICIAN",  locationId: mainStreet.id },
    // Drug Reps — DRUG_REP role, only see visit log
    { name: "Alex Rivera",    email: "alex@valleyhealth.com",   role: "DRUG_REP",    locationId: mainStreet.id, isFieldRep: true },
    { name: "Jordan Blake",   email: "jordan@valleyhealth.com", role: "DRUG_REP",    locationId: westside.id,   isFieldRep: true },
  ];

  const createdUsers: Array<{ id: string; email: string; role: Role; isFieldRep: boolean }> = [];

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
    createdUsers.push({ id: user.id, email: user.email, role: def.role, isFieldRep: def.isFieldRep ?? false });
  }

  console.log(`  Created ${createdUsers.length} users.`);

  // ─── Step 5: Permissions ───────────────────────────────────────────────────────

  console.log("\n[5/12] Creating permissions...");

  const permissionData: Array<{
    userId: string;
    organizationId: string;
    module: Module;
    access: Access;
  }> = [];

  for (const user of createdUsers) {
    const basePerms = getDefaultPermissions(user.role);
    for (const perm of basePerms) {
      const access: Access = perm.access;
      permissionData.push({
        userId: user.id,
        organizationId: org.id,
        module: perm.module,
        access,
      });
    }
  }

  await prisma.permission.createMany({ data: permissionData });
  console.log(`  Created ${permissionData.length} permission records.`);

  // ─── Step 6: Providers ─────────────────────────────────────────────────────────

  console.log("\n[6/12] Creating 15 providers...");

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
    { npi: "1111111111", firstName: "Robert",   lastName: "Anderson", suffix: "MD", specialty: "Internal Medicine", practiceName: "Albany Medical Group",      tags: ["high-value"]           },
    { npi: "2222222222", firstName: "Lisa",     lastName: "Chang",    suffix: "MD", specialty: "Family Medicine",   practiceName: "Capital Family Practice",    tags: ["high-value"]           },
    { npi: "3333333333", firstName: "Michael",  lastName: "Torres",   suffix: "MD", specialty: "Cardiology",        practiceName: "Heart Care Associates",      tags: ["high-value"]           },
    { npi: "4444444444", firstName: "Jennifer", lastName: "White",    suffix: "MD", specialty: "Endocrinology",     practiceName: "Albany Endocrine Center",    tags: []                       },
    { npi: "5555555555", firstName: "David",    lastName: "Kim",      suffix: "MD", specialty: "Psychiatry",        practiceName: "MindWell Clinic",            tags: []                       },
    { npi: "6666666666", firstName: "Rachel",   lastName: "Green",    suffix: "MD", specialty: "Orthopedics",       practiceName: "Albany Bone & Joint",        tags: ["declining"]            },
    { npi: "7777777777", firstName: "William",  lastName: "Brown",    suffix: "MD", specialty: "Pulmonology",       practiceName: "Lung Care Associates",       tags: ["declining"]            },
    { npi: "8888888888", firstName: "Sarah",    lastName: "Davis",    suffix: "MD", specialty: "Dermatology",       practiceName: "Clear Skin Dermatology",     tags: []                       },
    { npi: "9999999999", firstName: "James",    lastName: "Miller",   suffix: "MD", specialty: "Gastroenterology",  practiceName: "GI Associates",              tags: []                       },
    { npi: "1010101010", firstName: "Emily",    lastName: "Watson",   suffix: "MD", specialty: "OB/GYN",            practiceName: "Women's Health Albany",      tags: ["new"]                  },
    { npi: "1111222233", firstName: "Mark",     lastName: "Thompson", suffix: "MD", specialty: "Family Medicine",   practiceName: "Thompson Family Care",       tags: ["new"]                  },
    { npi: "2222333344", firstName: "Amy",      lastName: "Chen",     suffix: "MD", specialty: "Pediatrics",        practiceName: "Albany Pediatrics",          tags: []                       },
    { npi: "3333444455", firstName: "Brian",    lastName: "Lee",      suffix: "MD", specialty: "Urgent Care",       practiceName: "Capital Urgent Care",        tags: []                       },
    { npi: "4444555566", firstName: "Karen",    lastName: "Wright",   suffix: "MD", specialty: "Rheumatology",      practiceName: "Albany Rheumatology",        tags: []                       },
    { npi: "5555666677", firstName: "Daniel",   lastName: "Park",     suffix: "MD", specialty: "Nephrology",        practiceName: "Kidney Care Associates",     tags: []                       },
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

  console.log(`  Created ${createdProviders.length} providers.`);

  // ─── Step 7: Prescription records (~2,000) ─────────────────────────────────────

  console.log("\n[7/12] Generating ~2,000 prescription records (6 months)...");

  const sarahUser = createdUsers.find((u) => u.email === "sarah@valleyhealth.com")!;

  const upload = await prisma.prescriptionUpload.create({
    data: {
      organizationId: org.id,
      locationId: mainStreet.id,
      uploadedById: sarahUser.id,
      fileName: "valley_health_rx_6month_export.csv",
      rowCount: 0,
      dateRangeStart: daysAgo(180),
      dateRangeEnd: new Date(),
      status: "COMPLETED",
    },
  });

  const providerConfigs: ProviderConfig[] = providerDefs.map((d) => ({
    npi: d.npi,
    specialty: d.specialty,
  }));

  type RxRecord = ReturnType<typeof buildRxBatch>[0];
  const allRxRecords: RxRecord[] = [];

  for (const config of providerConfigs) {
    const monthlyCounts = PROVIDER_MONTHLY_COUNTS[config.npi] ?? [5, 5, 5, 5, 5, 5];
    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
      const baseCount = monthlyCounts[monthIndex];
      // ±10% jitter
      const jitter = Math.round(baseCount * (Math.random() * 0.2 - 0.1));
      const count  = Math.max(0, baseCount + jitter);
      const batch  = buildRxBatch(
        org.id,
        mainStreet.id,
        upload.id,
        providersMap,
        config,
        monthIndex,
        count
      );
      allRxRecords.push(...batch);
    }
  }

  await batchInsert("Rx records", allRxRecords, 200, async (batch) => {
    await prisma.prescriptionRecord.createMany({ data: batch });
  });

  await prisma.prescriptionUpload.update({
    where: { id: upload.id },
    data: { rowCount: allRxRecords.length },
  });

  console.log(`  Total: ${allRxRecords.length} prescription records.`);

  // ─── Step 8: Field rep DrugRep stubs + visits ──────────────────────────────────

  // The DrugRepVisit table still uses drugRepId (FK to DrugRep). Field reps are
  // pharmacy employees, so we create a "stub" DrugRep record per field rep user
  // to satisfy the FK. The visit notes encode the pharmacy context.

  console.log("\n[8/12] Creating field rep stubs and visit log...");

  const alexUser   = createdUsers.find((u) => u.email === "alex@valleyhealth.com")!;
  const jordanUser = createdUsers.find((u) => u.email === "jordan@valleyhealth.com")!;

  const [alexRep, jordanRep] = await Promise.all([
    prisma.drugRep.create({
      data: {
        organizationId: org.id,
        firstName: "Alex",
        lastName: "Rivera",
        company: "Valley Health Pharmacy",
        email: "alex@valleyhealth.com",
        territory: "Main Street territory",
        notes: "Pharmacy field rep — visits doctor offices on behalf of Valley Health",
      },
    }),
    prisma.drugRep.create({
      data: {
        organizationId: org.id,
        firstName: "Jordan",
        lastName: "Blake",
        company: "Valley Health Pharmacy",
        email: "jordan@valleyhealth.com",
        territory: "Westside territory",
        notes: "Pharmacy field rep — visits doctor offices on behalf of Valley Health",
      },
    }),
  ]);

  // Time range options
  const TIME_RANGES = [
    "9:00 AM – 11:00 AM",
    "10:00 AM – 12:00 PM",
    "11:30 AM – 1:00 PM",
    "1:00 PM – 3:00 PM",
  ];

  function buildVisitNotes(
    timeRange: string,
    hasLunch: boolean,
    body: string
  ): string {
    return `[${timeRange}] [Lunch: ${hasLunch ? "Yes" : "No"}]\n${body}`;
  }

  interface FieldRepVisitDef {
    repId: string;
    loggedById: string;
    visitDaysAgo: number;
    providerNpis: string[];
    locationId: string;
    notes: string;
  }

  // Alex's territory: Anderson, Torres, Kim, Watson, Thompson, Wright
  // Jordan's territory: Chang, White, Green, Brown, Davis, Miller, Lee, Park
  // 15 visits each, spread over 6 months (~every 12 days on average)

  const fieldRepVisits: FieldRepVisitDef[] = [
    // ── Alex Rivera (15 visits) ─────────────────────────────────────────────────
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 175,
      providerNpis: ["1111111111"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Visited Albany Medical Group. Introduced Valley Health's compounding services to Dr. Anderson. Left brochures and contact cards for his MA team."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 162,
      providerNpis: ["3333333333"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Met with Heart Care Associates front desk and Dr. Torres briefly. Discussed same-day compounding turnaround for cardiac patients. He expressed interest."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 148,
      providerNpis: ["1111111111", "5555555555"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "10:00 AM – 12:00 PM", true,
        "Lunch visit to Albany Medical Group and MindWell Clinic (same building complex). Dr. Anderson confirmed 3 new patients sent to us this month. Spoke with Dr. Kim's MA about psychiatric compounding options."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 135,
      providerNpis: ["4444555566"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "First visit to Albany Rheumatology — Dr. Wright is new to our outreach. Discussed methotrexate monitoring programs and adherence packaging. Left samples of our blister-pack service."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 122,
      providerNpis: ["1111111111"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "11:30 AM – 1:00 PM", true,
        "Lunch for Dr. Anderson's full office team (8 staff). Reviewed Q3 referral numbers — up 22% vs. prior quarter. Dr. Anderson asked about our medication synchronization program."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 109,
      providerNpis: ["3333333333"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Follow-up with Heart Care Associates. Dr. Torres confirmed switching 5 Eliquis patients to us from a competitor pharmacy. Discussed prior auth support services."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 95,
      providerNpis: ["1010101010"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "9:00 AM – 11:00 AM", false,
        "First visit to Women's Health Albany — Dr. Watson recently joined the network. Introduced our prenatal vitamin program and OB compounding capabilities. Very receptive, agreed to route new patients to us."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 82,
      providerNpis: ["1111222233"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "10:00 AM – 12:00 PM", true,
        "Lunch at Thompson Family Care. Dr. Thompson sees high volume of new patients. Discussed our 90-day refill program and free delivery service. He agreed to mention us at new patient intake."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 68,
      providerNpis: ["4444555566"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Second visit to Albany Rheumatology. Dr. Wright has sent 6 patients over the past month. Discussed specialty compounding for topical anti-inflammatories. Very positive interaction."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 55,
      providerNpis: ["1111111111", "3333333333"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "11:30 AM – 1:00 PM", true,
        "Shared quarterly summary with both Albany Medical Group and Heart Care Associates (neighboring offices). Anderson referrals up 30% YOY. Torres asked about Entresto prior auth process — provided direct contact to our insurance team."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 41,
      providerNpis: ["1010101010"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "9:00 AM – 11:00 AM", false,
        "Follow-up with Dr. Watson. She is now sending all her OB patients to us — average 8–10 new per month. Dropped off updated prenatal vitamin formulary and discussed postpartum compounding options."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 28,
      providerNpis: ["1111222233"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "10:00 AM – 12:00 PM", true,
        "Lunch visit to Thompson Family Care. Referral volume now at 14/month and growing. Dr. Thompson asked about compounding for pediatric flavor customization. Following up with our compounding team."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 16,
      providerNpis: ["5555555555"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Visit to MindWell Clinic. Dr. Kim now sending psychiatric patients to us consistently. Discussed our adherence packaging for complex multi-drug regimens — he showed strong interest."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 7,
      providerNpis: ["1111111111"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "11:30 AM – 1:00 PM", true,
        "Monthly lunch at Albany Medical Group. Discussed upcoming formulary changes. Dr. Anderson requested we present to his practice at their next staff meeting. Scheduled for next month."
      ),
    },
    {
      repId: alexRep.id,
      loggedById: alexUser.id,
      visitDaysAgo: 2,
      providerNpis: ["4444555566"],
      locationId: mainStreet.id,
      notes: buildVisitNotes(
        "9:00 AM – 11:00 AM", false,
        "Third visit to Albany Rheumatology. Dr. Wright is now a consistent referrer — 8 patients this month. Discussed expanding to include infusion referrals. Positive momentum."
      ),
    },

    // ── Jordan Blake (15 visits) ────────────────────────────────────────────────
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 178,
      providerNpis: ["2222222222"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "10:00 AM – 12:00 PM", true,
        "Lunch visit to Capital Family Practice. Dr. Chang has a large established panel. Introduced Valley Health's free delivery and auto-refill program. She agreed to recommend us to patients who need convenience."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 165,
      providerNpis: ["4444444444"],
      locationId: westside.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Visit to Albany Endocrine Center. Dr. White specializes in diabetes and thyroid — high refill volume. Discussed our medication synchronization program and Ozempic/GLP-1 prior auth support. Very interested."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 151,
      providerNpis: ["6666666666"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "9:00 AM – 11:00 AM", false,
        "Visit to Albany Bone & Joint. Dr. Green's volume has been declining — she mentioned several patients moved to a mail-order pharmacy. Presented our competitive pricing on Meloxicam and Gabapentin. Left price comparison sheet."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 138,
      providerNpis: ["7777777777"],
      locationId: westside.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Visit to Lung Care Associates. Dr. Brown's referral volume has dropped significantly. He mentioned moving patients to a specialty mail-order. Will need additional follow-ups to reverse the trend."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 124,
      providerNpis: ["2222222222", "4444444444"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "11:30 AM – 1:00 PM", true,
        "Joint lunch for Capital Family Practice and Albany Endocrine Center (same office complex). Both Dr. Chang and Dr. White were present. Discussed new GLP-1 patient education materials we can co-brand. Strong positive response."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 110,
      providerNpis: ["8888888888"],
      locationId: westside.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Visit to Clear Skin Dermatology. Dr. Davis is stable — consistent low volume. Discussed our dermatology compounding options (topical formulations). She expressed interest in custom compound for one specific patient."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 97,
      providerNpis: ["3333444455"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "10:00 AM – 12:00 PM", true,
        "Lunch at Capital Urgent Care. Dr. Lee sees high patient volume with acute prescriptions. Discussed our rapid dispensing for acute scripts and same-day availability. He's happy with current arrangement — maintaining relationship."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 84,
      providerNpis: ["6666666666"],
      locationId: westside.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Follow-up at Albany Bone & Joint. Dr. Green's volume still declining. She confirmed some patients prefer PillPack. Discussed our own adherence packaging option — she was unaware we offered it. Will try re-routing select patients."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 70,
      providerNpis: ["9999999999"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "9:00 AM – 11:00 AM", false,
        "Visit to GI Associates. Dr. Miller is stable — mainly GI meds with consistent refill patterns. Confirmed he's happy with our service. Dropped off updated formulary for pantoprazole and ondansetron."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 56,
      providerNpis: ["4444444444"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "11:30 AM – 1:00 PM", true,
        "Lunch at Albany Endocrine Center. Dr. White is our highest-volume endocrinology referrer. Reviewed GLP-1 patient cohort — 12 active Ozempic patients now on our auto-refill. Discussed upcoming Mounjaro formulary coverage."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 43,
      providerNpis: ["5555666677"],
      locationId: westside.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Visit to Kidney Care Associates. Dr. Park prescribes specialty immunosuppressants. Discussed our capabilities for tacrolimus and compounding for renal patients. He noted our pricing is competitive. Relationship in good standing."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 30,
      providerNpis: ["2222222222"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "10:00 AM – 12:00 PM", true,
        "Monthly visit to Capital Family Practice. Dr. Chang's patient volume remains high and stable. Reviewed our new app for patients to request refills via text. She's willing to share our contact info at checkout."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 18,
      providerNpis: ["7777777777"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "9:00 AM – 11:00 AM", false,
        "Second follow-up at Lung Care Associates to address declining volume. Dr. Brown confirmed a few patients have returned after mail-order fulfillment issues. Small positive sign. Continuing monthly outreach."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 9,
      providerNpis: ["3333444455"],
      locationId: westside.id,
      notes: buildVisitNotes(
        "10:00 AM – 12:00 PM", true,
        "Lunch with Capital Urgent Care team. Dr. Lee confirmed they refer about 10 acute-fill patients to us per month consistently. Asked about our urgent compounding timeline — confirmed same-day for most preparations."
      ),
    },
    {
      repId: jordanRep.id,
      loggedById: jordanUser.id,
      visitDaysAgo: 3,
      providerNpis: ["8888888888"],
      locationId: westside.id,
      notes: buildVisitNotes(
        pickRandom(TIME_RANGES), Math.random() < 0.6,
        "Visit to Clear Skin Dermatology. Custom topical compound we prepared for Dr. Davis's patient was well-received. She's now considering us for other specialty dermatology compounds. Delivered compound specs brochure."
      ),
    },
  ];

  let visitsCreated = 0;
  for (const def of fieldRepVisits) {
    const visit = await prisma.drugRepVisit.create({
      data: {
        organizationId: org.id,
        locationId: def.locationId,
        drugRepId: def.repId,
        visitDate: daysAgo(def.visitDaysAgo),
        durationMinutes: pickRandom([60, 90, 120]),
        drugsPromoted: [],
        samplesLeft: [],
        notes: def.notes,
        loggedById: def.loggedById,
      },
    });

    const visitProviders = def.providerNpis
      .filter((npi) => providersMap[npi])
      .map((npi) => ({ drugRepVisitId: visit.id, providerId: providersMap[npi] }));

    if (visitProviders.length > 0) {
      await prisma.drugRepVisitProvider.createMany({ data: visitProviders });
    }
    visitsCreated++;
  }

  console.log(`  Created ${visitsCreated} field rep visit logs.`);

  // ─── Step 9: Time entries (6 months, users 1–6 only — not field reps) ──────────

  console.log("\n[9/12] Generating time entries for 6 months...");

  const userByEmail: Record<string, typeof createdUsers[0]> = {};
  for (const u of createdUsers) userByEmail[u.email] = u;

  const sarah   = userByEmail["sarah@valleyhealth.com"];
  const diego   = userByEmail["diego@valleyhealth.com"];
  const priya   = userByEmail["priya@valleyhealth.com"];
  const marcus  = userByEmail["marcus@valleyhealth.com"];
  const mei     = userByEmail["mei@valleyhealth.com"];
  const james   = userByEmail["james@valleyhealth.com"];

  const staffTimeConfigs: StaffTimeConfig[] = [
    { userId: sarah.id,  name: "Sarah",  daysPerWeek: 5,  avgHoursPerDay: 8.5, hasOvertimeWeeks: true,  locationId: mainStreet.id },
    { userId: diego.id,  name: "Diego",  daysPerWeek: 5,  avgHoursPerDay: 8,   hasOvertimeWeeks: false, locationId: mainStreet.id },
    { userId: priya.id,  name: "Priya",  daysPerWeek: 4,  skipDayOfWeek: 3,    avgHoursPerDay: 8,   hasOvertimeWeeks: false, locationId: westside.id   },
    { userId: marcus.id, name: "Marcus", daysPerWeek: 5,  avgHoursPerDay: 7.75,hasOvertimeWeeks: false, locationId: mainStreet.id },
    { userId: mei.id,    name: "Mei",    daysPerWeek: 5,  avgHoursPerDay: 7.75,hasOvertimeWeeks: false, locationId: westside.id   },
    { userId: james.id,  name: "James",  daysPerWeek: 4,  skipDayOfWeek: 5,    avgHoursPerDay: 8,   hasOvertimeWeeks: false, locationId: mainStreet.id },
  ];

  const sixMonthsAgo = daysAgo(180);
  const today        = new Date();
  today.setHours(0, 0, 0, 0);
  const allWorkdays  = getWorkdays(sixMonthsAgo, today);

  type TimeEntryRecord = ReturnType<typeof buildTimeEntry>;
  const allTimeEntries: TimeEntryRecord[] = [];

  for (const staffConfig of staffTimeConfigs) {
    for (const workday of allWorkdays) {
      if (staffConfig.skipDayOfWeek !== undefined && workday.getDay() === staffConfig.skipDayOfWeek) continue;
      const entry = buildTimeEntry(staffConfig, org.id, workday);
      allTimeEntries.push(entry);
    }
  }

  await batchInsert("Time entries", allTimeEntries, 100, async (batch) => {
    await prisma.timeEntry.createMany({ data: batch });
  });

  console.log(`  Total: ${allTimeEntries.length} time entries.`);

  // ─── Step 10: Weekly schedules (last 8 weeks) ──────────────────────────────────

  console.log("\n[10/12] Creating weekly schedules (last 8 weeks, 2 locations)...");

  const mondays = getLastNMondays(8);

  const mainStreetStaff: StaffDef[] = [
    { employeeId: sarah.id,  employeeName: "Sarah Chen",     role: "Pharmacist"  },
    { employeeId: diego.id,  employeeName: "Diego Martinez", role: "Pharmacist"  },
    { employeeId: marcus.id, employeeName: "Marcus Johnson", role: "Technician"  },
    { employeeId: james.id,  employeeName: "James Wilson",   role: "Technician", daysOff: ["Friday"] },
  ];

  const westsideStaff: StaffDef[] = [
    { employeeId: priya.id, employeeName: "Priya Patel", role: "Pharmacist", daysOff: ["Wednesday"] },
    { employeeId: mei.id,   employeeName: "Mei Lin",     role: "Technician"  },
  ];

  let schedulesCreated = 0;
  let scheduleEntriesCreated = 0;

  for (let weekIdx = 0; weekIdx < mondays.length; weekIdx++) {
    const monday     = mondays[weekIdx];
    const weekStart  = toISODate(monday);
    const finalizedAt = new Date(monday.getTime() - 2 * 24 * 60 * 60_000);

    for (const locationDef of [
      { location: mainStreet, staff: mainStreetStaff },
      { location: westside,   staff: westsideStaff   },
    ]) {
      const existing = await prisma.weeklySchedule.findUnique({
        where: { locationId_weekStart: { locationId: locationDef.location.id, weekStart } },
      });
      if (existing) continue;

      const schedule = await prisma.weeklySchedule.create({
        data: {
          organizationId: org.id,
          locationId: locationDef.location.id,
          weekStart,
          status: "Finalized",
          finalizedAt,
          lastUpdated: finalizedAt,
        },
      });

      const entries = buildScheduleEntries(schedule.id, locationDef.staff, weekIdx);
      await prisma.scheduleEntry.createMany({ data: entries });

      schedulesCreated++;
      scheduleEntriesCreated += entries.length;
    }
  }

  console.log(`  Created ${schedulesCreated} schedules, ${scheduleEntriesCreated} schedule entries.`);

  // ─── Step 11: PTO requests ─────────────────────────────────────────────────────

  console.log("\n[11/12] Creating PTO requests...");

  interface PtoRequestDef {
    employeeId: string;
    startDate: Date;
    endDate: Date;
    type: "VACATION" | "SICK" | "PERSONAL";
    status: "APPROVED" | "PENDING" | "DENIED";
    note: string;
    reviewedById?: string;
    reviewedAt?: Date;
    responseNote?: string;
  }

  const ptoRequests: PtoRequestDef[] = [
    // Approved vacations
    {
      employeeId: diego.id, startDate: daysAgo(155), endDate: daysAgo(151),
      type: "VACATION", status: "APPROVED", note: "Family trip to Puerto Rico",
      reviewedById: sarah.id, reviewedAt: daysAgo(162),
    },
    {
      employeeId: priya.id, startDate: daysAgo(120), endDate: daysAgo(116),
      type: "VACATION", status: "APPROVED", note: "Wedding anniversary trip",
      reviewedById: sarah.id, reviewedAt: daysAgo(128),
    },
    {
      employeeId: marcus.id, startDate: daysAgo(90), endDate: daysAgo(88),
      type: "VACATION", status: "APPROVED", note: "Family visit out of state",
      reviewedById: sarah.id, reviewedAt: daysAgo(97),
    },
    {
      employeeId: james.id, startDate: daysAgo(60), endDate: daysAgo(56),
      type: "VACATION", status: "APPROVED", note: "Spring break with kids",
      reviewedById: sarah.id, reviewedAt: daysAgo(67),
    },
    // Approved sick days
    {
      employeeId: mei.id, startDate: daysAgo(140), endDate: daysAgo(140),
      type: "SICK", status: "APPROVED", note: "Not feeling well — fever",
      reviewedById: sarah.id, reviewedAt: daysAgo(140),
    },
    {
      employeeId: priya.id, startDate: daysAgo(75), endDate: daysAgo(75),
      type: "SICK", status: "APPROVED", note: "Migraine",
      reviewedById: sarah.id, reviewedAt: daysAgo(75),
    },
    {
      employeeId: diego.id, startDate: daysAgo(30), endDate: daysAgo(30),
      type: "SICK", status: "APPROVED", note: "Stomach bug",
      reviewedById: sarah.id, reviewedAt: daysAgo(30),
    },
    // Approved personal days
    {
      employeeId: marcus.id, startDate: daysAgo(45), endDate: daysAgo(45),
      type: "PERSONAL", status: "APPROVED", note: "Home repair appointment",
      reviewedById: sarah.id, reviewedAt: daysAgo(50),
    },
    {
      employeeId: james.id, startDate: daysAgo(20), endDate: daysAgo(20),
      type: "PERSONAL", status: "APPROVED", note: "Child's school event",
      reviewedById: sarah.id, reviewedAt: daysAgo(25),
    },
    // Pending (upcoming)
    {
      employeeId: priya.id, startDate: daysFromNow(14), endDate: daysFromNow(18),
      type: "VACATION", status: "PENDING", note: "Summer vacation — Adirondacks",
    },
    {
      employeeId: mei.id, startDate: daysFromNow(21), endDate: daysFromNow(21),
      type: "PERSONAL", status: "PENDING", note: "Medical appointment",
    },
    // Denied
    {
      employeeId: james.id, startDate: daysAgo(50), endDate: daysAgo(46),
      type: "VACATION", status: "DENIED", note: "Vacation request",
      reviewedById: sarah.id, reviewedAt: daysAgo(55),
      responseNote: "Insufficient coverage during this period — please reschedule.",
    },
  ];

  await prisma.ptoRequest.createMany({
    data: ptoRequests.map((r) => ({
      organizationId: org.id,
      employeeId: r.employeeId,
      startDate: r.startDate,
      endDate: r.endDate,
      type: r.type,
      status: r.status,
      note: r.note,
      reviewedById: r.reviewedById,
      reviewedAt: r.reviewedAt,
      responseNote: r.responseNote,
      submittedAt: r.reviewedAt
        ? new Date(r.reviewedAt.getTime() - 5 * 24 * 60 * 60_000)
        : new Date(),
    })),
  });

  console.log(`  Created ${ptoRequests.length} PTO requests.`);

  // ─── Step 12: Patients + Prescription events ───────────────────────────────────

  console.log("\n[12/12] Creating 25 patients and 250 prescription events...");

  const createdPatients = await Promise.all(
    FAKE_PATIENTS.map((p) =>
      prisma.patient.create({
        data: {
          organizationId: org.id,
          locationId: mainStreet.id,
          externalId: `EXT-${p.phone}`,
          firstName: p.firstName,
          lastName: p.lastName,
          phone: p.phone,
          dateOfBirth: new Date(p.dob),
          smsOptIn: Math.random() > 0.2,
          emailOptIn: Math.random() > 0.5,
          preferredChannel: "SMS",
          isActive: true,
        },
      })
    )
  );

  type EventType =
    | "RX_NEW"
    | "RX_FILLED"
    | "RX_READY"
    | "RX_PICKED_UP"
    | "RX_REFILL_DUE"
    | "RX_CANCELLED";

  const EVENT_TARGETS: Array<{ type: EventType; count: number }> = [
    { type: "RX_NEW",        count: 60 },
    { type: "RX_FILLED",     count: 70 },
    { type: "RX_READY",      count: 50 },
    { type: "RX_PICKED_UP",  count: 40 },
    { type: "RX_REFILL_DUE", count: 24 },
    { type: "RX_CANCELLED",  count: 6  },
  ];

  const allEventNpis = Object.keys(providersMap);
  const allDrugNames = Object.keys(ALL_DRUGS);

  type PrescriptionEventRecord = {
    organizationId: string;
    locationId: string;
    patientId: string;
    externalRxId: string;
    eventType: EventType;
    drugName: string;
    providerNpi: string;
    providerName: string;
    quantity: number;
    daysSupply: number;
    fillDate: Date;
    readyAt?: Date;
    pickedUpAt?: Date;
    refillDueDate?: Date;
    source: string;
    processedAt: Date;
    createdAt: Date;
  };

  const prescriptionEvents: PrescriptionEventRecord[] = [];
  let rxCounter = 20001;

  for (const { type, count } of EVENT_TARGETS) {
    for (let i = 0; i < count; i++) {
      const patient    = pickRandom(createdPatients);
      const npi        = pickRandom(allEventNpis);
      const drugName   = pickRandom(allDrugNames);
      const eventDaysAgo = randomBetween(1, 120);
      const fillDate   = daysAgo(eventDaysAgo);
      const processedAt = new Date(fillDate.getTime() + randomBetween(1, 4) * 60 * 60_000);

      const event: PrescriptionEventRecord = {
        organizationId: org.id,
        locationId: mainStreet.id,
        patientId: patient.id,
        externalRxId: `RX-${rxCounter++}`,
        eventType: type,
        drugName,
        providerNpi: npi,
        providerName: PROVIDER_NAMES[npi] ?? "Unknown Provider",
        quantity: pickRandom([30, 60, 90]),
        daysSupply: pickRandom([30, 60, 90]),
        fillDate,
        source: "manual",
        processedAt,
        createdAt: processedAt,
      };

      if (type === "RX_READY" || type === "RX_PICKED_UP") {
        event.readyAt = new Date(fillDate.getTime() + 2 * 60 * 60_000);
      }
      if (type === "RX_PICKED_UP") {
        event.pickedUpAt = new Date(fillDate.getTime() + randomBetween(2, 24) * 60 * 60_000);
      }
      if (type === "RX_REFILL_DUE") {
        event.refillDueDate = daysFromNow(randomBetween(7, 30));
      }

      prescriptionEvents.push(event);
    }
  }

  await batchInsert("Prescription events", prescriptionEvents, 100, async (batch) => {
    await prisma.prescriptionEvent.createMany({ data: batch });
  });

  console.log(`  Created ${createdPatients.length} patients, ${prescriptionEvents.length} prescription events.`);

  // ─── Audit log ─────────────────────────────────────────────────────────────────

  await prisma.auditLog.createMany({
    data: [
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
        entityId: westside.id,
        metadata: { name: "Westside", address: "456 Oak Ave, Albany, NY 12205" },
        createdAt: daysAgo(179),
      },
      {
        organizationId: org.id,
        userId: sarahUser.id,
        action: "upload",
        entityType: "PrescriptionUpload",
        entityId: upload.id,
        metadata: { fileName: "valley_health_rx_6month_export.csv", rowCount: allRxRecords.length },
        createdAt: daysAgo(30),
      },
    ],
  });

  // ─── Summary ───────────────────────────────────────────────────────────────────

  console.log("\n====================================================");
  console.log("Seed complete. Valley Health Pharmacy (fresh)");
  console.log("====================================================");
  console.log(`  Organization:          ${org.id}`);
  console.log(`  Locations:             2 (Main Street, Westside)`);
  console.log(`  Users:                 ${createdUsers.length} (6 staff + 2 field reps)`);
  console.log(`  Providers:             ${createdProviders.length}`);
  console.log(`  Prescription records:  ${allRxRecords.length}`);
  console.log(`  Field rep visits:      ${visitsCreated} (Alex: 15, Jordan: 15)`);
  console.log(`  Time entries:          ${allTimeEntries.length}`);
  console.log(`  Weekly schedules:      ${schedulesCreated}`);
  console.log(`  PTO requests:          ${ptoRequests.length}`);
  console.log(`  Patients:              ${createdPatients.length}`);
  console.log(`  Prescription events:   ${prescriptionEvents.length}`);
  console.log("");
  console.log("Login credentials (password: password123):");
  console.log("");
  const padName = (s: string) => s.padEnd(20);
  const padEmail = (s: string) => s.padEnd(32);
  console.log(`  ${padName("Sarah Chen")}  ${padEmail("sarah@valleyhealth.com")}  OWNER`);
  console.log(`  ${padName("Diego Martinez")}  ${padEmail("diego@valleyhealth.com")}  PHARMACIST`);
  console.log(`  ${padName("Priya Patel")}  ${padEmail("priya@valleyhealth.com")}  PHARMACIST`);
  console.log(`  ${padName("Marcus Johnson")}  ${padEmail("marcus@valleyhealth.com")}  TECHNICIAN`);
  console.log(`  ${padName("Mei Lin")}  ${padEmail("mei@valleyhealth.com")}  TECHNICIAN`);
  console.log(`  ${padName("James Wilson")}  ${padEmail("james@valleyhealth.com")}  TECHNICIAN`);
  console.log(`  ${padName("Alex Rivera")}  ${padEmail("alex@valleyhealth.com")}  DRUG REP`);
  console.log(`  ${padName("Jordan Blake")}  ${padEmail("jordan@valleyhealth.com")}  DRUG REP`);
  console.log("");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("\nSeed failed:", err);
  process.exit(1);
});

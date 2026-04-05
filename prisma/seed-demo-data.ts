import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// ─── Prisma client ────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Returns true if the date is a weekday (Mon–Fri)
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

// Get all working days (Mon–Fri) between two dates inclusive
function getWorkdays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    if (isWeekday(current)) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// Get the last N Mondays from today
function getLastNMondays(n: number): Date[] {
  const mondays: Date[] = [];
  const today = new Date();
  // Find the most recent Monday
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
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

// Format a Date as YYYY-MM-DD
function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// Build a DateTime for a given date at HH:MM
function dateAtTime(date: Date, hour: number, minute: number): Date {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// ─── Drug definitions ─────────────────────────────────────────────────────────

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

// All drugs referenced in the prompt, keyed by name
const ALL_DRUGS: Record<string, DrugDef> = {
  Lisinopril:         { name: "Lisinopril",     isGeneric: true,  ndcPrefix: "00378-1234" },
  Metformin:          { name: "Metformin",       isGeneric: true,  ndcPrefix: "00093-1010" },
  Atorvastatin:       { name: "Atorvastatin",    isGeneric: true,  ndcPrefix: "00071-0156" },
  Amlodipine:         { name: "Amlodipine",      isGeneric: true,  ndcPrefix: "00069-1530" },
  Omeprazole:         { name: "Omeprazole",      isGeneric: true,  ndcPrefix: "00185-3902" },
  Sertraline:         { name: "Sertraline",      isGeneric: true,  ndcPrefix: "00049-4960" },
  Levothyroxine:      { name: "Levothyroxine",   isGeneric: true,  ndcPrefix: "00074-7068" },
  Eliquis:            { name: "Eliquis",         isGeneric: false, ndcPrefix: "00003-3972" },
  Xarelto:            { name: "Xarelto",         isGeneric: false, ndcPrefix: "50458-0579" },
  Entresto:           { name: "Entresto",        isGeneric: false, ndcPrefix: "00078-0620" },
  Metoprolol:         { name: "Metoprolol",      isGeneric: true,  ndcPrefix: "00378-5050" },
  Jardiance:          { name: "Jardiance",       isGeneric: false, ndcPrefix: "00597-0140" },
  Ozempic:            { name: "Ozempic",         isGeneric: false, ndcPrefix: "00169-4060" },
  Glipizide:          { name: "Glipizide",       isGeneric: true,  ndcPrefix: "00049-3830" },
  Lexapro:            { name: "Lexapro",         isGeneric: false, ndcPrefix: "00456-2005" },
  Wellbutrin:         { name: "Wellbutrin",      isGeneric: false, ndcPrefix: "00173-0177" },
  Trazodone:          { name: "Trazodone",       isGeneric: true,  ndcPrefix: "00591-5765" },
  Buspirone:          { name: "Buspirone",       isGeneric: true,  ndcPrefix: "00093-1062" },
  Ibuprofen:          { name: "Ibuprofen",       isGeneric: true,  ndcPrefix: "00536-3603" },
  Naproxen:           { name: "Naproxen",        isGeneric: true,  ndcPrefix: "00536-4007" },
  Cyclobenzaprine:    { name: "Cyclobenzaprine", isGeneric: true,  ndcPrefix: "00378-3560" },
  Gabapentin:         { name: "Gabapentin",      isGeneric: true,  ndcPrefix: "00093-1078" },
  Meloxicam:          { name: "Meloxicam",       isGeneric: true,  ndcPrefix: "00378-1506" },
  Albuterol:          { name: "Albuterol",       isGeneric: true,  ndcPrefix: "59310-0579" },
  Fluticasone:        { name: "Fluticasone",     isGeneric: true,  ndcPrefix: "00173-0719" },
  Montelukast:        { name: "Montelukast",     isGeneric: true,  ndcPrefix: "00006-0711" },
  Prednisone:         { name: "Prednisone",      isGeneric: true,  ndcPrefix: "00054-4742" },
  Tiotropium:         { name: "Tiotropium",      isGeneric: false, ndcPrefix: "00597-0095" },
  Tretinoin:          { name: "Tretinoin",       isGeneric: true,  ndcPrefix: "45802-0099" },
  Clobetasol:         { name: "Clobetasol",      isGeneric: true,  ndcPrefix: "00168-0135" },
  Doxycycline:        { name: "Doxycycline",     isGeneric: true,  ndcPrefix: "00093-3081" },
  Ketoconazole:       { name: "Ketoconazole",    isGeneric: true,  ndcPrefix: "00168-0347" },
  Hydroxyzine:        { name: "Hydroxyzine",     isGeneric: true,  ndcPrefix: "00591-0456" },
  Pantoprazole:       { name: "Pantoprazole",    isGeneric: true,  ndcPrefix: "00093-0831" },
  Ondansetron:        { name: "Ondansetron",     isGeneric: true,  ndcPrefix: "00093-0774" },
  Dicyclomine:        { name: "Dicyclomine",     isGeneric: true,  ndcPrefix: "00603-3888" },
  Sucralfate:         { name: "Sucralfate",      isGeneric: true,  ndcPrefix: "00054-3568" },
  "Prenatal vitamins":{ name: "Prenatal vitamins", isGeneric: true, ndcPrefix: "00067-0154" },
  Progesterone:       { name: "Progesterone",    isGeneric: true,  ndcPrefix: "00143-9697" },
};

// Specialty → drug names
const SPECIALTY_DRUGS: Record<string, string[]> = {
  "Internal Medicine": ["Lisinopril", "Metformin", "Atorvastatin", "Amlodipine", "Omeprazole"],
  "Family Medicine":   ["Lisinopril", "Metformin", "Levothyroxine", "Omeprazole", "Sertraline"],
  Cardiology:          ["Eliquis", "Xarelto", "Entresto", "Amlodipine", "Metoprolol"],
  Endocrinology:       ["Metformin", "Jardiance", "Ozempic", "Levothyroxine", "Glipizide"],
  Psychiatry:          ["Sertraline", "Lexapro", "Wellbutrin", "Trazodone", "Buspirone"],
  Orthopedics:         ["Ibuprofen", "Naproxen", "Cyclobenzaprine", "Gabapentin", "Meloxicam"],
  Pulmonology:         ["Albuterol", "Fluticasone", "Montelukast", "Prednisone", "Tiotropium"],
  Dermatology:         ["Tretinoin", "Clobetasol", "Doxycycline", "Ketoconazole", "Hydroxyzine"],
  Gastroenterology:    ["Omeprazole", "Pantoprazole", "Ondansetron", "Dicyclomine", "Sucralfate"],
  "OB/GYN":            ["Prenatal vitamins", "Progesterone", "Metformin", "Levothyroxine", "Sertraline"],
};

function generateNdc(prefix: string): string {
  const suffix = String(randomBetween(10, 99));
  return `${prefix}-${suffix}`;
}

// ─── Rx generation ────────────────────────────────────────────────────────────

// monthIndex 0 = oldest (month 1 of 6), 5 = most recent
// Returns approx. how many Rx to generate for this month
type VolumeProfile = "high-growing" | "high-stable" | "med-growing" | "med-stable" | "low-growing" | "low-declining" | "low-stable" | "new-growing";

function rxCountForMonth(profile: VolumeProfile, monthIndex: number): number {
  // monthIndex: 0 = 6 months ago, 5 = current month
  const profiles: Record<VolumeProfile, number[]> = {
    "high-growing":  [15, 17, 19, 21, 23, 25],
    "high-stable":   [18, 18, 18, 18, 18, 18],
    "med-growing":   [10, 11, 13, 15, 16, 18],
    "med-stable":    [12, 12, 12, 12, 12, 12],
    "low-growing":   [6,  7,  7,  8,  9,  10],
    "low-declining": [14, 12, 10, 8,  7,  6],
    "low-stable":    [5,  5,  5,  5,  5,  5],
    "new-growing":   [0,  0,  0,  0,  8,  8],
  };
  const counts = profiles[profile];
  // Add ±10% jitter
  const base = counts[monthIndex];
  const jitter = Math.round(base * (Math.random() * 0.2 - 0.1));
  return Math.max(0, base + jitter);
}

interface ProviderConfig {
  npi: string;
  specialty: string;
  profile: VolumeProfile;
}

const PROVIDER_CONFIGS: ProviderConfig[] = [
  { npi: "1111111111", specialty: "Internal Medicine", profile: "high-growing"  },
  { npi: "2222222222", specialty: "Family Medicine",   profile: "high-stable"   },
  { npi: "3333333333", specialty: "Cardiology",        profile: "med-growing"   },
  { npi: "4444444444", specialty: "Endocrinology",     profile: "med-stable"    },
  { npi: "5555555555", specialty: "Psychiatry",        profile: "low-growing"   },
  { npi: "6666666666", specialty: "Orthopedics",       profile: "low-declining" },
  { npi: "7777777777", specialty: "Pulmonology",       profile: "low-declining" },
  { npi: "8888888888", specialty: "Dermatology",       profile: "low-stable"    },
  { npi: "9999999999", specialty: "Gastroenterology",  profile: "low-stable"    },
  { npi: "1010101010", specialty: "OB/GYN",            profile: "new-growing"   },
];

// Brown is sharply declining — override profile at month level
const BROWN_COUNTS = [10, 8, 6, 4, 3, 2];

function buildRxBatch(
  orgId: string,
  locationId: string,
  uploadId: string,
  providersMap: Record<string, string>,
  config: ProviderConfig,
  monthIndex: number,     // 0 = 6 months ago
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

  const drugs = SPECIALTY_DRUGS[config.specialty] ?? ["Lisinopril"];
  // Month 0 starts 180 days ago, month 5 started 30 days ago
  const monthStartDaysAgo = 180 - monthIndex * 30;
  const monthEndDaysAgo   = Math.max(0, monthStartDaysAgo - 30);

  const records = [];
  for (let i = 0; i < targetCount; i++) {
    const daysBack = randomBetween(monthEndDaysAgo, monthStartDaysAgo);
    const fillDate = daysAgo(daysBack);
    const drugName = pickRandom(drugs);
    const drug = ALL_DRUGS[drugName] ?? ALL_DRUGS["Lisinopril"];

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

// ─── Time entry helpers ───────────────────────────────────────────────────────

interface StaffScheduleConfig {
  userId: string;
  name: string;
  daysPerWeek: number; // 4 or 5
  skipDayOfWeek?: number; // day to skip if 4-day week (0=Sun..6=Sat)
  avgHoursPerDay: number;
  hasOvertimeWeeks: boolean;
  locationId: string;
}

function buildTimeEntry(
  config: StaffScheduleConfig,
  orgId: string,
  workday: Date
): {
  userId: string;
  organizationId: string;
  locationId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  regularHours: number;
  overtimeHours: number;
  breakMinutes: number;
  breakType: "UNPAID";
  isClockIn: boolean;
} {
  // Vary start time: 8:00–9:00 AM
  const startHour = 8;
  const startMinuteVariant = randomBetween(0, 60); // 0–59 min offset from 8:00
  const startMinute = startMinuteVariant % 60;
  const actualStartHour = startHour + Math.floor(startMinuteVariant / 60);

  // Target hours: avg ± 15 min jitter
  let targetHours = config.avgHoursPerDay;
  if (config.hasOvertimeWeeks) {
    // ~20% chance of overtime day (9h+)
    if (Math.random() < 0.2) targetHours = randomBetween(9, 10);
  }
  const jitterMinutes = randomBetween(-15, 15);
  const totalMinutes = Math.round(targetHours * 60) + jitterMinutes;

  const startTime = dateAtTime(workday, actualStartHour, startMinute);
  const endTime = new Date(startTime.getTime() + totalMinutes * 60_000);

  const breakMinutes = 30;
  const workedMinutes = totalMinutes - breakMinutes;
  const regularHours = Math.min(8, workedMinutes / 60);
  const overtimeHours = Math.max(0, workedMinutes / 60 - 8);

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
    breakType: "UNPAID",
    isClockIn: true,
  };
}

// ─── Schedule entry builder ───────────────────────────────────────────────────

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface StaffDef {
  employeeId: string;
  employeeName: string;
  role: string;
  daysOff?: string[]; // day names to mark as unavailable
}

function buildScheduleEntries(
  scheduleId: string,
  staff: StaffDef[],
  weekVariant: number // 0–7, used to vary times slightly
): Array<{
  scheduleId: string;
  employeeId: string;
  employeeName: string;
  day: string;
  available: boolean;
  startTime: string;
  endTime: string;
  role: string;
}> {
  const entries = [];

  // Time variants per week
  const startTimes = ["8:00 AM", "8:30 AM", "9:00 AM", "8:00 AM", "8:30 AM", "9:00 AM", "8:00 AM", "8:30 AM"];
  const endTimes   = ["4:00 PM", "4:30 PM", "5:00 PM", "4:00 PM", "5:00 PM", "4:30 PM", "4:00 PM", "5:00 PM"];
  const startTime = startTimes[weekVariant % startTimes.length];
  const endTime   = endTimes[weekVariant % endTimes.length];

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

// ─── Patient data ─────────────────────────────────────────────────────────────

const FAKE_PATIENTS = [
  { firstName: "Robert",    lastName: "Nguyen",    phone: "5185550101", dob: "1968-03-14" },
  { firstName: "Mary",      lastName: "Thompson",  phone: "5185550102", dob: "1975-07-22" },
  { firstName: "James",     lastName: "Rodriguez", phone: "5185550103", dob: "1952-11-05" },
  { firstName: "Patricia",  lastName: "Williams",  phone: "5185550104", dob: "1983-01-30" },
  { firstName: "Michael",   lastName: "Brown",     phone: "5185550105", dob: "1944-06-18" },
  { firstName: "Linda",     lastName: "Jones",     phone: "5185550106", dob: "1990-09-03" },
  { firstName: "William",   lastName: "Garcia",    phone: "5185550107", dob: "1961-04-27" },
  { firstName: "Barbara",   lastName: "Miller",    phone: "5185550108", dob: "1978-12-11" },
  { firstName: "David",     lastName: "Davis",     phone: "5185550109", dob: "1955-08-07" },
  { firstName: "Susan",     lastName: "Wilson",    phone: "5185550110", dob: "1987-02-19" },
  { firstName: "Richard",   lastName: "Moore",     phone: "5185550111", dob: "1970-05-15" },
  { firstName: "Jessica",   lastName: "Taylor",    phone: "5185550112", dob: "1995-10-23" },
  { firstName: "Thomas",    lastName: "Anderson",  phone: "5185550113", dob: "1948-07-09" },
  { firstName: "Sarah",     lastName: "Thomas",    phone: "5185550114", dob: "1982-03-28" },
  { firstName: "Charles",   lastName: "Jackson",   phone: "5185550115", dob: "1965-11-14" },
  { firstName: "Karen",     lastName: "White",     phone: "5185550116", dob: "1973-06-02" },
  { firstName: "Christopher",lastName: "Harris",   phone: "5185550117", dob: "1991-08-30" },
  { firstName: "Nancy",     lastName: "Martin",    phone: "5185550118", dob: "1957-04-16" },
  { firstName: "Matthew",   lastName: "Thompson",  phone: "5185550119", dob: "1986-01-07" },
  { firstName: "Betty",     lastName: "Lee",       phone: "5185550120", dob: "1943-09-25" },
];

// ─── Drug rep visit definitions ───────────────────────────────────────────────

interface AdditionalVisitDef {
  repLastName: "Harper" | "Santos" | "Bradley" | "Liu";
  daysBack: number;
  drugsPromoted: string[];
  samplesLeft: string[];
  notes: string;
  providerNpis: string[];
  loggedByEmail: string;
}

const ADDITIONAL_VISITS: AdditionalVisitDef[] = [
  // Harper (Pfizer) — visits every 3-4 weeks
  {
    repLastName: "Harper",
    daysBack: 168,
    drugsPromoted: ["Eliquis", "Lipitor"],
    samplesLeft: [],
    notes: "Initial quarterly visit. Shared updated Eliquis formulary positioning for commercial plans. Dr. Anderson expressed interest in expanded use for AF patients.",
    providerNpis: ["1111111111", "3333333333"],
    loggedByEmail: "diego@valleyhealth.com",
  },
  {
    repLastName: "Harper",
    daysBack: 140,
    drugsPromoted: ["Eliquis"],
    samplesLeft: ["Eliquis 5mg (60 count)"],
    notes: "Left Eliquis samples. Discussed AVERROES trial data with Dr. Torres — good reception. Dr. Anderson added to formulary preference list.",
    providerNpis: ["1111111111", "3333333333"],
    loggedByEmail: "sarah@valleyhealth.com",
  },
  {
    repLastName: "Harper",
    daysBack: 112,
    drugsPromoted: ["Lipitor", "Eliquis"],
    samplesLeft: ["Lipitor 10mg (30 count)"],
    notes: "Covered Lipitor potency vs. generic Atorvastatin with Dr. Anderson. He noted patient preference for branded, agreed to trial in select cases.",
    providerNpis: ["1111111111"],
    loggedByEmail: "diego@valleyhealth.com",
  },
  // Santos (Merck) — every 4-5 weeks
  {
    repLastName: "Santos",
    daysBack: 155,
    drugsPromoted: ["Jardiance"],
    samplesLeft: [],
    notes: "Introduced Jardiance CV outcomes data to Dr. White and Dr. Chang. Both requested patient education materials.",
    providerNpis: ["4444444444", "2222222222"],
    loggedByEmail: "diego@valleyhealth.com",
  },
  {
    repLastName: "Santos",
    daysBack: 120,
    drugsPromoted: ["Jardiance"],
    samplesLeft: ["Jardiance 10mg (30 count)"],
    notes: "Left Jardiance starter samples for Dr. White's newly diagnosed T2D patients. Reviewed HbA1c reduction benchmarks.",
    providerNpis: ["4444444444"],
    loggedByEmail: "sarah@valleyhealth.com",
  },
  // Bradley (AstraZeneca) — every 4-5 weeks
  {
    repLastName: "Bradley",
    daysBack: 150,
    drugsPromoted: ["Entresto", "Xarelto"],
    samplesLeft: [],
    notes: "Discussed Entresto place in therapy for HFrEF with Dr. Torres. Reviewed PIONEER-HF data. Strong interest — Dr. Torres requested prescribing guide.",
    providerNpis: ["3333333333"],
    loggedByEmail: "diego@valleyhealth.com",
  },
  {
    repLastName: "Bradley",
    daysBack: 105,
    drugsPromoted: ["Xarelto"],
    samplesLeft: ["Xarelto 20mg (30 count)"],
    notes: "Left Xarelto samples. Compared bleeding risk profile vs. Eliquis with Dr. Torres. Follow-up requested on renal dosing chart.",
    providerNpis: ["3333333333", "1111111111"],
    loggedByEmail: "sarah@valleyhealth.com",
  },
  // Liu (Novo Nordisk) — every 5-6 weeks
  {
    repLastName: "Liu",
    daysBack: 160,
    drugsPromoted: ["Ozempic"],
    samplesLeft: [],
    notes: "Introduced SUSTAIN trial data with Dr. White. Discussed Ozempic vs. Jardiance combination therapy for advanced T2D.",
    providerNpis: ["4444444444"],
    loggedByEmail: "diego@valleyhealth.com",
  },
  {
    repLastName: "Liu",
    daysBack: 115,
    drugsPromoted: ["Ozempic"],
    samplesLeft: ["Ozempic 0.25mg pen (4-week)"],
    notes: "Dr. White requested Ozempic starter kits after strong response in initial T2D cohort. Dr. Kim also interested for patients with metabolic comorbidities.",
    providerNpis: ["4444444444", "5555555555"],
    loggedByEmail: "sarah@valleyhealth.com",
  },
  {
    repLastName: "Liu",
    daysBack: 70,
    drugsPromoted: ["Ozempic"],
    samplesLeft: ["Ozempic 0.5mg pen (4-week)", "Ozempic 1mg pen (4-week)"],
    notes: "Delivered titration samples. SELECT trial cardiovascular benefit discussion with Dr. White — she's expanding Ozempic use to pre-diabetic high-CV-risk patients.",
    providerNpis: ["4444444444"],
    loggedByEmail: "diego@valleyhealth.com",
  },
  {
    repLastName: "Harper",
    daysBack: 55,
    drugsPromoted: ["Eliquis", "Lipitor"],
    samplesLeft: ["Eliquis 2.5mg (60 count)", "Lipitor 40mg (30 count)"],
    notes: "Quarterly review visit. Both Anderson and Torres have shown increased Eliquis scripts — attributed partly to pharma education. Left full sample packs.",
    providerNpis: ["1111111111", "3333333333"],
    loggedByEmail: "sarah@valleyhealth.com",
  },
  {
    repLastName: "Santos",
    daysBack: 48,
    drugsPromoted: ["Jardiance"],
    samplesLeft: [],
    notes: "Reviewed prescribing trends with Dr. White. Jardiance now her first-line for T2D patients with existing CV disease. Requested formulary access update.",
    providerNpis: ["4444444444", "2222222222"],
    loggedByEmail: "diego@valleyhealth.com",
  },
];

// ─── Batch insert helper ──────────────────────────────────────────────────────

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
    console.log(`  ${label}: ${done}/${items.length}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const forceFlag = process.argv.includes("--force");

  console.log("\nRxDesk demo data enrichment script");
  console.log("====================================");

  const prisma = createPrismaClient();

  // Guard: refuse if already enriched
  const existingTimeEntryCount = await prisma.timeEntry.count();
  if (existingTimeEntryCount > 100 && !forceFlag) {
    console.error(
      `\nREFUSED: Database already has ${existingTimeEntryCount} time entries.\n` +
      "This script has likely already been run. To force re-run: npx tsx prisma/seed-demo-data.ts --force\n" +
      "WARNING: --force will add DUPLICATE data.\n"
    );
    process.exit(1);
  }

  // ── Find existing org and entities ──────────────────────────────────────────

  console.log("\nLooking up existing Valley Health Pharmacy org...");

  const org = await prisma.organization.findFirst({
    where: { name: "Valley Health Pharmacy" },
  });
  if (!org) {
    console.error("ERROR: Valley Health Pharmacy organization not found. Run seed.ts first.");
    process.exit(1);
  }
  console.log(`  Found org: ${org.id}`);

  const locations = await prisma.location.findMany({
    where: { organizationId: org.id },
  });
  const mainStreet = locations.find((l) => l.name === "Main Street");
  const westside   = locations.find((l) => l.name === "Westside");
  if (!mainStreet || !westside) {
    console.error("ERROR: Expected 'Main Street' and 'Westside' locations.");
    process.exit(1);
  }
  console.log(`  Main Street: ${mainStreet.id}`);
  console.log(`  Westside: ${westside.id}`);

  const users = await prisma.user.findMany({
    where: { organizationId: org.id },
    select: { id: true, email: true, name: true, locationId: true },
  });
  const userByEmail: Record<string, typeof users[0]> = {};
  for (const u of users) userByEmail[u.email] = u;

  const sarah   = userByEmail["sarah@valleyhealth.com"];
  const diego   = userByEmail["diego@valleyhealth.com"];
  const priya   = userByEmail["priya@valleyhealth.com"];
  const marcus  = userByEmail["marcus@valleyhealth.com"];
  const mei     = userByEmail["mei@valleyhealth.com"];
  const james   = userByEmail["james@valleyhealth.com"];

  if (!sarah || !diego || !priya || !marcus || !mei || !james) {
    console.error("ERROR: Could not find all 6 expected users.");
    process.exit(1);
  }

  const providers = await prisma.provider.findMany({
    where: { organizationId: org.id },
    select: { id: true, npi: true },
  });
  const providersMap: Record<string, string> = {};
  for (const p of providers) providersMap[p.npi] = p.id;

  const drugReps = await prisma.drugRep.findMany({
    where: { organizationId: org.id },
    select: { id: true, lastName: true },
  });
  const drugRepByLastName: Record<string, string> = {};
  for (const r of drugReps) drugRepByLastName[r.lastName] = r.id;

  // ── 1. Prescription records (~1,600 additional) ──────────────────────────────

  console.log("\n[1/7] Generating ~1,600 additional prescription records...");

  const upload = await prisma.prescriptionUpload.create({
    data: {
      organizationId: org.id,
      locationId: mainStreet.id,
      uploadedById: sarah.id,
      fileName: "valley_health_rx_enriched_demo.csv",
      rowCount: 0,
      dateRangeStart: daysAgo(180),
      dateRangeEnd: new Date(),
      status: "COMPLETED",
    },
  });

  const allRxRecords: Array<{
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
  }> = [];

  for (const config of PROVIDER_CONFIGS) {
    for (let monthIndex = 0; monthIndex < 6; monthIndex++) {
      let count: number;
      if (config.npi === "7777777777") {
        // Sharp decline for Brown
        const jitter = randomBetween(-1, 1);
        count = Math.max(0, BROWN_COUNTS[monthIndex] + jitter);
      } else {
        count = rxCountForMonth(config.profile, monthIndex);
      }

      const batch = buildRxBatch(
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

  console.log(`  Total Rx records to insert: ${allRxRecords.length}`);

  await batchInsert("  Rx records", allRxRecords, 200, async (batch) => {
    await prisma.prescriptionRecord.createMany({ data: batch });
  });

  await prisma.prescriptionUpload.update({
    where: { id: upload.id },
    data: { rowCount: allRxRecords.length },
  });

  console.log(`  Done. Inserted ${allRxRecords.length} Rx records.`);

  // ── 2. Time entries ──────────────────────────────────────────────────────────

  console.log("\n[2/7] Generating 6 months of time entries...");

  const sixMonthsAgo = daysAgo(180);
  const today        = new Date();
  today.setHours(0, 0, 0, 0);
  const allWorkdays  = getWorkdays(sixMonthsAgo, today);

  interface StaffTimeConfig {
    userId: string;
    name: string;
    daysPerWeek: 4 | 5;
    skipDayOfWeek?: number; // JS day (0=Sun..6=Sat)
    avgHoursPerDay: number;
    hasOvertimeWeeks: boolean;
    locationId: string;
  }

  const staffTimeConfigs: StaffTimeConfig[] = [
    {
      userId: sarah.id,
      name: "Sarah",
      daysPerWeek: 5,
      avgHoursPerDay: 8.5,
      hasOvertimeWeeks: true,
      locationId: mainStreet.id,
    },
    {
      userId: diego.id,
      name: "Diego",
      daysPerWeek: 5,
      avgHoursPerDay: 8,
      hasOvertimeWeeks: false,
      locationId: mainStreet.id,
    },
    {
      userId: priya.id,
      name: "Priya",
      daysPerWeek: 4,
      skipDayOfWeek: 3, // Skip Wednesday
      avgHoursPerDay: 8,
      hasOvertimeWeeks: false,
      locationId: westside.id,
    },
    {
      userId: marcus.id,
      name: "Marcus",
      daysPerWeek: 5,
      avgHoursPerDay: 7.75,
      hasOvertimeWeeks: false,
      locationId: mainStreet.id,
    },
    {
      userId: mei.id,
      name: "Mei",
      daysPerWeek: 5,
      avgHoursPerDay: 7.75,
      hasOvertimeWeeks: false,
      locationId: westside.id,
    },
    {
      userId: james.id,
      name: "James",
      daysPerWeek: 4,
      skipDayOfWeek: 5, // Skip Friday
      avgHoursPerDay: 8,
      hasOvertimeWeeks: false,
      locationId: mainStreet.id,
    },
  ];

  const allTimeEntries: Array<{
    userId: string;
    organizationId: string;
    locationId: string;
    date: Date;
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    regularHours: number;
    overtimeHours: number;
    breakMinutes: number;
    breakType: "UNPAID";
    isClockIn: boolean;
  }> = [];

  for (const staffConfig of staffTimeConfigs) {
    for (const workday of allWorkdays) {
      // Skip their off-day if 4 days/week
      if (staffConfig.skipDayOfWeek !== undefined) {
        if (workday.getDay() === staffConfig.skipDayOfWeek) continue;
      }

      const entry = buildTimeEntry(
        {
          userId: staffConfig.userId,
          name: staffConfig.name,
          daysPerWeek: staffConfig.daysPerWeek,
          avgHoursPerDay: staffConfig.avgHoursPerDay,
          hasOvertimeWeeks: staffConfig.hasOvertimeWeeks,
          locationId: staffConfig.locationId,
        },
        org.id,
        workday
      );
      allTimeEntries.push(entry);
    }
  }

  console.log(`  Total time entries to insert: ${allTimeEntries.length}`);

  await batchInsert("  Time entries", allTimeEntries, 100, async (batch) => {
    await prisma.timeEntry.createMany({ data: batch });
  });

  console.log(`  Done. Inserted ${allTimeEntries.length} time entries.`);

  // ── 3. Weekly schedules (last 8 weeks) ──────────────────────────────────────

  console.log("\n[3/7] Generating weekly schedules (last 8 weeks, 2 locations)...");

  const mondays = getLastNMondays(8);

  // Staff definitions per location
  const mainStreetStaff: StaffDef[] = [
    { employeeId: sarah.id,  employeeName: "Sarah Chen",     role: "Pharmacist" },
    { employeeId: diego.id,  employeeName: "Diego Martinez", role: "Pharmacist" },
    { employeeId: marcus.id, employeeName: "Marcus Johnson", role: "Technician" },
    { employeeId: james.id,  employeeName: "James Wilson",   role: "Technician", daysOff: ["Friday"] },
  ];

  const westsideStaff: StaffDef[] = [
    { employeeId: priya.id, employeeName: "Priya Patel", role: "Pharmacist", daysOff: ["Wednesday"] },
    { employeeId: mei.id,   employeeName: "Mei Lin",     role: "Technician" },
  ];

  let schedulesCreated = 0;
  let entriesCreated = 0;

  for (let weekIdx = 0; weekIdx < mondays.length; weekIdx++) {
    const monday = mondays[weekIdx];
    const weekStart = toISODate(monday);
    const finalizedAt = new Date(monday.getTime() - 2 * 24 * 60 * 60_000); // finalized 2 days before

    for (const locationDef of [
      { location: mainStreet, staff: mainStreetStaff },
      { location: westside,   staff: westsideStaff },
    ]) {
      // Check if schedule already exists
      const existing = await prisma.weeklySchedule.findUnique({
        where: { locationId_weekStart: { locationId: locationDef.location.id, weekStart } },
      });

      if (existing) {
        console.log(`    Skipping ${locationDef.location.name} week ${weekStart} (already exists)`);
        continue;
      }

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
      entriesCreated += entries.length;
    }
  }

  console.log(`  Done. Created ${schedulesCreated} schedules, ${entriesCreated} entries.`);

  // ── 4. PTO requests ──────────────────────────────────────────────────────────

  console.log("\n[4/7] Generating PTO requests...");

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
    // 4 approved vacations
    {
      employeeId: diego.id,
      startDate: daysAgo(155),
      endDate: daysAgo(151),
      type: "VACATION",
      status: "APPROVED",
      note: "Family trip to Puerto Rico",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(162),
    },
    {
      employeeId: priya.id,
      startDate: daysAgo(120),
      endDate: daysAgo(116),
      type: "VACATION",
      status: "APPROVED",
      note: "Wedding anniversary trip",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(128),
    },
    {
      employeeId: marcus.id,
      startDate: daysAgo(90),
      endDate: daysAgo(88),
      type: "VACATION",
      status: "APPROVED",
      note: "Family visit out of state",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(97),
    },
    {
      employeeId: james.id,
      startDate: daysAgo(60),
      endDate: daysAgo(56),
      type: "VACATION",
      status: "APPROVED",
      note: "Spring break with kids",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(67),
    },
    // 3 approved sick days
    {
      employeeId: mei.id,
      startDate: daysAgo(140),
      endDate: daysAgo(140),
      type: "SICK",
      status: "APPROVED",
      note: "Not feeling well — fever",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(140),
    },
    {
      employeeId: priya.id,
      startDate: daysAgo(75),
      endDate: daysAgo(75),
      type: "SICK",
      status: "APPROVED",
      note: "Migraine",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(75),
    },
    {
      employeeId: diego.id,
      startDate: daysAgo(30),
      endDate: daysAgo(30),
      type: "SICK",
      status: "APPROVED",
      note: "Stomach bug",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(30),
    },
    // 2 approved personal days
    {
      employeeId: marcus.id,
      startDate: daysAgo(45),
      endDate: daysAgo(45),
      type: "PERSONAL",
      status: "APPROVED",
      note: "Home repair appointment",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(50),
    },
    {
      employeeId: james.id,
      startDate: daysAgo(20),
      endDate: daysAgo(20),
      type: "PERSONAL",
      status: "APPROVED",
      note: "Child's school event",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(25),
    },
    // 2 pending (upcoming)
    {
      employeeId: priya.id,
      startDate: daysFromNow(14),
      endDate: daysFromNow(18),
      type: "VACATION",
      status: "PENDING",
      note: "Summer vacation — Adirondacks",
    },
    {
      employeeId: mei.id,
      startDate: daysFromNow(21),
      endDate: daysFromNow(21),
      type: "PERSONAL",
      status: "PENDING",
      note: "Medical appointment",
    },
    // 1 denied
    {
      employeeId: james.id,
      startDate: daysAgo(50),
      endDate: daysAgo(46),
      type: "VACATION",
      status: "DENIED",
      note: "Vacation request",
      reviewedById: sarah.id,
      reviewedAt: daysAgo(55),
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

  console.log(`  Done. Created ${ptoRequests.length} PTO requests.`);

  // ── 5. Patients + Prescription events ────────────────────────────────────────

  console.log("\n[5/7] Generating patients and prescription events...");

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
          smsOptIn: Math.random() > 0.2,   // 80% opt in
          emailOptIn: Math.random() > 0.5,
          preferredChannel: "SMS",
          isActive: true,
        },
      })
    )
  );

  console.log(`  Created ${createdPatients.length} patients.`);

  // Build prescription events
  type EventType = "RX_NEW" | "RX_FILLED" | "RX_READY" | "RX_PICKED_UP" | "RX_REFILL_DUE" | "RX_CANCELLED";

  const EVENT_TARGETS: Array<{ type: EventType; count: number }> = [
    { type: "RX_NEW",        count: 50 },
    { type: "RX_FILLED",     count: 60 },
    { type: "RX_READY",      count: 40 },
    { type: "RX_PICKED_UP",  count: 30 },
    { type: "RX_REFILL_DUE", count: 15 },
    { type: "RX_CANCELLED",  count: 5  },
  ];

  const allEventNpis = Object.keys(providersMap);
  const allDrugNames = Object.keys(ALL_DRUGS);

  const prescriptionEvents: Array<{
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
  }> = [];

  // Provider name lookup
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
  };

  let rxCounter = 10001;

  for (const { type, count } of EVENT_TARGETS) {
    for (let i = 0; i < count; i++) {
      const patient = pickRandom(createdPatients);
      const npi = pickRandom(allEventNpis);
      const drugName = pickRandom(allDrugNames);
      const eventDaysAgo = randomBetween(1, 120);
      const fillDate = daysAgo(eventDaysAgo);
      const processedAt = new Date(fillDate.getTime() + randomBetween(1, 4) * 60 * 60_000);

      const event: (typeof prescriptionEvents)[0] = {
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

  await batchInsert("  Events", prescriptionEvents, 100, async (batch) => {
    await prisma.prescriptionEvent.createMany({ data: batch });
  });

  console.log(`  Done. Created ${prescriptionEvents.length} prescription events.`);

  // ── 6. Additional drug rep visits ────────────────────────────────────────────

  console.log("\n[6/7] Creating 12 additional drug rep visits...");

  const loggedByMap: Record<string, string> = {
    "sarah@valleyhealth.com": sarah.id,
    "diego@valleyhealth.com": diego.id,
  };

  let visitsCreated = 0;

  for (const def of ADDITIONAL_VISITS) {
    const repId = drugRepByLastName[def.repLastName];
    if (!repId) {
      console.warn(`  WARNING: Drug rep '${def.repLastName}' not found — skipping.`);
      continue;
    }

    const visit = await prisma.drugRepVisit.create({
      data: {
        organizationId: org.id,
        locationId: mainStreet.id,
        drugRepId: repId,
        visitDate: daysAgo(def.daysBack),
        durationMinutes: pickRandom([15, 20, 30, 45]),
        drugsPromoted: def.drugsPromoted,
        samplesLeft: def.samplesLeft,
        notes: def.notes,
        loggedById: loggedByMap[def.loggedByEmail] ?? sarah.id,
      },
    });

    const visitProviders = def.providerNpis
      .filter((npi) => providersMap[npi])
      .map((npi) => ({
        drugRepVisitId: visit.id,
        providerId: providersMap[npi],
      }));

    if (visitProviders.length > 0) {
      await prisma.drugRepVisitProvider.createMany({ data: visitProviders });
    }

    visitsCreated++;
  }

  console.log(`  Done. Created ${visitsCreated} additional visits.`);

  // ── 7. Notification templates ─────────────────────────────────────────────────

  console.log("\n[7/7] Creating notification templates...");

  const templates = [
    {
      organizationId: org.id,
      name: "Rx Ready",
      channel: "SMS" as const,
      eventType: "RX_READY" as const,
      body: "Hi {{patientFirstName}}, your prescription for {{drugName}} is ready for pickup at Valley Health Pharmacy. Questions? Call us at (518) 555-0100.",
      isActive: true,
      isDefault: true,
    },
    {
      organizationId: org.id,
      name: "Refill Reminder",
      channel: "SMS" as const,
      eventType: "RX_REFILL_DUE" as const,
      body: "Hi {{patientFirstName}}, your {{drugName}} prescription is due for refill on {{refillDueDate}}. Reply REFILL to request it or call (518) 555-0100.",
      isActive: true,
      isDefault: true,
    },
    {
      organizationId: org.id,
      name: "Rx Ready Email",
      channel: "EMAIL" as const,
      eventType: "RX_READY" as const,
      subject: "Your prescription is ready — Valley Health Pharmacy",
      body: "Hi {{patientFirstName}},\n\nYour prescription for {{drugName}} is ready for pickup at Valley Health Pharmacy.\n\nPickup hours: Mon–Fri 8 AM – 6 PM, Sat 9 AM – 2 PM.\n\nQuestions? Reply to this email or call (518) 555-0100.\n\nValley Health Pharmacy Team",
      isActive: true,
      isDefault: true,
    },
    {
      organizationId: org.id,
      name: "Appointment Reminder",
      channel: "SMS" as const,
      eventType: null,
      body: "Hi {{patientFirstName}}, this is a reminder from Valley Health Pharmacy. Please remember to pick up your medications before your upcoming appointment. Call us at (518) 555-0100.",
      isActive: true,
      isDefault: false,
    },
    {
      organizationId: org.id,
      name: "Welcome",
      channel: "EMAIL" as const,
      eventType: null,
      subject: "Welcome to Valley Health Pharmacy",
      body: "Hi {{patientFirstName}},\n\nWelcome to Valley Health Pharmacy! We're glad to be your pharmacy partner.\n\nYou can reach us at (518) 555-0100 or stop by 123 Main St, Albany, NY.\n\nWe'll notify you when your prescriptions are ready.\n\nValley Health Pharmacy Team",
      isActive: true,
      isDefault: false,
    },
  ];

  await prisma.notificationTemplate.createMany({ data: templates });

  console.log(`  Done. Created ${templates.length} notification templates.`);

  // ── Summary ───────────────────────────────────────────────────────────────────

  const [finalRxCount, finalTimeCount, finalScheduleCount, finalPtoCount, finalEventCount, finalRepVisitCount, finalTemplateCount, finalPatientCount] = await Promise.all([
    prisma.prescriptionRecord.count({ where: { organizationId: org.id } }),
    prisma.timeEntry.count({ where: { organizationId: org.id } }),
    prisma.weeklySchedule.count({ where: { organizationId: org.id } }),
    prisma.ptoRequest.count({ where: { organizationId: org.id } }),
    prisma.prescriptionEvent.count({ where: { organizationId: org.id } }),
    prisma.drugRepVisit.count({ where: { organizationId: org.id } }),
    prisma.notificationTemplate.count({ where: { organizationId: org.id } }),
    prisma.patient.count({ where: { organizationId: org.id } }),
  ]);

  console.log("\n====================================");
  console.log("Demo data enrichment complete.");
  console.log("====================================");
  console.log(`  Prescription records (total): ${finalRxCount}`);
  console.log(`  Time entries (total):          ${finalTimeCount}`);
  console.log(`  Weekly schedules (total):      ${finalScheduleCount}`);
  console.log(`  PTO requests (total):          ${finalPtoCount}`);
  console.log(`  Patients (total):              ${finalPatientCount}`);
  console.log(`  Prescription events (total):   ${finalEventCount}`);
  console.log(`  Drug rep visits (total):       ${finalRepVisitCount}`);
  console.log(`  Notification templates:        ${finalTemplateCount}`);
  console.log("");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("seed-demo-data failed:", err);
  process.exit(1);
});

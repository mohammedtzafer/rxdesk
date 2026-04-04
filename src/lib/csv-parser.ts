// CSV parser for prescription data uploads

export interface CsvRow {
  npi: string;
  providerName?: string;
  drugName: string;
  drugNdc?: string;
  fillDate: string;
  quantity?: string;
  daysSupply?: string;
  payerType?: string;
  isGeneric?: string;
}

export interface ParsedRow {
  providerNpi: string;
  drugName: string;
  drugNdc: string | null;
  fillDate: Date;
  quantity: number | null;
  daysSupply: number | null;
  payerType: "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH" | "OTHER";
  isGeneric: boolean;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: Array<{ row: number; message: string }>;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
}

const PAYER_MAP: Record<string, "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH" | "OTHER"> = {
  commercial: "COMMERCIAL",
  private: "COMMERCIAL",
  medicare: "MEDICARE",
  medicaid: "MEDICAID",
  cash: "CASH",
  self: "CASH",
  "self-pay": "CASH",
  other: "OTHER",
};

function parsePayerType(value: string | undefined): "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH" | "OTHER" {
  if (!value) return "OTHER";
  return PAYER_MAP[value.toLowerCase().trim()] || "OTHER";
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return v === "true" || v === "yes" || v === "1" || v === "y" || v === "generic";
}

function parseDate(value: string): Date | null {
  // Try common formats: MM/DD/YYYY, YYYY-MM-DD, M/D/YYYY
  const trimmed = value.trim();

  // ISO format
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // US format
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const d = new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

export function parseCsvContent(content: string): ParseResult {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, message: "CSV must have a header row and at least one data row" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }

  const headerLine = lines[0];
  const headers = headerLine.split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  // Map header names to expected fields
  const npiCol = headers.findIndex((h) => h === "npi" || h === "provider_npi" || h === "prescriber_npi");
  const drugCol = headers.findIndex((h) => h === "drug_name" || h === "drugname" || h === "drug" || h === "medication");
  const dateCol = headers.findIndex((h) => h === "fill_date" || h === "filldate" || h === "date" || h === "date_filled");
  const ndcCol = headers.findIndex((h) => h === "ndc" || h === "drug_ndc" || h === "drugndc");
  const qtyCol = headers.findIndex((h) => h === "quantity" || h === "qty");
  const daysCol = headers.findIndex((h) => h === "days_supply" || h === "dayssupply" || h === "days");
  const payerCol = headers.findIndex((h) => h === "payer_type" || h === "payertype" || h === "payer" || h === "insurance");
  const genericCol = headers.findIndex((h) => h === "is_generic" || h === "isgeneric" || h === "generic" || h === "brand_generic");

  if (npiCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: NPI (expected: npi, provider_npi, or prescriber_npi)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }
  if (drugCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: drug name (expected: drug_name, drug, or medication)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }
  if (dateCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: fill date (expected: fill_date, date, or date_filled)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }

  const rows: ParsedRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let dateRangeStart: Date | null = null;
  let dateRangeEnd: Date | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));

    const npi = cols[npiCol]?.trim();
    if (!npi || npi.length < 10) {
      errors.push({ row: i + 1, message: `Invalid NPI: "${npi}"` });
      continue;
    }

    const drugName = cols[drugCol]?.trim();
    if (!drugName) {
      errors.push({ row: i + 1, message: "Missing drug name" });
      continue;
    }

    const fillDate = parseDate(cols[dateCol] || "");
    if (!fillDate) {
      errors.push({ row: i + 1, message: `Invalid date: "${cols[dateCol]}"` });
      continue;
    }

    if (!dateRangeStart || fillDate < dateRangeStart) dateRangeStart = fillDate;
    if (!dateRangeEnd || fillDate > dateRangeEnd) dateRangeEnd = fillDate;

    rows.push({
      providerNpi: npi,
      drugName,
      drugNdc: ndcCol >= 0 ? cols[ndcCol] || null : null,
      fillDate,
      quantity: qtyCol >= 0 ? parseInt(cols[qtyCol]) || null : null,
      daysSupply: daysCol >= 0 ? parseInt(cols[daysCol]) || null : null,
      payerType: parsePayerType(payerCol >= 0 ? cols[payerCol] : undefined),
      isGeneric: parseBoolean(genericCol >= 0 ? cols[genericCol] : undefined),
    });
  }

  return { rows, errors, dateRangeStart, dateRangeEnd };
}

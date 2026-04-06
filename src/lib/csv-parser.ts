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
  providerName: string | null;
  providerAddress: string | null;
  drugName: string;
  drugNdc: string | null;
  rxNumber: string | null;
  fillDate: Date;
  quantity: number | null;
  daysSupply: number | null;
  payerType: "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH" | "OTHER";
  isGeneric: boolean;
  status: string | null;
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

/**
 * Strip Excel formula wrapping (="value") or plain surrounding quotes.
 * Handles the PMS export format where every cell is wrapped in ="...".
 */
function cleanCell(cell: string): string {
  let v = cell.trim();
  if (v.startsWith('="') && v.endsWith('"')) {
    v = v.slice(2, -1);
  } else {
    v = v.replace(/^["']|["']$/g, "");
  }
  return v.trim();
}

function parseDate(value: string): Date | null {
  // Strip trailing time component: "3/10/2026 12:00:00 AM" → "3/10/2026"
  const trimmed = value.trim().replace(/\s+\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?$/i, "");

  // ISO format: YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // US format: M/D/YYYY or MM/DD/YYYY
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
  // Use cleanCell on each header to handle Excel-wrapped headers if present
  const headers = headerLine.split(",").map((h) => cleanCell(h).toLowerCase());

  // NPI column — standard + PMS variants
  const npiCol = headers.findIndex(
    (h) => h === "npi" || h === "provider_npi" || h === "prescriber_npi" || h === "presnpi" || h === "prescribernpi"
  );

  // Drug name column — standard + PMS variant
  const drugCol = headers.findIndex(
    (h) => h === "drug_name" || h === "drugname" || h === "drug" || h === "medication"
  );

  // Fill date column — standard + PMS variant
  const dateCol = headers.findIndex(
    (h) => h === "fill_date" || h === "filldate" || h === "date" || h === "date_filled" || h === "datef" || h === "rxdate"
  );

  const ndcCol = headers.findIndex((h) => h === "ndc" || h === "drug_ndc" || h === "drugndc");
  const qtyCol = headers.findIndex((h) => h === "quantity" || h === "qty");
  const daysCol = headers.findIndex((h) => h === "days_supply" || h === "dayssupply" || h === "days");
  const payerCol = headers.findIndex((h) => h === "payer_type" || h === "payertype" || h === "payer" || h === "insurance");
  const genericCol = headers.findIndex((h) => h === "is_generic" || h === "isgeneric" || h === "generic" || h === "brand_generic");

  // PMS-specific columns
  const brandCol = headers.findIndex((h) => h === "brand");
  const rxnoCol = headers.findIndex((h) => h === "rxno" || h === "rx_number" || h === "rxnumber");
  const presNameCol = headers.findIndex((h) => h === "presname" || h === "prescriber_name" || h === "provider_name");
  const presAddrCol = headers.findIndex((h) => h === "presaddress" || h === "prescriber_address" || h === "provider_address");
  const statusCol = headers.findIndex((h) => h === "status");

  if (npiCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: NPI (expected: npi, provider_npi, prescriber_npi, or presnpi)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }
  if (drugCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: drug name (expected: drug_name, drugname, drug, or medication)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }
  if (dateCol === -1) {
    return {
      rows: [],
      errors: [{ row: 0, message: "Missing required column: fill date (expected: fill_date, date, date_filled, or datef)" }],
      dateRangeStart: null,
      dateRangeEnd: null,
    };
  }

  const rows: ParsedRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];
  let dateRangeStart: Date | null = null;
  let dateRangeEnd: Date | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => cleanCell(c));

    const npi = cols[npiCol]?.trim();
    if (!npi || npi.length !== 10 || !/^\d{10}$/.test(npi)) {
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

    // BRAND column uses inverted logic: BRAND=Y means brand (not generic), BRAND=N means generic
    let isGeneric: boolean;
    if (brandCol >= 0 && cols[brandCol]) {
      isGeneric = cols[brandCol].toUpperCase() !== "Y";
    } else {
      isGeneric = parseBoolean(genericCol >= 0 ? cols[genericCol] : undefined);
    }

    rows.push({
      providerNpi: npi,
      providerName: presNameCol >= 0 ? cols[presNameCol] || null : null,
      providerAddress: presAddrCol >= 0 ? cols[presAddrCol] || null : null,
      drugName,
      drugNdc: ndcCol >= 0 ? cols[ndcCol] || null : null,
      rxNumber: rxnoCol >= 0 ? cols[rxnoCol] || null : null,
      fillDate,
      quantity: qtyCol >= 0 ? parseInt(cols[qtyCol]) || null : null,
      daysSupply: daysCol >= 0 ? parseInt(cols[daysCol]) || null : null,
      payerType: parsePayerType(payerCol >= 0 ? cols[payerCol] : undefined),
      isGeneric,
      status: statusCol >= 0 ? cols[statusCol] || null : null,
    });
  }

  return { rows, errors, dateRangeStart, dateRangeEnd };
}

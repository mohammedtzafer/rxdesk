import { describe, it, expect } from "vitest";
import { parseCsvContent } from "@/lib/csv-parser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal valid CSV string with one data row. */
function buildCsv(
  headers: string,
  ...dataRows: string[]
): string {
  return [headers, ...dataRows].join("\n");
}

const VALID_HEADERS = "npi,drug_name,fill_date,payer_type,is_generic";
const VALID_ROW = "1234567890,Lisinopril,2024-01-15,commercial,true";

// ---------------------------------------------------------------------------
// Valid CSV — happy path
// ---------------------------------------------------------------------------
describe("parseCsvContent — valid CSV", () => {
  it("parses a valid CSV row into a ParsedRow with correct fields", () => {
    const csv = buildCsv(VALID_HEADERS, VALID_ROW);
    const result = parseCsvContent(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.providerNpi).toBe("1234567890");
    expect(row.drugName).toBe("Lisinopril");
    expect(row.fillDate).toBeInstanceOf(Date);
    expect(row.payerType).toBe("COMMERCIAL");
    expect(row.isGeneric).toBe(true);
  });

  it("sets dateRangeStart and dateRangeEnd to the fill date of a single row", () => {
    const csv = buildCsv(VALID_HEADERS, VALID_ROW);
    const result = parseCsvContent(csv);

    expect(result.dateRangeStart).toBeInstanceOf(Date);
    expect(result.dateRangeEnd).toBeInstanceOf(Date);
    expect(result.dateRangeStart?.toISOString()).toBe(result.dateRangeEnd?.toISOString());
  });

  it("calculates dateRangeStart and dateRangeEnd across multiple rows", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "1234567890,Lisinopril,2024-01-01,commercial,true",
      "1234567890,Metformin,2024-06-15,commercial,false",
      "1234567890,Atorvastatin,2024-03-10,commercial,true"
    );
    const result = parseCsvContent(csv);

    expect(result.rows).toHaveLength(3);
    // 2024-01-01 is earliest
    expect(result.dateRangeStart?.getMonth()).toBe(0); // January
    // 2024-06-15 is latest
    expect(result.dateRangeEnd?.getMonth()).toBe(5); // June
  });

  it("parses an empty data section (header only) as 0 rows", () => {
    // parseCsvContent requires at least 2 non-empty lines, so an empty body
    // triggers the "must have at least one data row" error path.
    const csv = VALID_HEADERS;
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Missing/invalid headers
// ---------------------------------------------------------------------------
describe("parseCsvContent — header validation", () => {
  it("returns an error when the file has fewer than 2 lines", () => {
    const result = parseCsvContent("");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].row).toBe(0);
    expect(result.errors[0].message).toMatch(/header/i);
    expect(result.dateRangeStart).toBeNull();
    expect(result.dateRangeEnd).toBeNull();
  });

  it("returns an error when the NPI column is missing", () => {
    const csv = buildCsv("drug_name,fill_date", "Lisinopril,2024-01-15");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toMatch(/npi/i);
  });

  it("returns an error when the drug name column is missing", () => {
    const csv = buildCsv("npi,fill_date", "1234567890,2024-01-15");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toMatch(/drug/i);
  });

  it("returns an error when the fill date column is missing", () => {
    const csv = buildCsv("npi,drug_name", "1234567890,Lisinopril");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toMatch(/fill date|date/i);
  });
});

// ---------------------------------------------------------------------------
// Row-level validation errors
// ---------------------------------------------------------------------------
describe("parseCsvContent — row validation", () => {
  it("skips a row with an NPI that is too short (< 10 chars)", () => {
    const csv = buildCsv(VALID_HEADERS, "123456789,Lisinopril,2024-01-15,commercial,true");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].message).toMatch(/invalid npi/i);
  });

  it("skips a row with an invalid date", () => {
    const csv = buildCsv(VALID_HEADERS, "1234567890,Lisinopril,not-a-date,commercial,true");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].message).toMatch(/invalid date/i);
  });

  it("skips a row with a missing drug name in the data", () => {
    const csv = buildCsv(VALID_HEADERS, "1234567890,,2024-01-15,commercial,true");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toMatch(/missing drug name/i);
  });

  it("collects errors and still returns valid rows when the file is mixed", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "1234567890,Lisinopril,2024-01-15,commercial,true", // valid
      "123,BadNpi,2024-01-15,commercial,true",             // invalid NPI
      "1234567890,Metformin,2024-02-01,medicare,false"     // valid
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Date formats
// ---------------------------------------------------------------------------
describe("parseCsvContent — date format support", () => {
  it("parses MM/DD/YYYY date format", () => {
    const csv = buildCsv(VALID_HEADERS, "1234567890,Lisinopril,01/15/2024,commercial,true");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fillDate.getFullYear()).toBe(2024);
    expect(result.rows[0].fillDate.getMonth()).toBe(0); // January
    expect(result.rows[0].fillDate.getDate()).toBe(15);
  });

  it("parses YYYY-MM-DD date format", () => {
    const csv = buildCsv(VALID_HEADERS, "1234567890,Lisinopril,2024-01-15,commercial,true");
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fillDate.getFullYear()).toBe(2024);
    expect(result.rows[0].fillDate.getMonth()).toBe(0);
    expect(result.rows[0].fillDate.getDate()).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// Payer type mapping
// ---------------------------------------------------------------------------
describe("parseCsvContent — payer type mapping", () => {
  const cases: Array<[string, "COMMERCIAL" | "MEDICARE" | "MEDICAID" | "CASH" | "OTHER"]> = [
    ["commercial", "COMMERCIAL"],
    ["medicare", "MEDICARE"],
    ["medicaid", "MEDICAID"],
    ["cash", "CASH"],
    ["private", "COMMERCIAL"],
    ["unknown_payer", "OTHER"],
  ];

  for (const [input, expected] of cases) {
    it(`maps payer type "${input}" to ${expected}`, () => {
      const csv = buildCsv(
        VALID_HEADERS,
        `1234567890,Lisinopril,2024-01-15,${input},true`
      );
      const result = parseCsvContent(csv);
      expect(result.rows[0].payerType).toBe(expected);
    });
  }

  it('defaults to OTHER when payer type column is missing from the row', () => {
    const csv = buildCsv("npi,drug_name,fill_date", "1234567890,Lisinopril,2024-01-15");
    const result = parseCsvContent(csv);
    expect(result.rows[0].payerType).toBe("OTHER");
  });
});

// ---------------------------------------------------------------------------
// Generic flag parsing
// ---------------------------------------------------------------------------
describe("parseCsvContent — isGeneric flag parsing", () => {
  const truthy = ["true", "yes", "1", "generic", "y"];
  const falsy = ["false", "no", "0", "brand", ""];

  for (const val of truthy) {
    it(`parses "${val}" as isGeneric=true`, () => {
      const csv = buildCsv(
        VALID_HEADERS,
        `1234567890,Lisinopril,2024-01-15,commercial,${val}`
      );
      const result = parseCsvContent(csv);
      expect(result.rows[0].isGeneric).toBe(true);
    });
  }

  for (const val of falsy) {
    it(`parses "${val}" as isGeneric=false`, () => {
      const csv = buildCsv(
        VALID_HEADERS,
        `1234567890,Lisinopril,2024-01-15,commercial,${val}`
      );
      const result = parseCsvContent(csv);
      expect(result.rows[0].isGeneric).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Quoted values
// ---------------------------------------------------------------------------
describe("parseCsvContent — quoted values", () => {
  it("strips surrounding quotes from field values", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      `"1234567890","Lisinopril","2024-01-15","commercial","true"`
    );
    const result = parseCsvContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].providerNpi).toBe("1234567890");
    expect(result.rows[0].drugName).toBe("Lisinopril");
    expect(result.rows[0].isGeneric).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Extra columns and whitespace handling
// ---------------------------------------------------------------------------

describe("parseCsvContent — extra columns and whitespace", () => {
  it("ignores extra columns beyond the required fields", () => {
    const csv = buildCsv(
      "npi,drug_name,fill_date,payer_type,is_generic,extra_col,another_col",
      "1234567890,Lisinopril,2024-01-15,commercial,true,ignored,also_ignored"
    );
    const result = parseCsvContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].providerNpi).toBe("1234567890");
    expect(result.rows[0].drugName).toBe("Lisinopril");
  });

  it("trims whitespace from NPI values", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "  1234567890  ,Lisinopril,2024-01-15,commercial,true"
    );
    const result = parseCsvContent(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows[0].providerNpi).toBe("1234567890");
  });

  it("trims whitespace from drug name values", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "1234567890,  Lisinopril  ,2024-01-15,commercial,true"
    );
    const result = parseCsvContent(csv);
    expect(result.rows[0].drugName).toBe("Lisinopril");
  });

  it("rejects NPI longer than 10 digits", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "12345678901,Lisinopril,2024-01-15,commercial,true"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Invalid NPI");
  });

  it("rejects NPI with non-digit characters", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "123456789A,Lisinopril,2024-01-15,commercial,true"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
  });

  it("rejects rows where NPI is exactly 9 characters (too short)", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "123456789,Lisinopril,2024-01-15,commercial,true"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].message).toMatch(/invalid npi/i);
  });

  it("handles mixed valid and invalid rows, collecting all errors and valid rows", () => {
    const csv = buildCsv(
      VALID_HEADERS,
      "1234567890,Lisinopril,2024-01-15,commercial,true", // valid
      "123,BadNpi,2024-01-15,commercial,true",             // invalid NPI
      "1234567890,,2024-02-01,medicare,false",             // missing drug name
      "1234567890,Metformin,not-a-date,cash,false",        // invalid date
      "9876543210,Atorvastatin,2024-03-10,commercial,true" // valid
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.errors).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Flexible header names
// ---------------------------------------------------------------------------
describe("parseCsvContent — flexible header names", () => {
  it("accepts 'provider_npi' as the NPI column", () => {
    const csv = buildCsv(
      "provider_npi,drug_name,fill_date",
      "1234567890,Lisinopril,2024-01-15"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].providerNpi).toBe("1234567890");
  });

  it("accepts 'prescriber_npi' as the NPI column", () => {
    const csv = buildCsv(
      "prescriber_npi,drug_name,fill_date",
      "1234567890,Lisinopril,2024-01-15"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
  });

  it("accepts 'drug' as the drug name column", () => {
    const csv = buildCsv(
      "npi,drug,fill_date",
      "1234567890,Lisinopril,2024-01-15"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].drugName).toBe("Lisinopril");
  });

  it("accepts 'medication' as the drug name column", () => {
    const csv = buildCsv(
      "npi,medication,fill_date",
      "1234567890,Lisinopril,2024-01-15"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// PMS (Pharmacy Management System) CSV format — Excel =" wrapping
// ---------------------------------------------------------------------------
describe("parseCsvContent — PMS format with =\"...\" wrapping", () => {
  it("strips =\"...\" wrappers from values and parses correctly", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="3/10/2026 12:00:00 AM",="179181",="1285268300",="Huynh. Dathao",="9256 BENDIX RD",="MINOCYCLINE 100mg CAP (65862-0211-05)",="65862-0211-05",="N",="B"'
    );
    const result = parseCsvContent(csv);

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.providerNpi).toBe("1285268300");
    expect(row.drugName).toBe("MINOCYCLINE 100mg CAP (65862-0211-05)");
    expect(row.drugNdc).toBe("65862-0211-05");
    expect(row.isGeneric).toBe(true); // BRAND=N means generic
    expect(row.status).toBe("B");
    expect(row.rxNumber).toBe("179181");
    expect(row.providerName).toBe("Huynh. Dathao");
    expect(row.providerAddress).toBe("9256 BENDIX RD");
    expect(row.fillDate.getFullYear()).toBe(2026);
    expect(row.fillDate.getMonth()).toBe(2); // March
    expect(row.fillDate.getDate()).toBe(10);
  });

  it("handles BRAND=Y as isGeneric=false", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="3/10/2026 12:00:00 AM",="187684",="1730695503",="SANYAOLU. SAMETTA",="7625 MAPLE LAWN BLVD",="QULIPTA 60MG TAB (00074-7094-30)",="00074-7094-30",="Y",="B"'
    );
    const result = parseCsvContent(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].isGeneric).toBe(false);
  });

  it("handles STATUS values B, F, U", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="3/10/2026 12:00:00 AM",="100",="1285268300",="Test. Doc",="123 Main",="Drug A (11111-2222-33)",="11111-2222-33",="N",="B"',
      '="3/10/2026 12:00:00 AM",="101",="1285268300",="Test. Doc",="123 Main",="Drug B (11111-2222-34)",="11111-2222-34",="Y",="F"',
      '="3/10/2026 12:00:00 AM",="102",="1285268300",="Test. Doc",="123 Main",="Drug C (11111-2222-35)",="11111-2222-35",="N",="U"'
    );
    const result = parseCsvContent(csv);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].status).toBe("B");
    expect(result.rows[1].status).toBe("F");
    expect(result.rows[2].status).toBe("U");
  });

  it("parses dates with time component (M/D/YYYY H:MM:SS AM)", () => {
    const csv = buildCsv(
      "DATEF,RXNO,PRESNPI,PRESNAME,PRESADDRESS,DRUGNAME,NDC,BRAND,STATUS",
      '="12/5/2025 12:00:00 AM",="200",="1285268300",="Test. Doc",="123 Main",="Drug A (11111-2222-33)",="11111-2222-33",="N",="B"'
    );
    const result = parseCsvContent(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fillDate.getFullYear()).toBe(2025);
    expect(result.rows[0].fillDate.getMonth()).toBe(11); // December
    expect(result.rows[0].fillDate.getDate()).toBe(5);
  });
});

describe("parseCsvContent — PMS header mappings", () => {
  it("accepts PRESNPI as the NPI column", () => {
    const csv = buildCsv(
      "PRESNPI,DRUGNAME,DATEF",
      "1234567890,Lisinopril,01/15/2024"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].providerNpi).toBe("1234567890");
  });

  it("accepts DATEF as the date column", () => {
    const csv = buildCsv(
      "NPI,DRUGNAME,DATEF",
      "1234567890,Lisinopril,03/10/2026"
    );
    const result = parseCsvContent(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].fillDate.getMonth()).toBe(2);
  });
});

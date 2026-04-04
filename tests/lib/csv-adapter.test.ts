import { describe, it, expect } from "vitest";
import {
  parseCsvRxEvents,
  PMS_CSV_MAPPINGS,
  CsvColumnMapping,
} from "@/lib/pms/csv-adapter";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PIONEER_MAPPING = PMS_CSV_MAPPINGS.PIONEER_RX;
const RX30_MAPPING = PMS_CSV_MAPPINGS.RX30;
const GENERIC_MAPPING = PMS_CSV_MAPPINGS.GENERIC;

/** Build a minimal PioneerRx CSV string from an array of row objects */
function buildPioneerCsv(
  rows: Array<Record<string, string>>
): string {
  const header =
    "rx_number,drug_name,ndc,patient_first,patient_last,patient_phone,patient_id,prescriber_npi,prescriber_name,qty,days_supply,fill_date,status,plan_name,copay";
  const dataRows = rows.map((row) =>
    [
      row.rx_number ?? "RX001",
      row.drug_name ?? "Metformin 500mg",
      row.ndc ?? "00093-1075-01",
      row.patient_first ?? "John",
      row.patient_last ?? "Doe",
      row.patient_phone ?? "5551234567",
      row.patient_id ?? "P001",
      row.prescriber_npi ?? "1234567890",
      row.prescriber_name ?? "Dr. Smith",
      row.qty ?? "30",
      row.days_supply ?? "30",
      row.fill_date ?? "2024-01-15",
      row.status ?? "ready",
      row.plan_name ?? "BlueCross",
      row.copay ?? "10.00",
    ].join(",")
  );
  return [header, ...dataRows].join("\n");
}

// ---------------------------------------------------------------------------
// Header parsing
// ---------------------------------------------------------------------------

describe("parseCsvRxEvents — header parsing", () => {
  it("parses a valid PioneerRx CSV and returns correct event count", () => {
    const csv = buildPioneerCsv([
      { drug_name: "Lisinopril 10mg", status: "ready" },
      { drug_name: "Atorvastatin 20mg", status: "new" },
    ]);

    const { events, errors } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events).toHaveLength(2);
    expect(errors).toHaveLength(0);
  });

  it("returns an error when the required drug_name column is missing", () => {
    // CSV with fill_date but no drug_name column
    const csv = "rx_number,fill_date,status\nRX001,2024-01-15,ready";

    const { events, errors } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/missing required column/i);
    expect(errors[0].message).toContain(PIONEER_MAPPING.drugName);
  });

  it("returns an error when the required fill_date column is missing", () => {
    // CSV with drug_name but no fill_date column
    const csv = "rx_number,drug_name,status\nRX001,Metformin,ready";

    const { events, errors } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/missing required column/i);
    expect(errors[0].message).toContain(PIONEER_MAPPING.fillDate);
  });

  it("ignores extra columns that are not in the mapping", () => {
    const csv =
      "drug_name,fill_date,extra_column_one,extra_column_two\nMetformin,2024-01-15,foo,bar";

    const { events, errors } = parseCsvRxEvents(csv, {
      drugName: "drug_name",
      fillDate: "fill_date",
    });

    expect(events).toHaveLength(1);
    expect(errors).toHaveLength(0);
    expect(events[0].drugName).toBe("Metformin");
  });
});

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------

describe("parseCsvRxEvents — status mapping", () => {
  function parseWithStatus(status: string) {
    const csv = buildPioneerCsv([{ status }]);
    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);
    return events[0]?.eventType;
  }

  it('maps "ready" → RX_READY', () => {
    expect(parseWithStatus("ready")).toBe("RX_READY");
  });

  it('maps "complete" → RX_READY', () => {
    expect(parseWithStatus("complete")).toBe("RX_READY");
  });

  it('maps "picked up" → RX_PICKED_UP', () => {
    expect(parseWithStatus("picked up")).toBe("RX_PICKED_UP");
  });

  it('maps "dispensed" → RX_PICKED_UP', () => {
    expect(parseWithStatus("dispensed")).toBe("RX_PICKED_UP");
  });

  it('maps "cancelled" → RX_CANCELLED', () => {
    expect(parseWithStatus("cancelled")).toBe("RX_CANCELLED");
  });

  it('maps "void" → RX_CANCELLED', () => {
    expect(parseWithStatus("void")).toBe("RX_CANCELLED");
  });

  it('maps "on hold" → RX_ON_HOLD', () => {
    expect(parseWithStatus("on hold")).toBe("RX_ON_HOLD");
  });

  it('maps "new" → RX_NEW', () => {
    expect(parseWithStatus("new")).toBe("RX_NEW");
  });

  it("maps unknown status → RX_FILLED (default)", () => {
    expect(parseWithStatus("some_weird_status")).toBe("RX_FILLED");
  });

  it("maps empty status → RX_FILLED (default)", () => {
    expect(parseWithStatus("")).toBe("RX_FILLED");
  });
});

// ---------------------------------------------------------------------------
// Field extraction
// ---------------------------------------------------------------------------

describe("parseCsvRxEvents — field extraction", () => {
  it("extracts and trims the drug name", () => {
    const csv =
      "drug_name,fill_date\n  Metformin 500mg  ,2024-01-15";

    const { events } = parseCsvRxEvents(csv, {
      drugName: "drug_name",
      fillDate: "fill_date",
    });

    expect(events[0].drugName).toBe("Metformin 500mg");
  });

  it("extracts patient info when columns are present", () => {
    const csv = buildPioneerCsv([
      {
        patient_first: "Jane",
        patient_last: "Smith",
        patient_phone: "5559876543",
        patient_id: "P999",
      },
    ]);

    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events[0].patientFirstName).toBe("Jane");
    expect(events[0].patientLastName).toBe("Smith");
    expect(events[0].patientPhone).toBe("5559876543");
    expect(events[0].patientExternalId).toBe("P999");
  });

  it("extracts provider NPI", () => {
    const csv = buildPioneerCsv([{ prescriber_npi: "9876543210" }]);

    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events[0].providerNpi).toBe("9876543210");
  });

  it("parses quantity as integer", () => {
    const csv = buildPioneerCsv([{ qty: "90" }]);

    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events[0].quantity).toBe(90);
    expect(Number.isInteger(events[0].quantity)).toBe(true);
  });

  it("parses days supply as integer", () => {
    const csv = buildPioneerCsv([{ days_supply: "30" }]);

    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events[0].daysSupply).toBe(30);
    expect(Number.isInteger(events[0].daysSupply)).toBe(true);
  });

  it("parses copay as float", () => {
    const csv = buildPioneerCsv([{ copay: "12.50" }]);

    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events[0].copay).toBeCloseTo(12.5);
    expect(typeof events[0].copay).toBe("number");
  });

  it("sets optional fields to undefined when columns are absent from mapping", () => {
    const csv =
      "drug_name,fill_date\nLisinopril,2024-01-15";

    const minimalMapping: CsvColumnMapping = {
      drugName: "drug_name",
      fillDate: "fill_date",
    };

    const { events } = parseCsvRxEvents(csv, minimalMapping);

    expect(events[0].patientFirstName).toBeUndefined();
    expect(events[0].patientLastName).toBeUndefined();
    expect(events[0].patientPhone).toBeUndefined();
    expect(events[0].providerNpi).toBeUndefined();
    expect(events[0].quantity).toBeUndefined();
    expect(events[0].daysSupply).toBeUndefined();
    expect(events[0].copay).toBeUndefined();
  });

  it("sets quantity to undefined when value is non-numeric", () => {
    const csv = buildPioneerCsv([{ qty: "N/A" }]);

    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events[0].quantity).toBeUndefined();
  });

  it("sets copay to undefined when value is non-numeric", () => {
    const csv = buildPioneerCsv([{ copay: "waived" }]);

    const { events } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events[0].copay).toBeUndefined();
  });

  it("strips surrounding quotes from values", () => {
    const csv =
      'drug_name,fill_date\n"Metformin 500mg","2024-01-15"';

    const { events } = parseCsvRxEvents(csv, {
      drugName: "drug_name",
      fillDate: "fill_date",
    });

    expect(events[0].drugName).toBe("Metformin 500mg");
    expect(events[0].fillDate).toBe("2024-01-15");
  });
});

// ---------------------------------------------------------------------------
// PMS_CSV_MAPPINGS shape tests
// ---------------------------------------------------------------------------

describe("PMS_CSV_MAPPINGS", () => {
  const REQUIRED_KEYS: Array<keyof CsvColumnMapping> = [
    "rxId",
    "drugName",
    "drugNdc",
    "patientFirstName",
    "patientLastName",
    "patientPhone",
    "patientId",
    "providerNpi",
    "providerName",
    "quantity",
    "daysSupply",
    "fillDate",
    "status",
    "payerName",
    "copay",
  ];

  it("PIONEER_RX mapping has all expected column name keys", () => {
    for (const key of REQUIRED_KEYS) {
      expect(PIONEER_MAPPING).toHaveProperty(key);
    }
  });

  it("RX30 mapping has all expected column name keys", () => {
    for (const key of REQUIRED_KEYS) {
      expect(RX30_MAPPING).toHaveProperty(key);
    }
  });

  it("GENERIC mapping has all expected column name keys", () => {
    for (const key of REQUIRED_KEYS) {
      expect(GENERIC_MAPPING).toHaveProperty(key);
    }
  });

  it("PIONEER_RX uses expected column names for required fields", () => {
    expect(PIONEER_MAPPING.drugName).toBe("drug_name");
    expect(PIONEER_MAPPING.fillDate).toBe("fill_date");
    expect(PIONEER_MAPPING.rxId).toBe("rx_number");
    expect(PIONEER_MAPPING.providerNpi).toBe("prescriber_npi");
  });

  it("RX30 uses expected column names for required fields", () => {
    expect(RX30_MAPPING.drugName).toBe("DrugName");
    expect(RX30_MAPPING.fillDate).toBe("FillDt");
    expect(RX30_MAPPING.rxId).toBe("RxNum");
    expect(RX30_MAPPING.providerNpi).toBe("DocNPI");
  });

  it("GENERIC uses expected column names for required fields", () => {
    expect(GENERIC_MAPPING.drugName).toBe("drug_name");
    expect(GENERIC_MAPPING.fillDate).toBe("fill_date");
    expect(GENERIC_MAPPING.rxId).toBe("rx_id");
    expect(GENERIC_MAPPING.providerNpi).toBe("npi");
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("parseCsvRxEvents — edge cases", () => {
  it("returns an error for an empty file (no lines)", () => {
    const { events, errors } = parseCsvRxEvents("", PIONEER_MAPPING);

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0].row).toBe(0);
  });

  it("returns an error for a file with only whitespace", () => {
    const { events, errors } = parseCsvRxEvents("   \n  ", PIONEER_MAPPING);

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it("returns 0 events and no errors for a header-only file", () => {
    const headerOnly =
      "rx_number,drug_name,ndc,patient_first,patient_last,patient_phone,patient_id,prescriber_npi,prescriber_name,qty,days_supply,fill_date,status,plan_name,copay";

    const { events, errors } = parseCsvRxEvents(headerOnly, PIONEER_MAPPING);

    expect(events).toHaveLength(0);
    expect(errors).toHaveLength(1); // "must have header and at least one data row"
  });

  it("skips rows with empty drug name and records an error for each", () => {
    const csv = buildPioneerCsv([
      { drug_name: "" },                  // invalid
      { drug_name: "Lisinopril 10mg" },   // valid
    ]);

    const { events, errors } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events).toHaveLength(1);
    expect(events[0].drugName).toBe("Lisinopril 10mg");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toMatch(/missing drug name/i);
  });

  it("handles mixed valid and invalid rows — partial success", () => {
    const csv = buildPioneerCsv([
      { drug_name: "Metformin 500mg", status: "ready" },
      { drug_name: "" },                              // will be skipped
      { drug_name: "Lisinopril 10mg", status: "new" },
      { drug_name: "" },                              // will be skipped
    ]);

    const { events, errors } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(events).toHaveLength(2);
    expect(errors).toHaveLength(2);
  });

  it("handles Windows-style CRLF line endings", () => {
    const csv =
      "drug_name,fill_date\r\nMetformin 500mg,2024-01-15\r\nLisinopril,2024-01-16";

    const { events } = parseCsvRxEvents(csv, {
      drugName: "drug_name",
      fillDate: "fill_date",
    });

    expect(events).toHaveLength(2);
    expect(events[0].drugName).toBe("Metformin 500mg");
    expect(events[1].drugName).toBe("Lisinopril");
  });

  it("is case-insensitive when matching header column names", () => {
    const csv = "Drug_Name,Fill_Date\nMetformin,2024-01-15";

    const { events, errors } = parseCsvRxEvents(csv, {
      drugName: "drug_name",
      fillDate: "fill_date",
    });

    expect(events).toHaveLength(1);
    expect(errors).toHaveLength(0);
    expect(events[0].drugName).toBe("Metformin");
  });

  it("records the correct row number in errors (1-based from data, so row 2 = first data row)", () => {
    const csv = buildPioneerCsv([
      { drug_name: "" }, // row 2 in the file (header is row 1)
    ]);

    const { errors } = parseCsvRxEvents(csv, PIONEER_MAPPING);

    expect(errors[0].row).toBe(2);
  });
});

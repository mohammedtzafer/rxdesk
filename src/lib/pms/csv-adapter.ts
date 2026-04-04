// CSV file import adapter — works for any PMS that exports CSV/Excel

import { PmsAdapter, PmsAdapterConfig, PmsRxEvent, PmsPatient } from "./adapter";

export class CsvAdapter implements PmsAdapter {
  type = "CSV_IMPORT";

  constructor(private config: PmsAdapterConfig) {}

  async testConnection(): Promise<boolean> {
    return true; // CSV import is always "connected"
  }

  async fetchRecentEvents(): Promise<PmsRxEvent[]> {
    return []; // CSV adapter uses parseCsvRxEvents instead
  }

  async fetchPatients(): Promise<PmsPatient[]> {
    return []; // CSV adapter uses parseCsvPatients instead
  }
}

// Column mapping for different PMS CSV formats
export interface CsvColumnMapping {
  rxId?: string;
  drugName: string;
  drugNdc?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientPhone?: string;
  patientId?: string;
  providerNpi?: string;
  providerName?: string;
  quantity?: string;
  daysSupply?: string;
  fillDate: string;
  status?: string;
  payerName?: string;
  copay?: string;
}

// Pre-built mappings for known PMS exports
export const PMS_CSV_MAPPINGS: Record<string, CsvColumnMapping> = {
  PIONEER_RX: {
    rxId: "rx_number",
    drugName: "drug_name",
    drugNdc: "ndc",
    patientFirstName: "patient_first",
    patientLastName: "patient_last",
    patientPhone: "patient_phone",
    patientId: "patient_id",
    providerNpi: "prescriber_npi",
    providerName: "prescriber_name",
    quantity: "qty",
    daysSupply: "days_supply",
    fillDate: "fill_date",
    status: "status",
    payerName: "plan_name",
    copay: "copay",
  },
  RX30: {
    rxId: "RxNum",
    drugName: "DrugName",
    drugNdc: "NDC",
    patientFirstName: "PatFirst",
    patientLastName: "PatLast",
    patientPhone: "Phone",
    patientId: "PatID",
    providerNpi: "DocNPI",
    providerName: "DocName",
    quantity: "Qty",
    daysSupply: "DaySup",
    fillDate: "FillDt",
    status: "Status",
    payerName: "PlanName",
    copay: "Copay",
  },
  GENERIC: {
    rxId: "rx_id",
    drugName: "drug_name",
    drugNdc: "ndc",
    patientFirstName: "first_name",
    patientLastName: "last_name",
    patientPhone: "phone",
    patientId: "patient_id",
    providerNpi: "npi",
    providerName: "provider",
    quantity: "quantity",
    daysSupply: "days_supply",
    fillDate: "fill_date",
    status: "status",
    payerName: "payer",
    copay: "copay",
  },
};

export function parseCsvRxEvents(
  content: string,
  mapping: CsvColumnMapping
): { events: PmsRxEvent[]; errors: Array<{ row: number; message: string }> } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return {
      events: [],
      errors: [{ row: 0, message: "File must have a header and at least one data row" }],
    };
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));

  // Find column indices
  function findCol(name?: string): number {
    if (!name) return -1;
    return headers.findIndex((h) => h === name.toLowerCase());
  }

  const cols = {
    rxId: findCol(mapping.rxId),
    drugName: findCol(mapping.drugName),
    drugNdc: findCol(mapping.drugNdc),
    patientFirstName: findCol(mapping.patientFirstName),
    patientLastName: findCol(mapping.patientLastName),
    patientPhone: findCol(mapping.patientPhone),
    patientId: findCol(mapping.patientId),
    providerNpi: findCol(mapping.providerNpi),
    providerName: findCol(mapping.providerName),
    quantity: findCol(mapping.quantity),
    daysSupply: findCol(mapping.daysSupply),
    fillDate: findCol(mapping.fillDate),
    status: findCol(mapping.status),
    payerName: findCol(mapping.payerName),
    copay: findCol(mapping.copay),
  };

  if (cols.drugName === -1) {
    return {
      events: [],
      errors: [{ row: 0, message: `Missing required column: ${mapping.drugName}` }],
    };
  }
  if (cols.fillDate === -1) {
    return {
      events: [],
      errors: [{ row: 0, message: `Missing required column: ${mapping.fillDate}` }],
    };
  }

  const events: PmsRxEvent[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));

    const drugName = values[cols.drugName]?.trim();
    if (!drugName) {
      errors.push({ row: i + 1, message: "Missing drug name" });
      continue;
    }

    const statusVal = cols.status >= 0 ? values[cols.status]?.toLowerCase() : "";
    let eventType = "RX_FILLED";
    if (statusVal === "ready" || statusVal === "complete") eventType = "RX_READY";
    else if (statusVal === "picked up" || statusVal === "dispensed") eventType = "RX_PICKED_UP";
    else if (statusVal === "cancelled" || statusVal === "void") eventType = "RX_CANCELLED";
    else if (statusVal === "on hold" || statusVal === "hold") eventType = "RX_ON_HOLD";
    else if (statusVal === "new") eventType = "RX_NEW";

    events.push({
      externalRxId: cols.rxId >= 0 ? values[cols.rxId] || "" : "",
      eventType,
      drugName,
      drugNdc: cols.drugNdc >= 0 ? values[cols.drugNdc] : undefined,
      patientFirstName: cols.patientFirstName >= 0 ? values[cols.patientFirstName] : undefined,
      patientLastName: cols.patientLastName >= 0 ? values[cols.patientLastName] : undefined,
      patientPhone: cols.patientPhone >= 0 ? values[cols.patientPhone] : undefined,
      patientExternalId: cols.patientId >= 0 ? values[cols.patientId] : undefined,
      providerNpi: cols.providerNpi >= 0 ? values[cols.providerNpi] : undefined,
      providerName: cols.providerName >= 0 ? values[cols.providerName] : undefined,
      quantity: cols.quantity >= 0 ? parseInt(values[cols.quantity]) || undefined : undefined,
      daysSupply: cols.daysSupply >= 0 ? parseInt(values[cols.daysSupply]) || undefined : undefined,
      fillDate: cols.fillDate >= 0 ? values[cols.fillDate] : undefined,
      payerName: cols.payerName >= 0 ? values[cols.payerName] : undefined,
      copay: cols.copay >= 0 ? parseFloat(values[cols.copay]) || undefined : undefined,
    });
  }

  return { events, errors };
}

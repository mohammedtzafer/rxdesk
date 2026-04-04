// PMS Adapter interface — all PMS integrations implement this

export interface PmsRxEvent {
  externalRxId: string;
  eventType: string;
  drugName: string;
  drugNdc?: string;
  patientFirstName?: string;
  patientLastName?: string;
  patientPhone?: string;
  patientEmail?: string;
  patientExternalId?: string;
  providerNpi?: string;
  providerName?: string;
  quantity?: number;
  daysSupply?: number;
  fillDate?: string;
  readyAt?: string;
  pickedUpAt?: string;
  refillDueDate?: string;
  payerName?: string;
  copay?: number;
  metadata?: Record<string, unknown>;
}

export interface PmsPatient {
  externalId: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
}

export interface PmsAdapter {
  type: string;

  // Connection
  testConnection(): Promise<boolean>;

  // Prescription events
  fetchRecentEvents(since?: Date): Promise<PmsRxEvent[]>;

  // Patients
  fetchPatients(since?: Date): Promise<PmsPatient[]>;
}

// Adapter registry
const adapters = new Map<string, new (config: PmsAdapterConfig) => PmsAdapter>();

export interface PmsAdapterConfig {
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  metadata?: Record<string, unknown>;
}

export function registerAdapter(
  type: string,
  adapterClass: new (config: PmsAdapterConfig) => PmsAdapter
) {
  adapters.set(type, adapterClass);
}

export function getAdapter(type: string, config: PmsAdapterConfig): PmsAdapter {
  const AdapterClass = adapters.get(type);
  if (!AdapterClass) {
    throw new Error(`No adapter registered for PMS type: ${type}`);
  }
  return new AdapterClass(config);
}

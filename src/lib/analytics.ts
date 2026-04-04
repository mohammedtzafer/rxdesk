// Pure analytics calculations — no DB access, fully testable

export type TrendDirection = "UP" | "DOWN" | "STABLE";

export interface ProviderAnalytics {
  rxVolume: number;
  priorRxVolume: number;
  trendDirection: TrendDirection;
  percentChange: number;
  rxPerWeek: number;
  topDrugs: Array<{ name: string; count: number }>;
  brandGenericRatio: { brand: number; generic: number; brandPercent: number };
  payerMix: Array<{ type: string; count: number; percent: number }>;
  newDrugs: string[];
}

export interface PrescriptionRecord {
  fillDate: Date;
  drugName: string;
  isGeneric: boolean;
  payerType: string;
  quantity: number | null;
}

const TREND_THRESHOLD = 0.05; // ±5%

export function calculateTrend(
  current: number,
  prior: number
): { direction: TrendDirection; percentChange: number } {
  if (prior === 0 && current === 0) {
    return { direction: "STABLE", percentChange: 0 };
  }
  if (prior === 0) {
    return { direction: "UP", percentChange: 100 };
  }

  const change = (current - prior) / prior;
  const percentChange = Math.round(change * 1000) / 10; // 1 decimal

  if (change > TREND_THRESHOLD) return { direction: "UP", percentChange };
  if (change < -TREND_THRESHOLD) return { direction: "DOWN", percentChange };
  return { direction: "STABLE", percentChange };
}

export function calculateTopDrugs(
  records: PrescriptionRecord[],
  limit: number = 10
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const r of records) {
    const name = r.drugName.toUpperCase().trim();
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function calculateBrandGenericRatio(
  records: PrescriptionRecord[]
): { brand: number; generic: number; brandPercent: number } {
  let brand = 0;
  let generic = 0;
  for (const r of records) {
    if (r.isGeneric) generic++;
    else brand++;
  }
  const total = brand + generic;
  return {
    brand,
    generic,
    brandPercent: total > 0 ? Math.round((brand / total) * 1000) / 10 : 0,
  };
}

export function calculatePayerMix(
  records: PrescriptionRecord[]
): Array<{ type: string; count: number; percent: number }> {
  const counts = new Map<string, number>();
  for (const r of records) {
    counts.set(r.payerType, (counts.get(r.payerType) || 0) + 1);
  }
  const total = records.length;
  return Array.from(counts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function findNewDrugs(
  currentRecords: PrescriptionRecord[],
  priorRecords: PrescriptionRecord[]
): string[] {
  const priorDrugs = new Set(priorRecords.map((r) => r.drugName.toUpperCase().trim()));
  const currentDrugs = new Set(currentRecords.map((r) => r.drugName.toUpperCase().trim()));

  return Array.from(currentDrugs).filter((drug) => !priorDrugs.has(drug)).sort();
}

export function calculateProviderAnalytics(
  currentRecords: PrescriptionRecord[],
  priorRecords: PrescriptionRecord[],
  days: number
): ProviderAnalytics {
  const rxVolume = currentRecords.length;
  const priorRxVolume = priorRecords.length;
  const { direction: trendDirection, percentChange } = calculateTrend(rxVolume, priorRxVolume);

  const weeks = days / 7;
  const rxPerWeek = weeks > 0 ? Math.round((rxVolume / weeks) * 10) / 10 : 0;

  return {
    rxVolume,
    priorRxVolume,
    trendDirection,
    percentChange,
    rxPerWeek,
    topDrugs: calculateTopDrugs(currentRecords),
    brandGenericRatio: calculateBrandGenericRatio(currentRecords),
    payerMix: calculatePayerMix(currentRecords),
    newDrugs: findNewDrugs(currentRecords, priorRecords),
  };
}

// Portfolio-level analytics

export interface PortfolioAlerts {
  newPrescribers: string[]; // NPIs seen in current but not prior
  dormantPrescribers: string[]; // NPIs in prior but not current
  concentrationRisk: { topN: number; percentOfTotal: number };
}

export function calculateConcentrationRisk(
  providerVolumes: Array<{ npi: string; count: number }>,
  topN: number = 5
): { topN: number; percentOfTotal: number } {
  const total = providerVolumes.reduce((sum, p) => sum + p.count, 0);
  if (total === 0) return { topN, percentOfTotal: 0 };

  const sorted = [...providerVolumes].sort((a, b) => b.count - a.count);
  const topVolume = sorted.slice(0, topN).reduce((sum, p) => sum + p.count, 0);

  return {
    topN,
    percentOfTotal: Math.round((topVolume / total) * 1000) / 10,
  };
}

export function findNewPrescribers(
  currentNpis: Set<string>,
  priorNpis: Set<string>
): string[] {
  return Array.from(currentNpis).filter((npi) => !priorNpis.has(npi));
}

export function findDormantPrescribers(
  currentNpis: Set<string>,
  priorNpis: Set<string>
): string[] {
  return Array.from(priorNpis).filter((npi) => !currentNpis.has(npi));
}

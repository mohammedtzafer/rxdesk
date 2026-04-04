import { describe, it, expect } from "vitest";
import {
  calculateTrend,
  calculateTopDrugs,
  calculateBrandGenericRatio,
  calculatePayerMix,
  findNewDrugs,
  calculateConcentrationRisk,
  findNewPrescribers,
  findDormantPrescribers,
  calculateProviderAnalytics,
  type PrescriptionRecord,
} from "@/lib/analytics";

// Factory helper
function makeRecord(overrides: Partial<PrescriptionRecord> = {}): PrescriptionRecord {
  return {
    fillDate: new Date("2024-01-15"),
    drugName: "Lisinopril",
    isGeneric: true,
    payerType: "COMMERCIAL",
    quantity: 30,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// calculateTrend
// ---------------------------------------------------------------------------
describe("calculateTrend", () => {
  it("returns STABLE with 0% when both current and prior are zero", () => {
    const result = calculateTrend(0, 0);
    expect(result.direction).toBe("STABLE");
    expect(result.percentChange).toBe(0);
  });

  it("returns UP with 100% when prior is zero and current is positive", () => {
    const result = calculateTrend(5, 0);
    expect(result.direction).toBe("UP");
    expect(result.percentChange).toBe(100);
  });

  it("returns STABLE when current equals prior", () => {
    const result = calculateTrend(50, 50);
    expect(result.direction).toBe("STABLE");
    expect(result.percentChange).toBe(0);
  });

  it("returns UP when change is above +5% threshold (+6%)", () => {
    const result = calculateTrend(106, 100);
    expect(result.direction).toBe("UP");
    expect(result.percentChange).toBe(6);
  });

  it("returns DOWN when change is below -5% threshold (-6%)", () => {
    const result = calculateTrend(94, 100);
    expect(result.direction).toBe("DOWN");
    expect(result.percentChange).toBe(-6);
  });

  it("returns STABLE when change is +4% (within threshold)", () => {
    const result = calculateTrend(104, 100);
    expect(result.direction).toBe("STABLE");
    expect(result.percentChange).toBe(4);
  });

  it("returns STABLE when change is -4% (within threshold)", () => {
    const result = calculateTrend(96, 100);
    expect(result.direction).toBe("STABLE");
    expect(result.percentChange).toBe(-4);
  });

  it("returns STABLE when change is exactly +5% (threshold is strict >)", () => {
    const result = calculateTrend(105, 100);
    expect(result.direction).toBe("STABLE");
    expect(result.percentChange).toBe(5);
  });

  it("returns UP with 100% for a doubling (100→200)", () => {
    const result = calculateTrend(200, 100);
    expect(result.direction).toBe("UP");
    expect(result.percentChange).toBe(100);
  });

  it("returns DOWN with -75% for a large decrease (200→50)", () => {
    const result = calculateTrend(50, 200);
    expect(result.direction).toBe("DOWN");
    expect(result.percentChange).toBe(-75);
  });
});

// ---------------------------------------------------------------------------
// calculateTopDrugs
// ---------------------------------------------------------------------------
describe("calculateTopDrugs", () => {
  it("returns empty array for empty records", () => {
    expect(calculateTopDrugs([])).toEqual([]);
  });

  it("returns a single drug with count 1 for one record", () => {
    const records = [makeRecord({ drugName: "Metformin" })];
    const result = calculateTopDrugs(records);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "METFORMIN", count: 1 });
  });

  it("ranks multiple drugs by count descending", () => {
    const records = [
      makeRecord({ drugName: "Metformin" }),
      makeRecord({ drugName: "Lisinopril" }),
      makeRecord({ drugName: "Lisinopril" }),
      makeRecord({ drugName: "Atorvastatin" }),
      makeRecord({ drugName: "Atorvastatin" }),
      makeRecord({ drugName: "Atorvastatin" }),
    ];
    const result = calculateTopDrugs(records);
    expect(result[0]).toEqual({ name: "ATORVASTATIN", count: 3 });
    expect(result[1]).toEqual({ name: "LISINOPRIL", count: 2 });
    expect(result[2]).toEqual({ name: "METFORMIN", count: 1 });
  });

  it("groups case-insensitively (lisinopril and LISINOPRIL counted together)", () => {
    const records = [
      makeRecord({ drugName: "lisinopril" }),
      makeRecord({ drugName: "LISINOPRIL" }),
      makeRecord({ drugName: "Lisinopril" }),
    ];
    const result = calculateTopDrugs(records);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "LISINOPRIL", count: 3 });
  });

  it("respects the limit parameter", () => {
    const records = [
      makeRecord({ drugName: "DrugA" }),
      makeRecord({ drugName: "DrugA" }),
      makeRecord({ drugName: "DrugB" }),
      makeRecord({ drugName: "DrugB" }),
      makeRecord({ drugName: "DrugC" }),
    ];
    const result = calculateTopDrugs(records, 2);
    expect(result).toHaveLength(2);
  });

  it("defaults to a limit of 10", () => {
    const records = Array.from({ length: 15 }, (_, i) =>
      makeRecord({ drugName: `Drug${i}` })
    );
    const result = calculateTopDrugs(records);
    expect(result).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// calculateBrandGenericRatio
// ---------------------------------------------------------------------------
describe("calculateBrandGenericRatio", () => {
  it("returns zeros and 0% for empty records", () => {
    expect(calculateBrandGenericRatio([])).toEqual({
      brand: 0,
      generic: 0,
      brandPercent: 0,
    });
  });

  it("returns brandPercent 100 when all records are brand", () => {
    const records = [
      makeRecord({ isGeneric: false }),
      makeRecord({ isGeneric: false }),
    ];
    const result = calculateBrandGenericRatio(records);
    expect(result.brand).toBe(2);
    expect(result.generic).toBe(0);
    expect(result.brandPercent).toBe(100);
  });

  it("returns brandPercent 0 when all records are generic", () => {
    const records = [
      makeRecord({ isGeneric: true }),
      makeRecord({ isGeneric: true }),
    ];
    const result = calculateBrandGenericRatio(records);
    expect(result.brand).toBe(0);
    expect(result.generic).toBe(2);
    expect(result.brandPercent).toBe(0);
  });

  it("calculates brandPercent correctly for 3 brand and 7 generic (30%)", () => {
    const records = [
      ...Array(3).fill(null).map(() => makeRecord({ isGeneric: false })),
      ...Array(7).fill(null).map(() => makeRecord({ isGeneric: true })),
    ];
    const result = calculateBrandGenericRatio(records);
    expect(result.brand).toBe(3);
    expect(result.generic).toBe(7);
    expect(result.brandPercent).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// calculatePayerMix
// ---------------------------------------------------------------------------
describe("calculatePayerMix", () => {
  it("returns empty array for empty records", () => {
    expect(calculatePayerMix([])).toEqual([]);
  });

  it("returns a single payer entry with 100% for one payer type", () => {
    const records = [
      makeRecord({ payerType: "MEDICARE" }),
      makeRecord({ payerType: "MEDICARE" }),
    ];
    const result = calculatePayerMix(records);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ type: "MEDICARE", count: 2, percent: 100 });
  });

  it("returns multiple payer types sorted by count descending", () => {
    const records = [
      makeRecord({ payerType: "COMMERCIAL" }),
      makeRecord({ payerType: "COMMERCIAL" }),
      makeRecord({ payerType: "COMMERCIAL" }),
      makeRecord({ payerType: "MEDICARE" }),
      makeRecord({ payerType: "CASH" }),
    ];
    const result = calculatePayerMix(records);
    expect(result[0].type).toBe("COMMERCIAL");
    expect(result[0].count).toBe(3);
    expect(result[1].type).toBe("MEDICARE");
    expect(result[2].type).toBe("CASH");
  });

  it("percentages sum to approximately 100", () => {
    const records = [
      ...Array(3).fill(null).map(() => makeRecord({ payerType: "COMMERCIAL" })),
      ...Array(4).fill(null).map(() => makeRecord({ payerType: "MEDICARE" })),
      ...Array(3).fill(null).map(() => makeRecord({ payerType: "CASH" })),
    ];
    const result = calculatePayerMix(records);
    const total = result.reduce((sum, r) => sum + r.percent, 0);
    expect(total).toBeCloseTo(100, 0);
  });
});

// ---------------------------------------------------------------------------
// findNewDrugs
// ---------------------------------------------------------------------------
describe("findNewDrugs", () => {
  it("returns all current drugs when there are no prior records", () => {
    const current = [
      makeRecord({ drugName: "Metformin" }),
      makeRecord({ drugName: "Lisinopril" }),
    ];
    const result = findNewDrugs(current, []);
    expect(result).toContain("METFORMIN");
    expect(result).toContain("LISINOPRIL");
    expect(result).toHaveLength(2);
  });

  it("returns empty array when the same drugs appear in both periods", () => {
    const records = [makeRecord({ drugName: "Metformin" })];
    const result = findNewDrugs(records, records);
    expect(result).toEqual([]);
  });

  it("returns only drugs that are new to the current period", () => {
    const prior = [makeRecord({ drugName: "Metformin" })];
    const current = [
      makeRecord({ drugName: "Metformin" }),
      makeRecord({ drugName: "Atorvastatin" }),
    ];
    const result = findNewDrugs(current, prior);
    expect(result).toEqual(["ATORVASTATIN"]);
  });

  it("is case insensitive when matching drugs across periods", () => {
    const prior = [makeRecord({ drugName: "metformin" })];
    const current = [makeRecord({ drugName: "METFORMIN" })];
    const result = findNewDrugs(current, prior);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// calculateConcentrationRisk
// ---------------------------------------------------------------------------
describe("calculateConcentrationRisk", () => {
  it("returns 0% for empty provider volumes", () => {
    const result = calculateConcentrationRisk([]);
    expect(result.percentOfTotal).toBe(0);
  });

  it("returns 100% when there is a single provider", () => {
    const result = calculateConcentrationRisk([{ npi: "1234567890", count: 100 }]);
    expect(result.percentOfTotal).toBe(100);
  });

  it("returns 50% for even distribution across 10 providers with top 5", () => {
    const providers = Array.from({ length: 10 }, (_, i) => ({
      npi: `NPI${i}`,
      count: 10,
    }));
    const result = calculateConcentrationRisk(providers, 5);
    expect(result.percentOfTotal).toBe(50);
    expect(result.topN).toBe(5);
  });

  it("calculates concentration correctly for a skewed distribution", () => {
    const providers = [
      { npi: "NPI1", count: 80 },
      { npi: "NPI2", count: 10 },
      { npi: "NPI3", count: 10 },
    ];
    const result = calculateConcentrationRisk(providers, 1);
    expect(result.percentOfTotal).toBe(80);
    expect(result.topN).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findNewPrescribers
// ---------------------------------------------------------------------------
describe("findNewPrescribers", () => {
  it("returns empty array when both sets are empty", () => {
    expect(findNewPrescribers(new Set(), new Set())).toEqual([]);
  });

  it("returns all current NPIs when prior set is empty (all are new)", () => {
    const current = new Set(["1111111111", "2222222222"]);
    const result = findNewPrescribers(current, new Set());
    expect(result).toHaveLength(2);
    expect(result).toContain("1111111111");
    expect(result).toContain("2222222222");
  });

  it("returns only NPIs in current that are not in prior", () => {
    const current = new Set(["1111111111", "3333333333"]);
    const prior = new Set(["1111111111", "2222222222"]);
    const result = findNewPrescribers(current, prior);
    expect(result).toEqual(["3333333333"]);
  });

  it("returns empty array when current and prior sets are identical", () => {
    const npis = new Set(["1111111111", "2222222222"]);
    expect(findNewPrescribers(npis, npis)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findDormantPrescribers
// ---------------------------------------------------------------------------
describe("findDormantPrescribers", () => {
  it("returns empty array when both sets are empty", () => {
    expect(findDormantPrescribers(new Set(), new Set())).toEqual([]);
  });

  it("returns all prior NPIs when current set is empty (all dormant)", () => {
    const prior = new Set(["1111111111", "2222222222"]);
    const result = findDormantPrescribers(new Set(), prior);
    expect(result).toHaveLength(2);
    expect(result).toContain("1111111111");
    expect(result).toContain("2222222222");
  });

  it("returns only NPIs in prior that are not in current", () => {
    const current = new Set(["1111111111"]);
    const prior = new Set(["1111111111", "2222222222"]);
    const result = findDormantPrescribers(current, prior);
    expect(result).toEqual(["2222222222"]);
  });

  it("returns empty array when current and prior sets are identical", () => {
    const npis = new Set(["1111111111", "2222222222"]);
    expect(findDormantPrescribers(npis, npis)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// calculateProviderAnalytics (integration)
// ---------------------------------------------------------------------------
describe("calculateProviderAnalytics", () => {
  it("computes correct analytics from realistic data", () => {
    const current: PrescriptionRecord[] = [
      makeRecord({ drugName: "Lisinopril", isGeneric: true, payerType: "COMMERCIAL" }),
      makeRecord({ drugName: "Lisinopril", isGeneric: true, payerType: "MEDICARE" }),
      makeRecord({ drugName: "Atorvastatin", isGeneric: false, payerType: "COMMERCIAL" }),
    ];
    const prior: PrescriptionRecord[] = [
      makeRecord({ drugName: "Lisinopril", isGeneric: true, payerType: "COMMERCIAL" }),
      makeRecord({ drugName: "Metformin", isGeneric: true, payerType: "CASH" }),
    ];

    const result = calculateProviderAnalytics(current, prior, 28);

    expect(result.rxVolume).toBe(3);
    expect(result.priorRxVolume).toBe(2);
    expect(result.trendDirection).toBe("UP");
    expect(result.rxPerWeek).toBe(0.8); // 3 / 4 weeks = 0.75, rounded to 1 decimal = 0.8
    expect(result.topDrugs[0].name).toBe("LISINOPRIL");
    expect(result.topDrugs[0].count).toBe(2);
    expect(result.brandGenericRatio.brand).toBe(1);
    expect(result.brandGenericRatio.generic).toBe(2);
    expect(result.payerMix.length).toBeGreaterThan(0);
    // ATORVASTATIN is new; METFORMIN is dormant (not in current); LISINOPRIL is shared
    expect(result.newDrugs).toContain("ATORVASTATIN");
    expect(result.newDrugs).not.toContain("LISINOPRIL");
  });

  it("handles empty current records gracefully", () => {
    const prior: PrescriptionRecord[] = [
      makeRecord({ drugName: "Lisinopril" }),
    ];
    const result = calculateProviderAnalytics([], prior, 28);

    expect(result.rxVolume).toBe(0);
    expect(result.priorRxVolume).toBe(1);
    expect(result.trendDirection).toBe("DOWN");
    expect(result.topDrugs).toEqual([]);
    expect(result.brandGenericRatio).toEqual({ brand: 0, generic: 0, brandPercent: 0 });
    expect(result.payerMix).toEqual([]);
    expect(result.newDrugs).toEqual([]);
  });

  it("returns STABLE trend when volumes are equal", () => {
    const record = makeRecord();
    const result = calculateProviderAnalytics([record], [record], 7);
    expect(result.trendDirection).toBe("STABLE");
  });

  it("calculates rxPerWeek correctly for a 7-day period", () => {
    const records = [makeRecord(), makeRecord(), makeRecord()];
    const result = calculateProviderAnalytics(records, [], 7);
    expect(result.rxPerWeek).toBe(3);
  });
});

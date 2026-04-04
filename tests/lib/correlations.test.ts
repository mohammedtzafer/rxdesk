import { describe, it, expect } from "vitest";
import {
  calculateCorrelations,
  type VisitData,
  type RxRecord,
} from "@/lib/correlations";

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

let visitCounter = 0;
let providerCounter = 0;

function makeVisit(overrides: Partial<VisitData> = {}): VisitData {
  visitCounter++;
  return {
    id: `visit-${visitCounter}`,
    visitDate: new Date("2024-06-01"),
    drugsPromoted: [{ name: "DrugA" }],
    repName: `Rep ${visitCounter}`,
    company: `Company ${visitCounter}`,
    providerIds: [`provider-${visitCounter}`],
    ...overrides,
  };
}

function makeRx(overrides: Partial<RxRecord> = {}): RxRecord {
  providerCounter++;
  return {
    providerId: "provider-1",
    fillDate: new Date("2024-06-01"),
    drugName: "DrugA",
    isGeneric: true,
    ...overrides,
  };
}

// Offset a date by N days (positive = future, negative = past)
function daysFrom(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// Basic behavior
// ---------------------------------------------------------------------------

describe("calculateCorrelations — basic behavior", () => {
  it("returns empty array for empty visits", () => {
    const result = calculateCorrelations([], []);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty visits even with Rx records", () => {
    const rx = [makeRx({ providerId: "p1" })];
    const result = calculateCorrelations([], rx);
    expect(result).toEqual([]);
  });

  it("returns correlations with 0 volumes when no Rx records exist", () => {
    const visit = makeVisit({ providerIds: ["p1"] });
    const result = calculateCorrelations([visit], []);
    expect(result).toHaveLength(1);
    expect(result[0].preVisitVolume).toBe(0);
    expect(result[0].postVisitVolume).toBe(0);
    expect(result[0].volumeChange).toBe(0);
  });

  it("produces one correlation for a single visit with a single provider", () => {
    const visitDate = new Date("2024-06-01");
    const visit = makeVisit({ visitDate, providerIds: ["p1"] });
    const preRx = makeRx({ providerId: "p1", fillDate: daysFrom(visitDate, -10) });
    const postRx = makeRx({ providerId: "p1", fillDate: daysFrom(visitDate, 10) });

    const result = calculateCorrelations([visit], [preRx, postRx]);
    expect(result).toHaveLength(1);
    expect(result[0].preVisitVolume).toBe(1);
    expect(result[0].postVisitVolume).toBe(1);
  });

  it("produces one correlation per provider when a visit has multiple providers", () => {
    const visit = makeVisit({ providerIds: ["p1", "p2", "p3"] });
    const result = calculateCorrelations([visit], []);
    expect(result).toHaveLength(3);
    const providerIds = result.map((c) => c.providerId);
    expect(providerIds).toContain("p1");
    expect(providerIds).toContain("p2");
    expect(providerIds).toContain("p3");
  });

  it("carries visitId, repName, company, and visitDate onto each correlation", () => {
    const visitDate = new Date("2024-03-15");
    const visit = makeVisit({
      id: "visit-abc",
      visitDate,
      repName: "Jane Doe",
      company: "Pharma Co",
      providerIds: ["p1"],
    });
    const result = calculateCorrelations([visit], []);
    expect(result[0].visitId).toBe("visit-abc");
    expect(result[0].repName).toBe("Jane Doe");
    expect(result[0].company).toBe("Pharma Co");
    expect(result[0].visitDate).toEqual(visitDate);
  });
});

// ---------------------------------------------------------------------------
// Volume calculation
// ---------------------------------------------------------------------------

describe("calculateCorrelations — volume calculation", () => {
  const visitDate = new Date("2024-06-15");
  const providerId = "vol-provider";

  it("counts Rx exactly 28 days before the visit in the pre-visit window", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const boundaryRx = makeRx({ providerId, fillDate: daysFrom(visitDate, -28) });
    const result = calculateCorrelations([visit], [boundaryRx]);
    expect(result[0].preVisitVolume).toBe(1);
  });

  it("excludes Rx more than 28 days before the visit", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const tooEarlyRx = makeRx({ providerId, fillDate: daysFrom(visitDate, -29) });
    const result = calculateCorrelations([visit], [tooEarlyRx]);
    expect(result[0].preVisitVolume).toBe(0);
  });

  it("counts Rx on the visit date itself in the post-visit window", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const onDayRx = makeRx({ providerId, fillDate: visitDate });
    const result = calculateCorrelations([visit], [onDayRx]);
    expect(result[0].postVisitVolume).toBe(1);
    expect(result[0].preVisitVolume).toBe(0);
  });

  it("counts Rx exactly 28 days after the visit in the post-visit window", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const boundaryRx = makeRx({ providerId, fillDate: daysFrom(visitDate, 28) });
    const result = calculateCorrelations([visit], [boundaryRx]);
    expect(result[0].postVisitVolume).toBe(1);
  });

  it("excludes Rx more than 28 days after the visit", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const tooLateRx = makeRx({ providerId, fillDate: daysFrom(visitDate, 29) });
    const result = calculateCorrelations([visit], [tooLateRx]);
    expect(result[0].postVisitVolume).toBe(0);
  });

  it("Rx 1ms before visit date falls in pre-visit window", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const almostOnDayRx = makeRx({
      providerId,
      fillDate: new Date(visitDate.getTime() - 1),
    });
    const result = calculateCorrelations([visit], [almostOnDayRx]);
    expect(result[0].preVisitVolume).toBe(1);
    expect(result[0].postVisitVolume).toBe(0);
  });

  it("calculates volumeChange as post minus pre", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const rxRecords = [
      makeRx({ providerId, fillDate: daysFrom(visitDate, -5) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, -10) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, 5) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, 10) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, 15) }),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].preVisitVolume).toBe(2);
    expect(result[0].postVisitVolume).toBe(3);
    expect(result[0].volumeChange).toBe(1);
  });

  it("calculates percentChange correctly when pre-visit > 0 (50% increase)", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const rxRecords = [
      makeRx({ providerId, fillDate: daysFrom(visitDate, -5) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, -10) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, 5) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, 10) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, 15) }),
    ];
    // pre=2, post=3 → 50% increase
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].percentChange).toBe(50);
  });

  it("returns percentChange of 100 when prior volume is 0 and post is > 0", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const postRx = makeRx({ providerId, fillDate: daysFrom(visitDate, 5) });
    const result = calculateCorrelations([visit], [postRx]);
    expect(result[0].preVisitVolume).toBe(0);
    expect(result[0].postVisitVolume).toBe(1);
    expect(result[0].percentChange).toBe(100);
  });

  it("returns percentChange of 0 when both pre and post volumes are 0", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const result = calculateCorrelations([visit], []);
    expect(result[0].percentChange).toBe(0);
  });

  it("excludes Rx records belonging to a different provider", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const otherRx = makeRx({
      providerId: "some-other-provider",
      fillDate: daysFrom(visitDate, -5),
    });
    const result = calculateCorrelations([visit], [otherRx]);
    expect(result[0].preVisitVolume).toBe(0);
    expect(result[0].postVisitVolume).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// New drugs after visit
// ---------------------------------------------------------------------------

describe("calculateCorrelations — new drugs after visit", () => {
  const visitDate = new Date("2024-06-15");
  const providerId = "new-drug-provider";

  it("flags a promoted drug that appears post-visit but not pre-visit", () => {
    const visit = makeVisit({
      visitDate,
      providerIds: [providerId],
      drugsPromoted: [{ name: "Keytruda" }],
    });
    const postRx = makeRx({ providerId, fillDate: daysFrom(visitDate, 7), drugName: "Keytruda" });
    const result = calculateCorrelations([visit], [postRx]);
    expect(result[0].newDrugsAfterVisit).toContain("KEYTRUDA");
  });

  it("does NOT flag a drug that appears post-visit but was NOT promoted", () => {
    const visit = makeVisit({
      visitDate,
      providerIds: [providerId],
      drugsPromoted: [{ name: "DrugA" }],
    });
    const postRx = makeRx({ providerId, fillDate: daysFrom(visitDate, 7), drugName: "Metformin" });
    const result = calculateCorrelations([visit], [postRx]);
    expect(result[0].newDrugsAfterVisit).not.toContain("METFORMIN");
    expect(result[0].newDrugsAfterVisit).toHaveLength(0);
  });

  it("does NOT flag a promoted drug that also existed in the pre-visit window", () => {
    const visit = makeVisit({
      visitDate,
      providerIds: [providerId],
      drugsPromoted: [{ name: "Keytruda" }],
    });
    const preRx = makeRx({ providerId, fillDate: daysFrom(visitDate, -7), drugName: "Keytruda" });
    const postRx = makeRx({ providerId, fillDate: daysFrom(visitDate, 7), drugName: "Keytruda" });
    const result = calculateCorrelations([visit], [preRx, postRx]);
    expect(result[0].newDrugsAfterVisit).toHaveLength(0);
  });

  it("matches drug names case-insensitively between promoted list and Rx records", () => {
    const visit = makeVisit({
      visitDate,
      providerIds: [providerId],
      drugsPromoted: [{ name: "keytruda" }],
    });
    const postRx = makeRx({ providerId, fillDate: daysFrom(visitDate, 7), drugName: "KEYTRUDA" });
    const result = calculateCorrelations([visit], [postRx]);
    expect(result[0].newDrugsAfterVisit).toContain("KEYTRUDA");
  });

  it("can flag multiple new drugs in a single correlation", () => {
    const visit = makeVisit({
      visitDate,
      providerIds: [providerId],
      drugsPromoted: [{ name: "DrugX" }, { name: "DrugY" }],
    });
    const rxRecords = [
      makeRx({ providerId, fillDate: daysFrom(visitDate, 5), drugName: "DrugX" }),
      makeRx({ providerId, fillDate: daysFrom(visitDate, 10), drugName: "DrugY" }),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].newDrugsAfterVisit).toContain("DRUGX");
    expect(result[0].newDrugsAfterVisit).toContain("DRUGY");
  });

  it("returns empty newDrugsAfterVisit when there are no post-visit records", () => {
    const visit = makeVisit({
      visitDate,
      providerIds: [providerId],
      drugsPromoted: [{ name: "DrugA" }],
    });
    const preRx = makeRx({ providerId, fillDate: daysFrom(visitDate, -5), drugName: "DrugA" });
    const result = calculateCorrelations([visit], [preRx]);
    expect(result[0].newDrugsAfterVisit).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Brand shift
// ---------------------------------------------------------------------------

describe("calculateCorrelations — brand shift", () => {
  const visitDate = new Date("2024-06-15");
  const providerId = "brand-provider";

  function brandRx(fillDate: Date): RxRecord {
    return makeRx({ providerId, fillDate, isGeneric: false });
  }

  function genericRx(fillDate: Date): RxRecord {
    return makeRx({ providerId, fillDate, isGeneric: true });
  }

  it("returns null brandShift when pre-visit has fewer than 3 records", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const rxRecords = [
      brandRx(daysFrom(visitDate, -5)),
      brandRx(daysFrom(visitDate, -10)),
      // only 2 pre-visit records
      brandRx(daysFrom(visitDate, 5)),
      brandRx(daysFrom(visitDate, 10)),
      brandRx(daysFrom(visitDate, 15)),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].brandShift).toBeNull();
  });

  it("returns null brandShift when post-visit has fewer than 3 records", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const rxRecords = [
      brandRx(daysFrom(visitDate, -5)),
      brandRx(daysFrom(visitDate, -10)),
      brandRx(daysFrom(visitDate, -15)),
      // only 2 post-visit records
      brandRx(daysFrom(visitDate, 5)),
      brandRx(daysFrom(visitDate, 10)),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].brandShift).toBeNull();
  });

  it("calculates brandShift when both sides have 3 or more records", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const rxRecords = [
      // 3 pre-visit: all generic → 0% brand
      genericRx(daysFrom(visitDate, -5)),
      genericRx(daysFrom(visitDate, -10)),
      genericRx(daysFrom(visitDate, -15)),
      // 4 post-visit: 2 brand, 2 generic → 50% brand
      brandRx(daysFrom(visitDate, 5)),
      brandRx(daysFrom(visitDate, 10)),
      genericRx(daysFrom(visitDate, 15)),
      genericRx(daysFrom(visitDate, 20)),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].brandShift).not.toBeNull();
    expect(result[0].brandShift!.preBrandPercent).toBe(0);
    expect(result[0].brandShift!.postBrandPercent).toBe(50);
    expect(result[0].brandShift!.shift).toBe(50);
  });

  it("calculates correct brand percentages: 3 brand out of 3 pre = 100%", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const rxRecords = [
      // 3 pre-visit: all brand → 100%
      brandRx(daysFrom(visitDate, -5)),
      brandRx(daysFrom(visitDate, -10)),
      brandRx(daysFrom(visitDate, -15)),
      // 3 post-visit: all generic → 0%
      genericRx(daysFrom(visitDate, 5)),
      genericRx(daysFrom(visitDate, 10)),
      genericRx(daysFrom(visitDate, 15)),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].brandShift).not.toBeNull();
    expect(result[0].brandShift!.preBrandPercent).toBe(100);
    expect(result[0].brandShift!.postBrandPercent).toBe(0);
    expect(result[0].brandShift!.shift).toBe(-100);
  });

  it("shows 0% brand on both sides when all records are generic", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    const rxRecords = [
      genericRx(daysFrom(visitDate, -5)),
      genericRx(daysFrom(visitDate, -10)),
      genericRx(daysFrom(visitDate, -15)),
      genericRx(daysFrom(visitDate, 5)),
      genericRx(daysFrom(visitDate, 10)),
      genericRx(daysFrom(visitDate, 15)),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    expect(result[0].brandShift).not.toBeNull();
    expect(result[0].brandShift!.preBrandPercent).toBe(0);
    expect(result[0].brandShift!.postBrandPercent).toBe(0);
    expect(result[0].brandShift!.shift).toBe(0);
  });

  it("shift is postBrandPercent minus preBrandPercent", () => {
    const visit = makeVisit({ visitDate, providerIds: [providerId] });
    // pre: 1 of 3 brand = 33.3%
    // post: 3 of 3 brand = 100%
    // shift = 100 - 33.3 = 66.7
    const rxRecords = [
      brandRx(daysFrom(visitDate, -5)),
      genericRx(daysFrom(visitDate, -10)),
      genericRx(daysFrom(visitDate, -15)),
      brandRx(daysFrom(visitDate, 5)),
      brandRx(daysFrom(visitDate, 10)),
      brandRx(daysFrom(visitDate, 15)),
    ];
    const result = calculateCorrelations([visit], rxRecords);
    const bs = result[0].brandShift!;
    expect(bs.shift).toBeCloseTo(bs.postBrandPercent - bs.preBrandPercent, 1);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("calculateCorrelations — edge cases", () => {
  it("produces no correlations for a visit with no providers", () => {
    const visit = makeVisit({ providerIds: [] });
    const result = calculateCorrelations([visit], []);
    expect(result).toHaveLength(0);
  });

  it("produces separate correlations for multiple visits to the same provider", () => {
    const providerId = "shared-provider";
    const visitDate1 = new Date("2024-03-01");
    const visitDate2 = new Date("2024-06-01");
    const visit1 = makeVisit({ id: "v1", visitDate: visitDate1, providerIds: [providerId] });
    const visit2 = makeVisit({ id: "v2", visitDate: visitDate2, providerIds: [providerId] });

    const rxRecords = [
      makeRx({ providerId, fillDate: daysFrom(visitDate1, -5) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate1, 5) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate2, -5) }),
      makeRx({ providerId, fillDate: daysFrom(visitDate2, 5) }),
    ];

    const result = calculateCorrelations([visit1, visit2], rxRecords);
    expect(result).toHaveLength(2);

    const corr1 = result.find((c) => c.visitId === "v1")!;
    const corr2 = result.find((c) => c.visitId === "v2")!;

    expect(corr1.visitId).toBe("v1");
    expect(corr2.visitId).toBe("v2");
    expect(corr1.visitDate).toEqual(visitDate1);
    expect(corr2.visitDate).toEqual(visitDate2);
  });

  it("visit with empty drugsPromoted results in no newDrugsAfterVisit", () => {
    const visitDate = new Date("2024-06-15");
    const visit = makeVisit({ visitDate, providerIds: ["p-empty"], drugsPromoted: [] });
    const postRx = makeRx({ providerId: "p-empty", fillDate: daysFrom(visitDate, 5), drugName: "SomeDrug" });
    const result = calculateCorrelations([visit], [postRx]);
    expect(result[0].newDrugsAfterVisit).toHaveLength(0);
  });

  it("handles multiple visits with different providers, each correlation is isolated", () => {
    const visitDate = new Date("2024-06-15");
    const visit = makeVisit({ visitDate, providerIds: ["pa", "pb"] });

    const rxRecords = [
      // 2 pre Rx for pa, 1 post for pa
      makeRx({ providerId: "pa", fillDate: daysFrom(visitDate, -5) }),
      makeRx({ providerId: "pa", fillDate: daysFrom(visitDate, -10) }),
      makeRx({ providerId: "pa", fillDate: daysFrom(visitDate, 5) }),
      // 0 pre for pb, 3 post for pb
      makeRx({ providerId: "pb", fillDate: daysFrom(visitDate, 5) }),
      makeRx({ providerId: "pb", fillDate: daysFrom(visitDate, 10) }),
      makeRx({ providerId: "pb", fillDate: daysFrom(visitDate, 15) }),
    ];

    const result = calculateCorrelations([visit], rxRecords);
    expect(result).toHaveLength(2);

    const corrA = result.find((c) => c.providerId === "pa")!;
    const corrB = result.find((c) => c.providerId === "pb")!;

    expect(corrA.preVisitVolume).toBe(2);
    expect(corrA.postVisitVolume).toBe(1);
    expect(corrB.preVisitVolume).toBe(0);
    expect(corrB.postVisitVolume).toBe(3);
    expect(corrB.percentChange).toBe(100); // prior=0, post>0
  });
});

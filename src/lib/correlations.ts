// Drug rep visit / Rx volume correlation analysis — pure functions

export interface VisitData {
  id: string;
  visitDate: Date;
  drugsPromoted: Array<{ name: string }>;
  repName: string;
  company: string;
  providerIds: string[];
}

export interface RxRecord {
  providerId: string;
  fillDate: Date;
  drugName: string;
  isGeneric: boolean;
}

export interface Correlation {
  visitId: string;
  visitDate: Date;
  repName: string;
  company: string;
  providerId: string;
  preVisitVolume: number;
  postVisitVolume: number;
  volumeChange: number;
  percentChange: number;
  newDrugsAfterVisit: string[];
  brandShift: {
    preBrandPercent: number;
    postBrandPercent: number;
    shift: number;
  } | null;
}

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

export function calculateCorrelations(
  visits: VisitData[],
  rxRecords: RxRecord[]
): Correlation[] {
  const correlations: Correlation[] = [];

  for (const visit of visits) {
    const visitTime = visit.visitDate.getTime();
    const preStart = visitTime - FOUR_WEEKS_MS;
    const postEnd = visitTime + FOUR_WEEKS_MS;

    for (const providerId of visit.providerIds) {
      const providerRx = rxRecords.filter((r) => r.providerId === providerId);

      const preVisitRx = providerRx.filter(
        (r) => r.fillDate.getTime() >= preStart && r.fillDate.getTime() < visitTime
      );
      const postVisitRx = providerRx.filter(
        (r) => r.fillDate.getTime() >= visitTime && r.fillDate.getTime() <= postEnd
      );

      const preVisitVolume = preVisitRx.length;
      const postVisitVolume = postVisitRx.length;
      const volumeChange = postVisitVolume - preVisitVolume;
      const percentChange =
        preVisitVolume > 0
          ? Math.round(((postVisitVolume - preVisitVolume) / preVisitVolume) * 1000) / 10
          : postVisitVolume > 0
          ? 100
          : 0;

      // New drugs: appeared post-visit that were not in pre-visit window, and were promoted
      const preDrugs = new Set(preVisitRx.map((r) => r.drugName.toUpperCase()));
      const postDrugs = new Set(postVisitRx.map((r) => r.drugName.toUpperCase()));
      const promotedDrugs = new Set(visit.drugsPromoted.map((d) => d.name.toUpperCase()));

      const newDrugsAfterVisit = Array.from(postDrugs).filter(
        (drug) => !preDrugs.has(drug) && promotedDrugs.has(drug)
      );

      // Brand/generic shift — only computed when there's enough signal on both sides
      let brandShift: Correlation["brandShift"] = null;
      if (preVisitRx.length >= 3 && postVisitRx.length >= 3) {
        const preBrand = preVisitRx.filter((r) => !r.isGeneric).length;
        const postBrand = postVisitRx.filter((r) => !r.isGeneric).length;
        const preBrandPercent = Math.round((preBrand / preVisitRx.length) * 1000) / 10;
        const postBrandPercent = Math.round((postBrand / postVisitRx.length) * 1000) / 10;
        brandShift = {
          preBrandPercent,
          postBrandPercent,
          shift: Math.round((postBrandPercent - preBrandPercent) * 10) / 10,
        };
      }

      correlations.push({
        visitId: visit.id,
        visitDate: visit.visitDate,
        repName: visit.repName,
        company: visit.company,
        providerId,
        preVisitVolume,
        postVisitVolume,
        volumeChange,
        percentChange,
        newDrugsAfterVisit,
        brandShift,
      });
    }
  }

  return correlations;
}

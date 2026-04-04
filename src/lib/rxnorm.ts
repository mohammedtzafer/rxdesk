// RxNorm API — free, no authentication required
// Docs: https://lhncbc.nlm.nih.gov/RxNav/APIs/

const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";

export interface RxNormDrug {
  rxcui: string;
  name: string;
  synonym: string;
  tty: string; // Term Type (SBD, SCD, GPCK, etc.)
}

export interface RxNormDrugDetails {
  rxcui: string;
  name: string;
  brandName?: string;
  genericName?: string;
  dosageForm?: string;
  route?: string;
  strength?: string;
  ndc: string[];
}

export async function searchDrugs(query: string, limit: number = 20): Promise<RxNormDrug[]> {
  const res = await fetch(
    `${RXNORM_BASE}/drugs.json?name=${encodeURIComponent(query)}`
  );

  if (!res.ok) throw new Error(`RxNorm API error: ${res.status}`);

  const data = await res.json();
  const conceptGroups = data?.drugGroup?.conceptGroup || [];

  const drugs: RxNormDrug[] = [];
  for (const group of conceptGroups) {
    for (const prop of group.conceptProperties || []) {
      drugs.push({
        rxcui: prop.rxcui,
        name: prop.name,
        synonym: prop.synonym || "",
        tty: prop.tty,
      });
      if (drugs.length >= limit) break;
    }
    if (drugs.length >= limit) break;
  }

  return drugs;
}

export async function getDrugByRxcui(rxcui: string): Promise<RxNormDrugDetails | null> {
  const [propertiesRes, ndcRes] = await Promise.all([
    fetch(`${RXNORM_BASE}/rxcui/${rxcui}/properties.json`),
    fetch(`${RXNORM_BASE}/rxcui/${rxcui}/ndcs.json`),
  ]);

  if (!propertiesRes.ok) return null;

  const propsData = await propertiesRes.json();
  const props = propsData?.properties;
  if (!props) return null;

  let ndcs: string[] = [];
  if (ndcRes.ok) {
    const ndcData = await ndcRes.json();
    ndcs = ndcData?.ndcGroup?.ndcList?.ndc || [];
  }

  return {
    rxcui: props.rxcui,
    name: props.name,
    dosageForm: props.dosageFormGroupName || undefined,
    route: props.routeName || undefined,
    strength: props.quantityName || undefined,
    ndc: ndcs.slice(0, 20),
  };
}

export async function getDrugInteractions(rxcui: string): Promise<Array<{
  severity: string;
  description: string;
  drug1: string;
  drug2: string;
}>> {
  const res = await fetch(
    `${RXNORM_BASE}/interaction/interaction.json?rxcui=${rxcui}`
  );

  if (!res.ok) return [];

  const data = await res.json();
  const pairs = data?.interactionTypeGroup?.[0]?.interactionType?.[0]?.interactionPair || [];

  return pairs.map((pair: { severity: string; description: string; interactionConcept: Array<{ minConceptItem: { name: string } }> }) => ({
    severity: pair.severity || "N/A",
    description: pair.description,
    drug1: pair.interactionConcept?.[0]?.minConceptItem?.name || "",
    drug2: pair.interactionConcept?.[1]?.minConceptItem?.name || "",
  }));
}

export async function getSpellingSuggestions(query: string): Promise<string[]> {
  const res = await fetch(
    `${RXNORM_BASE}/spellingsuggestions.json?name=${encodeURIComponent(query)}`
  );

  if (!res.ok) return [];

  const data = await res.json();
  return data?.suggestionGroup?.suggestionList?.suggestion || [];
}

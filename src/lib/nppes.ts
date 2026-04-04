// NPPES NPI Registry API proxy
// Docs: https://npiregistry.cms.hhs.gov/api/

const NPPES_BASE_URL = "https://npiregistry.cms.hhs.gov/api/";

export interface NppesResult {
  npi: string;
  firstName: string;
  lastName: string;
  suffix: string;
  credential: string;
  specialty: string;
  practiceName: string;
  practiceAddress: string;
  practiceCity: string;
  practiceState: string;
  practiceZip: string;
  practicePhone: string;
}

interface NppesApiResponse {
  result_count: number;
  results: Array<{
    number: string;
    basic?: {
      first_name?: string;
      last_name?: string;
      name_suffix?: string;
      credential?: string;
      name?: string;
      organization_name?: string;
    };
    taxonomies?: Array<{
      desc?: string;
      primary?: boolean;
    }>;
    addresses?: Array<{
      address_purpose?: string;
      address_1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      telephone_number?: string;
    }>;
  }>;
}

function parseNppesResult(raw: NppesApiResponse["results"][0]): NppesResult {
  const basic = raw.basic || {};
  const primaryTaxonomy = raw.taxonomies?.find((t) => t.primary) || raw.taxonomies?.[0];
  const practiceAddress = raw.addresses?.find((a) => a.address_purpose === "LOCATION") || raw.addresses?.[0];

  return {
    npi: raw.number,
    firstName: basic.first_name || "",
    lastName: basic.last_name || "",
    suffix: basic.name_suffix || "",
    credential: basic.credential || "",
    specialty: primaryTaxonomy?.desc || "",
    practiceName: basic.organization_name || basic.name || "",
    practiceAddress: practiceAddress?.address_1 || "",
    practiceCity: practiceAddress?.city || "",
    practiceState: practiceAddress?.state || "",
    practiceZip: practiceAddress?.postal_code?.slice(0, 5) || "",
    practicePhone: practiceAddress?.telephone_number || "",
  };
}

export async function searchNppes(params: {
  npi?: string;
  firstName?: string;
  lastName?: string;
  state?: string;
  city?: string;
  specialty?: string;
  limit?: number;
}): Promise<NppesResult[]> {
  const searchParams = new URLSearchParams();
  searchParams.set("version", "2.1");
  searchParams.set("enumeration_type", "NPI-1"); // Individual providers only

  if (params.npi) searchParams.set("number", params.npi);
  if (params.firstName) searchParams.set("first_name", `${params.firstName}*`);
  if (params.lastName) searchParams.set("last_name", `${params.lastName}*`);
  if (params.state) searchParams.set("state", params.state);
  if (params.city) searchParams.set("city", params.city);
  if (params.specialty) searchParams.set("taxonomy_description", `${params.specialty}*`);
  searchParams.set("limit", String(params.limit || 20));

  const response = await fetch(`${NPPES_BASE_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`NPPES API error: ${response.status}`);
  }

  const data: NppesApiResponse = await response.json();

  if (!data.results || data.result_count === 0) {
    return [];
  }

  return data.results.map(parseNppesResult);
}

export async function lookupNpi(npi: string): Promise<NppesResult | null> {
  const results = await searchNppes({ npi, limit: 1 });
  return results[0] || null;
}

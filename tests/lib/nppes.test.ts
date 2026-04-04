import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchNppes, lookupNpi, type NppesResult } from "@/lib/nppes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeApiResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    number: "1234567890",
    basic: {
      first_name: "Jane",
      last_name: "Smith",
      name_suffix: "MD",
      credential: "M.D.",
    },
    taxonomies: [
      { desc: "Internal Medicine", primary: true },
      { desc: "Cardiology", primary: false },
    ],
    addresses: [
      {
        address_purpose: "MAILING",
        address_1: "PO Box 100",
        city: "MailCity",
        state: "TX",
        postal_code: "75201",
        telephone_number: "214-000-0000",
      },
      {
        address_purpose: "LOCATION",
        address_1: "456 Practice Ave",
        city: "Dallas",
        state: "TX",
        postal_code: "752011234",
        telephone_number: "214-555-1234",
      },
    ],
    ...overrides,
  };
}

function makeApiResponse(
  results: Record<string, unknown>[],
  resultCount?: number
): Record<string, unknown> {
  return {
    result_count: resultCount ?? results.length,
    results,
  };
}

function mockFetchOk(body: Record<string, unknown>): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
    })
  );
}

function mockFetchError(status: number): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({}),
    })
  );
}

// ---------------------------------------------------------------------------
// searchNppes — happy path
// ---------------------------------------------------------------------------

describe("searchNppes — happy path", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns correctly parsed results for a valid API response", async () => {
    mockFetchOk(makeApiResponse([makeApiResult()]));

    const results = await searchNppes({ firstName: "Jane", lastName: "Smith" });

    expect(results).toHaveLength(1);
    const r = results[0];
    expect(r.npi).toBe("1234567890");
    expect(r.firstName).toBe("Jane");
    expect(r.lastName).toBe("Smith");
    expect(r.suffix).toBe("MD");
    expect(r.credential).toBe("M.D.");
  });

  it("returns an empty array when result_count is 0", async () => {
    mockFetchOk({ result_count: 0, results: [] });

    const results = await searchNppes({ lastName: "Nobody" });

    expect(results).toEqual([]);
  });

  it("returns an empty array when results field is absent", async () => {
    mockFetchOk({ result_count: 0 });

    const results = await searchNppes({ lastName: "Nobody" });

    expect(results).toEqual([]);
  });

  it("throws when the API response is not ok (500)", async () => {
    mockFetchError(500);

    await expect(searchNppes({ lastName: "Smith" })).rejects.toThrow("NPPES API error: 500");
  });

  it("throws when the API response is not ok (429)", async () => {
    mockFetchError(429);

    await expect(searchNppes({ lastName: "Smith" })).rejects.toThrow("NPPES API error: 429");
  });

  it("returns multiple results when API returns multiple records", async () => {
    const result1 = makeApiResult({ number: "1111111111" });
    const result2 = makeApiResult({ number: "2222222222" });
    mockFetchOk(makeApiResponse([result1, result2]));

    const results = await searchNppes({ lastName: "Smith" });

    expect(results).toHaveLength(2);
    expect(results[0].npi).toBe("1111111111");
    expect(results[1].npi).toBe("2222222222");
  });
});

// ---------------------------------------------------------------------------
// searchNppes — query parameter construction
// ---------------------------------------------------------------------------

describe("searchNppes — query parameter construction", () => {
  beforeEach(() => {
    mockFetchOk(makeApiResponse([]));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function capturedUrl(): URL {
    const mockFetch = vi.mocked(globalThis.fetch);
    const rawUrl = mockFetch.mock.calls[0][0] as string;
    return new URL(rawUrl);
  }

  it("always sets version=2.1", async () => {
    await searchNppes({});
    expect(capturedUrl().searchParams.get("version")).toBe("2.1");
  });

  it("always sets enumeration_type=NPI-1", async () => {
    await searchNppes({});
    expect(capturedUrl().searchParams.get("enumeration_type")).toBe("NPI-1");
  });

  it("sets number param when npi is provided", async () => {
    await searchNppes({ npi: "1234567890" });
    expect(capturedUrl().searchParams.get("number")).toBe("1234567890");
  });

  it("appends wildcard (*) to firstName", async () => {
    await searchNppes({ firstName: "Jane" });
    expect(capturedUrl().searchParams.get("first_name")).toBe("Jane*");
  });

  it("appends wildcard (*) to lastName", async () => {
    await searchNppes({ lastName: "Smith" });
    expect(capturedUrl().searchParams.get("last_name")).toBe("Smith*");
  });

  it("sets state param when provided", async () => {
    await searchNppes({ state: "TX" });
    expect(capturedUrl().searchParams.get("state")).toBe("TX");
  });

  it("sets city param when provided", async () => {
    await searchNppes({ city: "Dallas" });
    expect(capturedUrl().searchParams.get("city")).toBe("Dallas");
  });

  it("appends wildcard (*) to specialty/taxonomy_description", async () => {
    await searchNppes({ specialty: "Internal Medicine" });
    expect(capturedUrl().searchParams.get("taxonomy_description")).toBe("Internal Medicine*");
  });

  it("defaults limit to 20 when not specified", async () => {
    await searchNppes({});
    expect(capturedUrl().searchParams.get("limit")).toBe("20");
  });

  it("uses provided limit value", async () => {
    await searchNppes({ limit: 5 });
    expect(capturedUrl().searchParams.get("limit")).toBe("5");
  });

  it("does not set first_name param when firstName is omitted", async () => {
    await searchNppes({ lastName: "Smith" });
    expect(capturedUrl().searchParams.get("first_name")).toBeNull();
  });

  it("does not set last_name param when lastName is omitted", async () => {
    await searchNppes({ firstName: "Jane" });
    expect(capturedUrl().searchParams.get("last_name")).toBeNull();
  });

  it("does not set number param when npi is omitted", async () => {
    await searchNppes({ firstName: "Jane" });
    expect(capturedUrl().searchParams.get("number")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// searchNppes / parseNppesResult — result parsing
// ---------------------------------------------------------------------------

describe("searchNppes — result parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts npi from the number field", async () => {
    mockFetchOk(makeApiResponse([makeApiResult({ number: "9876543210" })]));
    const [r] = await searchNppes({});
    expect(r.npi).toBe("9876543210");
  });

  it("extracts firstName and lastName from basic", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({ basic: { first_name: "Alice", last_name: "Jones" } }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.firstName).toBe("Alice");
    expect(r.lastName).toBe("Jones");
  });

  it("extracts primary taxonomy as specialty", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          taxonomies: [
            { desc: "Not primary", primary: false },
            { desc: "Family Medicine", primary: true },
          ],
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.specialty).toBe("Family Medicine");
  });

  it("falls back to first taxonomy when no primary is flagged", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          taxonomies: [
            { desc: "First Taxonomy", primary: false },
            { desc: "Second Taxonomy", primary: false },
          ],
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.specialty).toBe("First Taxonomy");
  });

  it("extracts LOCATION address over MAILING address", async () => {
    mockFetchOk(makeApiResponse([makeApiResult()]));
    const [r] = await searchNppes({});
    expect(r.practiceAddress).toBe("456 Practice Ave");
    expect(r.practiceCity).toBe("Dallas");
    expect(r.practiceState).toBe("TX");
  });

  it("falls back to first address when no LOCATION address exists", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          addresses: [
            {
              address_purpose: "MAILING",
              address_1: "PO Box Only",
              city: "MailOnly",
              state: "NY",
              postal_code: "10001",
              telephone_number: "555-000-0000",
            },
          ],
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.practiceAddress).toBe("PO Box Only");
    expect(r.practiceCity).toBe("MailOnly");
  });

  it("truncates postal code to 5 digits", async () => {
    mockFetchOk(makeApiResponse([makeApiResult()]));
    const [r] = await searchNppes({});
    // The makeApiResult LOCATION address has postal_code "752011234"
    expect(r.practiceZip).toBe("75201");
  });

  it("returns empty strings for missing basic fields", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          basic: undefined,
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.firstName).toBe("");
    expect(r.lastName).toBe("");
    expect(r.suffix).toBe("");
    expect(r.credential).toBe("");
  });

  it("returns empty specialty when taxonomies is undefined", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          taxonomies: undefined,
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.specialty).toBe("");
  });

  it("returns empty address fields when addresses is undefined", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          addresses: undefined,
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.practiceAddress).toBe("");
    expect(r.practiceCity).toBe("");
    expect(r.practiceState).toBe("");
    expect(r.practiceZip).toBe("");
    expect(r.practicePhone).toBe("");
  });

  it("prefers organization_name over basic.name for practiceName", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          basic: {
            organization_name: "Org Name",
            name: "Plain Name",
          },
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.practiceName).toBe("Org Name");
  });

  it("falls back to basic.name when organization_name is absent", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          basic: {
            name: "Plain Name",
          },
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.practiceName).toBe("Plain Name");
  });

  it("sets empty string for practiceZip when postal_code is absent", async () => {
    mockFetchOk(
      makeApiResponse([
        makeApiResult({
          addresses: [
            {
              address_purpose: "LOCATION",
              address_1: "123 Main St",
              city: "Austin",
              state: "TX",
              // postal_code absent
              telephone_number: "512-555-0000",
            },
          ],
        }),
      ])
    );
    const [r] = await searchNppes({});
    expect(r.practiceZip).toBe("");
  });
});

// ---------------------------------------------------------------------------
// lookupNpi
// ---------------------------------------------------------------------------

describe("lookupNpi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delegates to searchNppes with limit 1 and returns first result", async () => {
    mockFetchOk(makeApiResponse([makeApiResult({ number: "1234567890" })]));

    const result = await lookupNpi("1234567890");

    expect(result).not.toBeNull();
    expect(result!.npi).toBe("1234567890");
  });

  it("sets limit=1 in the API request", async () => {
    mockFetchOk(makeApiResponse([]));

    await lookupNpi("1234567890");

    const mockFetchFn = vi.mocked(globalThis.fetch);
    const rawUrl = mockFetchFn.mock.calls[0][0] as string;
    const url = new URL(rawUrl);
    expect(url.searchParams.get("limit")).toBe("1");
  });

  it("returns null when no results are found", async () => {
    mockFetchOk({ result_count: 0, results: [] });

    const result = await lookupNpi("0000000000");

    expect(result).toBeNull();
  });

  it("passes the npi as the number query param", async () => {
    mockFetchOk(makeApiResponse([]));

    await lookupNpi("9876543210");

    const mockFetchFn = vi.mocked(globalThis.fetch);
    const rawUrl = mockFetchFn.mock.calls[0][0] as string;
    const url = new URL(rawUrl);
    expect(url.searchParams.get("number")).toBe("9876543210");
  });

  it("throws when the underlying API call fails", async () => {
    mockFetchError(503);

    await expect(lookupNpi("1234567890")).rejects.toThrow("NPPES API error: 503");
  });
});

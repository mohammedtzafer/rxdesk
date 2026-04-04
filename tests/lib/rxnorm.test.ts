import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchDrugs,
  getDrugByRxcui,
  getDrugInteractions,
  getSpellingSuggestions,
} from "@/lib/rxnorm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFetchOk(body: unknown): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

function makeFetchError(status: number): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({ error: "API error" }),
  }) as unknown as typeof fetch;
}

// ---------------------------------------------------------------------------
// searchDrugs
// ---------------------------------------------------------------------------

describe("searchDrugs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed drugs from a valid drugGroup response", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        drugGroup: {
          conceptGroup: [
            {
              conceptProperties: [
                {
                  rxcui: "1049502",
                  name: "12 HR Oxycodone",
                  synonym: "OxyContin",
                  tty: "SBD",
                },
                {
                  rxcui: "1049508",
                  name: "Oxycodone 10 MG",
                  synonym: "",
                  tty: "SCD",
                },
              ],
            },
          ],
        },
      })
    );

    const results = await searchDrugs("oxycodone");

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      rxcui: "1049502",
      name: "12 HR Oxycodone",
      synonym: "OxyContin",
      tty: "SBD",
    });
    expect(results[1]).toEqual({
      rxcui: "1049508",
      name: "Oxycodone 10 MG",
      synonym: "",
      tty: "SCD",
    });
  });

  it("returns empty array when drugGroup has no conceptGroup", async () => {
    vi.stubGlobal("fetch", makeFetchOk({ drugGroup: {} }));

    const results = await searchDrugs("unknownxyz");

    expect(results).toEqual([]);
  });

  it("returns empty array when conceptGroup is empty", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({ drugGroup: { conceptGroup: [] } })
    );

    const results = await searchDrugs("nomatch");

    expect(results).toEqual([]);
  });

  it("throws when the API responds with an error status", async () => {
    vi.stubGlobal("fetch", makeFetchError(500));

    await expect(searchDrugs("ibuprofen")).rejects.toThrow("RxNorm API error: 500");
  });

  it("respects the limit parameter and never returns more than limit drugs", async () => {
    const manyProps = Array.from({ length: 30 }, (_, i) => ({
      rxcui: String(i),
      name: `Drug ${i}`,
      synonym: "",
      tty: "SCD",
    }));

    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        drugGroup: {
          conceptGroup: [{ conceptProperties: manyProps }],
        },
      })
    );

    const results = await searchDrugs("drug", 5);

    expect(results).toHaveLength(5);
  });

  it("applies the default limit of 20", async () => {
    const manyProps = Array.from({ length: 25 }, (_, i) => ({
      rxcui: String(i),
      name: `Drug ${i}`,
      synonym: "",
      tty: "SCD",
    }));

    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        drugGroup: {
          conceptGroup: [{ conceptProperties: manyProps }],
        },
      })
    );

    const results = await searchDrugs("drug");

    expect(results).toHaveLength(20);
  });

  it("extracts rxcui, name, synonym, and tty from conceptProperties", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        drugGroup: {
          conceptGroup: [
            {
              conceptProperties: [
                {
                  rxcui: "856925",
                  name: "Metformin 500 MG Oral Tablet",
                  synonym: "Glucophage",
                  tty: "SBD",
                },
              ],
            },
          ],
        },
      })
    );

    const results = await searchDrugs("metformin");

    expect(results[0].rxcui).toBe("856925");
    expect(results[0].name).toBe("Metformin 500 MG Oral Tablet");
    expect(results[0].synonym).toBe("Glucophage");
    expect(results[0].tty).toBe("SBD");
  });

  it("defaults synonym to empty string when absent", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        drugGroup: {
          conceptGroup: [
            {
              conceptProperties: [
                { rxcui: "1", name: "Drug", tty: "SCD" }, // no synonym key
              ],
            },
          ],
        },
      })
    );

    const results = await searchDrugs("drug");

    expect(results[0].synonym).toBe("");
  });

  it("spans multiple conceptGroups and respects limit across groups", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        drugGroup: {
          conceptGroup: [
            {
              conceptProperties: [
                { rxcui: "1", name: "Drug A", synonym: "", tty: "SCD" },
                { rxcui: "2", name: "Drug B", synonym: "", tty: "SCD" },
              ],
            },
            {
              conceptProperties: [
                { rxcui: "3", name: "Drug C", synonym: "", tty: "SBD" },
              ],
            },
          ],
        },
      })
    );

    const results = await searchDrugs("drug", 2);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.rxcui)).toEqual(["1", "2"]);
  });
});

// ---------------------------------------------------------------------------
// getDrugByRxcui
// ---------------------------------------------------------------------------

describe("getDrugByRxcui", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns drug details with NDCs on a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              properties: {
                rxcui: "856925",
                name: "Metformin 500 MG Oral Tablet",
                dosageFormGroupName: "Oral Tablet",
                routeName: "Oral",
                quantityName: "500 MG",
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ndcGroup: {
                ndcList: { ndc: ["00093-1075-01", "00093-1075-05"] },
              },
            }),
        }) as unknown as typeof fetch
    );

    const result = await getDrugByRxcui("856925");

    expect(result).not.toBeNull();
    expect(result!.rxcui).toBe("856925");
    expect(result!.name).toBe("Metformin 500 MG Oral Tablet");
    expect(result!.dosageForm).toBe("Oral Tablet");
    expect(result!.route).toBe("Oral");
    expect(result!.strength).toBe("500 MG");
    expect(result!.ndc).toEqual(["00093-1075-01", "00093-1075-05"]);
  });

  it("returns null when the properties endpoint returns 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve({}) })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }) as unknown as typeof fetch
    );

    const result = await getDrugByRxcui("9999999");

    expect(result).toBeNull();
  });

  it("caps NDC list at 20 entries", async () => {
    const manyNdcs = Array.from({ length: 35 }, (_, i) => `0000${i}-0000-00`);

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              properties: {
                rxcui: "1",
                name: "Test Drug",
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ndcGroup: { ndcList: { ndc: manyNdcs } },
            }),
        }) as unknown as typeof fetch
    );

    const result = await getDrugByRxcui("1");

    expect(result!.ndc).toHaveLength(20);
  });

  it("returns empty NDC array when NDC endpoint fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              properties: { rxcui: "1", name: "Test Drug" },
            }),
        })
        .mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({}) }) as unknown as typeof fetch
    );

    const result = await getDrugByRxcui("1");

    expect(result!.ndc).toEqual([]);
  });

  it("returns null when properties key is missing in the response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}), // no properties key
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        }) as unknown as typeof fetch
    );

    const result = await getDrugByRxcui("999");

    expect(result).toBeNull();
  });

  it("maps optional properties to undefined when absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              properties: { rxcui: "42", name: "Bare Drug" }, // no optional fields
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({ ndcGroup: { ndcList: { ndc: [] } } }),
        }) as unknown as typeof fetch
    );

    const result = await getDrugByRxcui("42");

    expect(result!.dosageForm).toBeUndefined();
    expect(result!.route).toBeUndefined();
    expect(result!.strength).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getDrugInteractions
// ---------------------------------------------------------------------------

describe("getDrugInteractions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns interaction pairs from a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        interactionTypeGroup: [
          {
            interactionType: [
              {
                interactionPair: [
                  {
                    severity: "high",
                    description: "Increased risk of bleeding",
                    interactionConcept: [
                      { minConceptItem: { name: "Warfarin" } },
                      { minConceptItem: { name: "Aspirin" } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    );

    const result = await getDrugInteractions("202421");

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("high");
    expect(result[0].description).toBe("Increased risk of bleeding");
    expect(result[0].drug1).toBe("Warfarin");
    expect(result[0].drug2).toBe("Aspirin");
  });

  it("returns empty array when API responds with an error status", async () => {
    vi.stubGlobal("fetch", makeFetchError(503));

    const result = await getDrugInteractions("999");

    expect(result).toEqual([]);
  });

  it("returns empty array when no interactionTypeGroup in response", async () => {
    vi.stubGlobal("fetch", makeFetchOk({}));

    const result = await getDrugInteractions("123");

    expect(result).toEqual([]);
  });

  it("returns empty array when interactionPair is empty", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        interactionTypeGroup: [
          {
            interactionType: [{ interactionPair: [] }],
          },
        ],
      })
    );

    const result = await getDrugInteractions("123");

    expect(result).toEqual([]);
  });

  it("defaults severity to N/A when absent", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        interactionTypeGroup: [
          {
            interactionType: [
              {
                interactionPair: [
                  {
                    description: "Some interaction",
                    interactionConcept: [
                      { minConceptItem: { name: "Drug A" } },
                      { minConceptItem: { name: "Drug B" } },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      })
    );

    const result = await getDrugInteractions("123");

    expect(result[0].severity).toBe("N/A");
  });

  it("defaults drug names to empty string when interactionConcept is missing", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        interactionTypeGroup: [
          {
            interactionType: [
              {
                interactionPair: [
                  {
                    severity: "moderate",
                    description: "Interaction",
                    interactionConcept: [],
                  },
                ],
              },
            ],
          },
        ],
      })
    );

    const result = await getDrugInteractions("123");

    expect(result[0].drug1).toBe("");
    expect(result[0].drug2).toBe("");
  });

  it("returns multiple interaction pairs", async () => {
    const pairs = [1, 2, 3].map((n) => ({
      severity: "low",
      description: `Interaction ${n}`,
      interactionConcept: [
        { minConceptItem: { name: `Drug ${n}A` } },
        { minConceptItem: { name: `Drug ${n}B` } },
      ],
    }));

    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        interactionTypeGroup: [
          { interactionType: [{ interactionPair: pairs }] },
        ],
      })
    );

    const result = await getDrugInteractions("123");

    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// getSpellingSuggestions
// ---------------------------------------------------------------------------

describe("getSpellingSuggestions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns suggestion strings from a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        suggestionGroup: {
          suggestionList: {
            suggestion: ["ibuprofen", "ibuprophen", "ibuprophones"],
          },
        },
      })
    );

    const result = await getSpellingSuggestions("ibuprofen");

    expect(result).toEqual(["ibuprofen", "ibuprophen", "ibuprophones"]);
  });

  it("returns empty array when API responds with an error status", async () => {
    vi.stubGlobal("fetch", makeFetchError(503));

    const result = await getSpellingSuggestions("xyz");

    expect(result).toEqual([]);
  });

  it("returns empty array when suggestionGroup is absent", async () => {
    vi.stubGlobal("fetch", makeFetchOk({}));

    const result = await getSpellingSuggestions("xyz");

    expect(result).toEqual([]);
  });

  it("returns empty array when suggestionList is absent", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({ suggestionGroup: {} })
    );

    const result = await getSpellingSuggestions("xyz");

    expect(result).toEqual([]);
  });

  it("returns empty array when suggestion list is empty", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchOk({
        suggestionGroup: { suggestionList: { suggestion: [] } },
      })
    );

    const result = await getSpellingSuggestions("xyz");

    expect(result).toEqual([]);
  });
});

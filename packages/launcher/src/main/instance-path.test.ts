import { describe, expect, it } from "vitest";
import { instanceOriginKey, instancePathSegments } from "./instance-path";

describe("isolation des instances", () => {
  it("produit la même clé pour deux écritures de la même base normalisée", () => {
    expect(instanceOriginKey("https://Example.com/")).toBe(
      instanceOriginKey("https://example.com"),
    );
  });

  it("isole un même slug entre deux origines", () => {
    expect(instancePathSegments("https://alpha.example", "survie")).not.toEqual(
      instancePathSegments("https://beta.example", "survie"),
    );
  });

  it("refuse un slug pouvant sortir du répertoire d'instances", () => {
    expect(() =>
      instancePathSegments("https://example.com", "../survie"),
    ).toThrow(/invalide/);
  });
});

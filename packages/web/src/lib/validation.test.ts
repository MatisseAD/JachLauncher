import { describe, expect, it } from "vitest";
import { LauncherInputSchema, LauncherUpdateSchema } from "./validation";

describe("validation de l'éditeur", () => {
  it("applique les valeurs par défaut à une création minimale", () => {
    const parsed = LauncherInputSchema.parse({
      title: "Serveur",
      slug: "serveur-test",
      mcVersion: "1.21.1",
    });
    expect(parsed.status).toBe("draft");
    expect(parsed.memMax).toBe(4096);
  });

  it("refuse les plages mémoire incohérentes", () => {
    expect(
      LauncherInputSchema.safeParse({
        title: "Serveur",
        slug: "serveur-test",
        mcVersion: "1.21.1",
        memMin: 8192,
        memMax: 4096,
      }).success,
    ).toBe(false);
    expect(
      LauncherUpdateSchema.safeParse({ memMin: 8192, memMax: 4096 }).success,
    ).toBe(false);
  });

  it("refuse une adresse serveur contenant une URL ou un chemin", () => {
    expect(
      LauncherUpdateSchema.safeParse({
        serverAddress: "https://example.com/path",
      }).success,
    ).toBe(false);
  });
});

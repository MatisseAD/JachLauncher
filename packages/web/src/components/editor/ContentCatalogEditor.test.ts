import { describe, expect, it } from "vitest";
import type { DownloadableFile } from "@jach/shared";
import { groupResolvedContentByKind } from "../../lib/content-catalog-client";

function file(id: string, fileName: string): DownloadableFile {
  return {
    id,
    name: id,
    fileName,
    url: `https://cdn.modrinth.com/data/${id}/${fileName}`,
    sha256: "a".repeat(64),
    size: 42,
    source: "modrinth",
    required: true,
  };
}

describe("groupResolvedContentByKind", () => {
  it("conserve chaque dépendance dans son répertoire Minecraft", () => {
    const mod = file("catalog-mod", "content.jar");
    const resourcepack = file("catalog-resources", "resources.zip");
    const shaderpack = file("catalog-shader", "shader.zip");

    expect(
      groupResolvedContentByKind([
        { kind: "mod", file: mod },
        { kind: "resourcepack", file: resourcepack },
        { kind: "shaderpack", file: shaderpack },
      ]),
    ).toEqual({
      mod: [mod],
      resourcepack: [resourcepack],
      shaderpack: [shaderpack],
    });
  });
});

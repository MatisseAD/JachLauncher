import { createWriteStream } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import yazl from "yazl";
import { installJavaArchive } from "./java";
import { extractZipSecurely } from "./secure-zip";

vi.mock("electron", () => ({ app: { getPath: () => "" } }));

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "jach-secure-zip-"));
  temporaryDirectories.push(directory);
  return directory;
}

async function createZip(
  archive: string,
  configure: (zipFile: yazl.ZipFile) => void,
): Promise<void> {
  const zipFile = new yazl.ZipFile();
  configure(zipFile);
  zipFile.end();
  await pipeline(zipFile.outputStream, createWriteStream(archive));
}

async function replaceAllBytes(
  file: string,
  original: string,
  replacement: string,
): Promise<number> {
  const originalBytes = Buffer.from(original);
  const replacementBytes = Buffer.from(replacement);
  if (originalBytes.length !== replacementBytes.length) {
    throw new Error("Les chemins du fixture ZIP doivent avoir la même taille.");
  }
  const contents = await readFile(file);
  let replacements = 0;
  let offset = 0;
  while ((offset = contents.indexOf(originalBytes, offset)) !== -1) {
    replacementBytes.copy(contents, offset);
    offset += replacementBytes.length;
    replacements += 1;
  }
  await writeFile(file, contents);
  return replacements;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("extractZipSecurely", () => {
  it("extrait une arborescence Java ordinaire", async () => {
    const root = await temporaryDirectory();
    const archive = path.join(root, "runtime.zip");
    const destination = path.join(root, "runtime");
    await createZip(archive, (zipFile) => {
      zipFile.addEmptyDirectory("jdk-21/bin/");
      zipFile.addBuffer(Buffer.from("java-runtime"), "jdk-21/bin/java.exe");
    });

    await extractZipSecurely(archive, destination);

    await expect(
      readFile(path.join(destination, "jdk-21", "bin", "java.exe"), "utf8"),
    ).resolves.toBe("java-runtime");
  });

  it("refuse une remontée de dossier sans écrire hors de la destination", async () => {
    const root = await temporaryDirectory();
    const archive = path.join(root, "traversal.zip");
    const destination = path.join(root, "runtime");
    await createZip(archive, (zipFile) => {
      zipFile.addBuffer(Buffer.from("attaque"), "safe/file.txt");
    });
    expect(
      await replaceAllBytes(archive, "safe/file.txt", "../escape.txt"),
    ).toBe(2);

    await expect(extractZipSecurely(archive, destination)).rejects.toThrow();
    await expect(stat(path.join(root, "escape.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuse explicitement les liens symboliques Unix", async () => {
    const root = await temporaryDirectory();
    const archive = path.join(root, "symlink.zip");
    const destination = path.join(root, "runtime");
    await createZip(archive, (zipFile) => {
      zipFile.addBuffer(Buffer.from("../../escape"), "jdk-21/link", {
        mode: 0o120777,
      });
    });

    await expect(extractZipSecurely(archive, destination)).rejects.toThrow(
      /lien symbolique interdit/u,
    );
  });

  it("ne suit jamais un répertoire symbolique déjà présent", async () => {
    const root = await temporaryDirectory();
    const archive = path.join(root, "parent-symlink.zip");
    const destination = path.join(root, "runtime");
    const outside = path.join(root, "outside");
    await mkdir(destination);
    await mkdir(outside);
    await symlink(
      outside,
      path.join(destination, "jdk-21"),
      process.platform === "win32" ? "junction" : "dir",
    );
    await createZip(archive, (zipFile) => {
      zipFile.addBuffer(Buffer.from("attaque"), "jdk-21/payload.txt");
    });

    await expect(extractZipSecurely(archive, destination)).rejects.toThrow(
      /parent non sûr/u,
    );
    await expect(stat(path.join(outside, "payload.txt"))).rejects.toMatchObject(
      {
        code: "ENOENT",
      },
    );
  });

  it("refuse les collisions de destination", async () => {
    const root = await temporaryDirectory();
    const archive = path.join(root, "duplicate.zip");
    const destination = path.join(root, "runtime");
    await createZip(archive, (zipFile) => {
      zipFile.addBuffer(Buffer.from("premier"), "jdk-21/release");
      zipFile.addBuffer(Buffer.from("second"), "jdk-21/release");
    });

    await expect(extractZipSecurely(archive, destination)).rejects.toThrow(
      /destination en double/u,
    );
  });
});

describe("installJavaArchive", () => {
  it("supprime le runtime entier si une entrée dangereuse suit le binaire", async () => {
    const root = await temporaryDirectory();
    const archive = path.join(root, "partial-runtime.zip");
    const destination = path.join(root, "runtime");
    const executable = process.platform === "win32" ? "java.exe" : "java";
    await createZip(archive, (zipFile) => {
      zipFile.addBuffer(
        Buffer.from("binaire-partiel"),
        `jdk-21/bin/${executable}`,
        { mode: 0o100755 },
      );
      zipFile.addBuffer(Buffer.from("../../escape"), "jdk-21/link", {
        mode: 0o120777,
      });
    });

    await expect(installJavaArchive(archive, destination)).rejects.toThrow(
      /lien symbolique interdit/u,
    );
    await expect(stat(destination)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

import { createWriteStream, promises as fs } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import yauzl, { type Entry, type ZipFile } from "yauzl";

const MAX_ENTRY_COUNT = 100_000;
const MAX_ENTRY_SIZE = 512 * 1024 * 1024;
const MAX_EXTRACTED_SIZE = 1024 * 1024 * 1024;
const UNIX_PLATFORM = 3;
const UNIX_FILE_TYPE_MASK = 0o170000;
const UNIX_REGULAR_FILE = 0o100000;
const UNIX_DIRECTORY = 0o040000;
const UNIX_SYMBOLIC_LINK = 0o120000;
const WINDOWS_RESERVED_NAME =
  /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function zipError(message: string): Error {
  return new Error(`Archive Java non sûre : ${message}`);
}

function unixFileType(entry: Entry): number {
  if (entry.versionMadeBy >>> 8 !== UNIX_PLATFORM) return 0;
  return (entry.externalFileAttributes >>> 16) & UNIX_FILE_TYPE_MASK;
}

function isDirectory(entry: Entry): boolean {
  return (
    entry.fileName.endsWith("/") ||
    (entry.externalFileAttributes & 0x10) !== 0 ||
    unixFileType(entry) === UNIX_DIRECTORY
  );
}

function safeRelativePath(entry: Entry): string[] {
  const name = entry.fileName.normalize("NFC");
  const hasControlCharacter = [...name].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
  if (!name || name.length > 4_096) {
    throw zipError("nom d’entrée vide ou trop long.");
  }
  if (
    name.includes("\\") ||
    name.startsWith("/") ||
    path.win32.isAbsolute(name) ||
    hasControlCharacter
  ) {
    throw zipError(`chemin absolu ou invalide (${JSON.stringify(name)}).`);
  }

  const directory = isDirectory(entry);
  const parts = name.split("/");
  if (directory && parts.at(-1) === "") parts.pop();
  if (parts.length === 0) throw zipError("répertoire racine interdit.");

  for (const part of parts) {
    if (
      !part ||
      part === "." ||
      part === ".." ||
      part.length > 255 ||
      part.endsWith(".") ||
      part.endsWith(" ") ||
      /[<>:"|?*]/u.test(part) ||
      WINDOWS_RESERVED_NAME.test(part)
    ) {
      throw zipError(`segment de chemin invalide (${JSON.stringify(part)}).`);
    }
  }
  return parts;
}

function validateEntryType(entry: Entry): void {
  if (entry.isEncrypted()) throw zipError("entrée chiffrée interdite.");
  if (
    !Number.isSafeInteger(entry.uncompressedSize) ||
    entry.uncompressedSize < 0
  ) {
    throw zipError(`taille invalide (${entry.fileName}).`);
  }
  const fileType = unixFileType(entry);
  if (fileType === UNIX_SYMBOLIC_LINK) {
    throw zipError(`lien symbolique interdit (${entry.fileName}).`);
  }
  if (
    fileType !== 0 &&
    fileType !== UNIX_REGULAR_FILE &&
    fileType !== UNIX_DIRECTORY
  ) {
    throw zipError(`type de fichier spécial interdit (${entry.fileName}).`);
  }
  if (isDirectory(entry) && entry.uncompressedSize !== 0) {
    throw zipError(`répertoire avec contenu interdit (${entry.fileName}).`);
  }
  if (entry.uncompressedSize > MAX_ENTRY_SIZE) {
    throw zipError(`entrée trop volumineuse (${entry.fileName}).`);
  }
}

async function ensureRealDirectory(
  root: string,
  target: string,
): Promise<void> {
  const relative = path.relative(root, target);
  if (
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw zipError("sortie du dossier d’installation.");
  }

  let current = root;
  const parts = relative ? relative.split(path.sep) : [];
  for (const part of parts) {
    current = path.join(current, part);
    try {
      await fs.mkdir(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw zipError(`parent non sûr (${current}).`);
    }
  }
}

function openZip(archive: string): Promise<ZipFile> {
  return new Promise((resolve, reject) => {
    yauzl.open(
      archive,
      {
        autoClose: false,
        lazyEntries: true,
        decodeStrings: true,
        validateEntrySizes: true,
        strictFileNames: true,
      },
      (error, zipFile) => {
        if (error) reject(error);
        else resolve(zipFile);
      },
    );
  });
}

function openEntryStream(zipFile: ZipFile, entry: Entry) {
  return new Promise<Readable>((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) reject(error);
      else resolve(stream);
    });
  });
}

async function extractFile(
  zipFile: ZipFile,
  entry: Entry,
  destination: string,
): Promise<void> {
  const unixMode = (entry.externalFileAttributes >>> 16) & 0o777;
  try {
    const input = await openEntryStream(zipFile, entry);
    await pipeline(
      input,
      createWriteStream(destination, {
        flags: "wx",
        mode: unixMode || 0o644,
      }),
    );
  } catch (error) {
    await fs.rm(destination, { force: true });
    throw error;
  }
}

/**
 * Extrait un ZIP Java dans un dossier neuf, sans accepter de chemin absolu,
 * remontée de dossier, lien symbolique, fichier spécial, collision ou ZIP bomb.
 */
export async function extractZipSecurely(
  archive: string,
  destination: string,
): Promise<void> {
  const root = path.resolve(destination);
  await fs.mkdir(root, { recursive: true });
  const rootStats = await fs.lstat(root);
  if (rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw zipError("dossier de destination non sûr.");
  }

  const zipFile = await openZip(archive);
  if (zipFile.entryCount > MAX_ENTRY_COUNT) {
    zipFile.close();
    throw zipError("trop grand nombre de fichiers.");
  }
  let entryCount = 0;
  let extractedSize = 0;
  const destinations = new Set<string>();

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      zipFile.removeListener("entry", onEntry);
      zipFile.removeListener("end", onEnd);
      zipFile.removeListener("error", onError);
      zipFile.close();
      if (error) reject(error);
      else resolve();
    };
    const onError = (error: Error) => finish(error);
    const onEnd = () => finish();
    const onEntry = (entry: Entry) => {
      void (async () => {
        validateEntryType(entry);
        entryCount += 1;
        extractedSize += entry.uncompressedSize;
        if (entryCount > MAX_ENTRY_COUNT) {
          throw zipError("trop grand nombre de fichiers.");
        }
        if (extractedSize > MAX_EXTRACTED_SIZE) {
          throw zipError("contenu décompressé trop volumineux.");
        }

        const parts = safeRelativePath(entry);
        const target = path.resolve(root, ...parts);
        if (target === root || !target.startsWith(`${root}${path.sep}`)) {
          throw zipError(
            `sortie du dossier d’installation (${entry.fileName}).`,
          );
        }
        const destinationKey =
          process.platform === "win32" ? target.toLowerCase() : target;
        if (destinations.has(destinationKey)) {
          throw zipError(`destination en double (${entry.fileName}).`);
        }
        destinations.add(destinationKey);

        if (isDirectory(entry)) {
          await ensureRealDirectory(root, target);
        } else {
          await ensureRealDirectory(root, path.dirname(target));
          await extractFile(zipFile, entry, target);
        }
        if (!settled) zipFile.readEntry();
      })().catch(finish);
    };

    zipFile.on("entry", onEntry);
    zipFile.once("end", onEnd);
    zipFile.once("error", onError);
    zipFile.readEntry();
  });
}

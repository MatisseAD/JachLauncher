import { describe, expect, it } from "vitest";
import { LatestSaveQueue } from "./latest-save-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("LatestSaveQueue", () => {
  it("sérialise les requêtes et sauvegarde la dernière version", async () => {
    const first = deferred<string>();
    const saved: string[] = [];
    const queue = new LatestSaveQueue<string, string>(async (value) => {
      saved.push(value);
      if (value === "version-1") await first.promise;
      return value;
    });

    const firstResult = queue.enqueue("version-1");
    const obsoleteResult = queue.enqueue("version-2");
    const latestResult = queue.enqueue("version-3");

    expect(saved).toEqual(["version-1"]);
    first.resolve("done");

    await expect(firstResult).resolves.toBe("version-1");
    await expect(obsoleteResult).resolves.toBe("version-3");
    await expect(latestResult).resolves.toBe("version-3");
    expect(saved).toEqual(["version-1", "version-3"]);
  });

  it("continue après l'échec d'une sauvegarde", async () => {
    const queue = new LatestSaveQueue<string, string>(async (value) => {
      if (value === "invalid") throw new Error("save failed");
      return value;
    });

    await expect(queue.enqueue("invalid")).rejects.toThrow("save failed");
    await expect(queue.enqueue("valid")).resolves.toBe("valid");
  });
});

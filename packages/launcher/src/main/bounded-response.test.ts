import { describe, expect, it } from "vitest";
import {
  readResponseTextBounded,
  ResponseBodyTooLargeError,
} from "./bounded-response";

describe("lecture HTTP bornée", () => {
  it("lit un petit corps sans dépendre de Content-Length", async () => {
    await expect(
      readResponseTextBounded(new Response("ok"), 8),
    ).resolves.toBe("ok");
  });

  it("annule un flux chunked dès le dépassement", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(8));
      },
      cancel() {
        cancelled = true;
      },
    });
    await expect(
      readResponseTextBounded(new Response(body), 10),
    ).rejects.toBeInstanceOf(ResponseBodyTooLargeError);
    expect(cancelled).toBe(true);
  });

  it("rejette avant lecture un Content-Length excessif", async () => {
    const response = new Response("small", {
      headers: { "Content-Length": "999" },
    });
    await expect(readResponseTextBounded(response, 16)).rejects.toBeInstanceOf(
      ResponseBodyTooLargeError,
    );
  });
});

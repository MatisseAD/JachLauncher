export class ResponseBodyTooLargeError extends Error {
  constructor() {
    super("REMOTE_RESPONSE_TOO_LARGE");
    this.name = "ResponseBodyTooLargeError";
  }
}

/** Lit un corps Fetch par chunks et annule le flux dès que la limite est franchie. */
export async function readResponseTextBounded(
  response: Response,
  maximumBytes: number,
): Promise<string> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0) {
    throw new TypeError("maximumBytes invalide");
  }
  const declaredHeader = response.headers.get("content-length");
  if (declaredHeader !== null) {
    const declared = Number(declaredHeader);
    if (
      !Number.isSafeInteger(declared) ||
      declared < 0 ||
      declared > maximumBytes
    ) {
      await response.body?.cancel().catch(() => undefined);
      throw new ResponseBodyTooLargeError();
    }
  }
  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximumBytes) {
        await reader.cancel().catch(() => undefined);
        throw new ResponseBodyTooLargeError();
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, received).toString("utf8");
}

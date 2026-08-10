import { describe, expect, it } from "vitest";
import {
  canConsumeUploadQuota,
  MAX_USER_UPLOAD_BYTES_PER_DAY,
  MAX_USER_UPLOADS_PER_DAY,
  uploadQuotaDay,
} from "./upload-quota";

describe("quota global des uploads", () => {
  it("accepte exactement la limite journalière", () => {
    expect(
      canConsumeUploadQuota(
        { bytes: 0, uploads: 0 },
        MAX_USER_UPLOAD_BYTES_PER_DAY,
      ),
    ).toBe(true);
  });

  it("refuse un dépassement en octets ou en nombre", () => {
    expect(
      canConsumeUploadQuota(
        { bytes: MAX_USER_UPLOAD_BYTES_PER_DAY - 1, uploads: 0 },
        2,
      ),
    ).toBe(false);
    expect(
      canConsumeUploadQuota({ bytes: 0, uploads: MAX_USER_UPLOADS_PER_DAY }, 1),
    ).toBe(false);
  });

  it("normalise la journée en UTC", () => {
    expect(uploadQuotaDay(new Date("2026-08-06T23:59:59.000Z"))).toEqual(
      new Date("2026-08-06T00:00:00.000Z"),
    );
  });
});

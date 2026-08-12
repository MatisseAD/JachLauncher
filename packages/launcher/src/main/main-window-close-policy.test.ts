import { describe, expect, it } from "vitest";
import { shouldHideMainWindowOnClose } from "./main-window-close-policy";

describe("main window close policy", () => {
  it("keeps the main process alive for a native close while Minecraft runs", () => {
    expect(
      shouldHideMainWindowOnClose({ gameRunning: true, appQuitting: false }),
    ).toBe(true);
  });

  it("allows an explicit application quit and a close without Minecraft", () => {
    expect(
      shouldHideMainWindowOnClose({ gameRunning: true, appQuitting: true }),
    ).toBe(false);
    expect(
      shouldHideMainWindowOnClose({ gameRunning: false, appQuitting: false }),
    ).toBe(false);
  });
});

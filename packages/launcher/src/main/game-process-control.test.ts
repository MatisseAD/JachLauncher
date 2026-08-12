import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isChildProcessRunning,
  terminateGameProcess,
} from "./game-process-control";

function fakeChild(overrides: Partial<ChildProcess> = {}): ChildProcess {
  const emitter = new EventEmitter() as ChildProcess;
  Object.assign(emitter, {
    exitCode: null,
    signalCode: null,
    pid: 12345,
    kill: vi.fn(() => true),
    ...overrides,
  });
  return emitter;
}

describe("game process control", () => {
  afterEach(() => vi.useRealTimers());

  it("does not report an already exited process as running", () => {
    expect(isChildProcessRunning(fakeChild({ exitCode: 0 }))).toBe(false);
    expect(isChildProcessRunning(fakeChild({ signalCode: "SIGTERM" }))).toBe(
      false,
    );
  });

  it("resolves only after close is observed", async () => {
    const child = fakeChild();
    const result = terminateGameProcess(child, 1_000, 1_000);
    child.emit("close", 0, null);
    await expect(result).resolves.toBeUndefined();
  });

  it("rejects instead of acknowledging when termination times out", async () => {
    vi.useFakeTimers();
    const child = fakeChild({ kill: vi.fn(() => true) });
    const result = terminateGameProcess(child, 10, 10, async () => {});
    const rejection = expect(result).rejects.toThrow(
      "GAME_PROCESS_TERMINATION_TIMEOUT",
    );
    await vi.advanceTimersByTimeAsync(25);
    await rejection;
  });
});

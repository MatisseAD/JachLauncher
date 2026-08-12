import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChildProcess } from "node:child_process";

const execFileAsync = promisify(execFile);

export function isChildProcessRunning(
  child: ChildProcess | null | undefined,
): child is ChildProcess {
  return Boolean(child && child.exitCode === null && child.signalCode === null);
}

async function forceKillProcessTree(child: ChildProcess): Promise<void> {
  if (!child.pid) throw new Error("GAME_PROCESS_PID_MISSING");
  if (process.platform === "win32") {
    await execFileAsync(
      "taskkill.exe",
      ["/PID", String(child.pid), "/T", "/F"],
      { windowsHide: true },
    );
    return;
  }
  if (!child.kill("SIGKILL") && isChildProcessRunning(child)) {
    throw new Error("GAME_PROCESS_FORCE_KILL_REJECTED");
  }
}

/**
 * Stops Minecraft and resolves only after the ChildProcess emits `close` or is
 * observably exited. A timeout/rejected signal never acknowledges an admin
 * command while the process can still be running.
 */
export async function terminateGameProcess(
  child: ChildProcess,
  gracefulMs = 4_000,
  forceWaitMs = 5_000,
  forceKill: (child: ChildProcess) => Promise<void> = forceKillProcessTree,
): Promise<void> {
  if (!isChildProcessRunning(child)) return;

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let forceTimer: NodeJS.Timeout | null = null;
    let giveUpTimer: NodeJS.Timeout | null = null;
    const cleanup = () => {
      if (forceTimer) clearTimeout(forceTimer);
      if (giveUpTimer) clearTimeout(giveUpTimer);
      child.removeListener("close", closed);
      child.removeListener("error", failed);
    };
    const closed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const failed = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const force = async () => {
      if (!isChildProcessRunning(child)) {
        closed();
        return;
      }
      try {
        await forceKill(child);
      } catch (error) {
        if (isChildProcessRunning(child)) {
          failed(error instanceof Error ? error : new Error(String(error)));
          return;
        }
      }
    };

    child.once("close", closed);
    child.once("error", failed);
    try {
      const accepted = child.kill();
      if (!accepted && isChildProcessRunning(child)) {
        void force();
      }
    } catch {
      void force();
    }
    forceTimer = setTimeout(() => void force(), gracefulMs);
    giveUpTimer = setTimeout(() => {
      if (isChildProcessRunning(child)) {
        failed(new Error("GAME_PROCESS_TERMINATION_TIMEOUT"));
      } else {
        closed();
      }
    }, gracefulMs + forceWaitMs);
  });
}

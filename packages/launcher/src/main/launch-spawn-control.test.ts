import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ChildProcess } from "node:child_process";
import type { LauncherManifest } from "@jach/shared";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  launch: vi.fn(),
  parseVersion: vi.fn(),
  install: vi.fn(),
  installDependencies: vi.fn(),
  markInstanceInstalled: vi.fn(),
  ensureJava: vi.fn(),
  ensureMinecraftRoot: vi.fn(),
}));

vi.mock("@xmcl/core", () => ({
  launch: mocks.launch,
  Version: { parse: mocks.parseVersion },
}));
vi.mock("@xmcl/installer", () => ({
  getFabricLoaderArtifact: vi.fn(),
  getLoaderArtifactListFor: vi.fn(),
  getQuiltLoaderVersionsByMinecraft: vi.fn(),
  getVersionList: vi.fn(async () => ({
    versions: [{ id: "1.21.1" }],
  })),
  install: mocks.install,
  installDependencies: mocks.installDependencies,
  installFabric: vi.fn(),
  installForge: vi.fn(),
  installNeoForged: vi.fn(),
  installQuiltVersion: vi.fn(),
}));
vi.mock("./auth", () => ({
  getCurrentAuth: () => ({
    name: "Steve",
    uuid: "00000000-0000-4000-8000-000000000001",
    access_token: "test-token",
    user_properties: "{}",
    meta: { type: "offline" },
  }),
}));
vi.mock("./instance", () => ({
  markInstanceInstalled: mocks.markInstanceInstalled,
}));
vi.mock("./java", () => ({ ensureJava: mocks.ensureJava }));
vi.mock("./store", () => ({
  ensureMinecraftRoot: mocks.ensureMinecraftRoot,
}));

import { launchGame } from "./launch";

const temporaryDirectories: string[] = [];

function fakeChild(): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  Object.assign(child, {
    pid: 43210,
    exitCode: null,
    signalCode: null,
    stdout: null,
    stderr: null,
  });
  return child;
}

const manifest = {
  schemaVersion: 2,
  id: "spawn-control",
  updatedAt: "2026-08-12T12:00:00.000Z",
  launcherType: "vanilla",
  preLaunchMessage: "",
  branding: {
    title: "Spawn control",
    description: "",
    primaryColor: "#5b8cff",
    secondaryColor: "#00d18f",
    textColor: "#e6edf3",
    theme: "dark",
    visualStyle: "premium",
    buttonStyle: "glow",
    cardShape: "rounded",
    menuPlacement: "left",
    showNews: false,
    showDiscord: false,
    showWebsite: false,
    ambiance: "none",
  },
  minecraft: { version: "1.21.1", loader: "vanilla" },
  server: {},
  memory: { min: 1024, max: 4096 },
  mods: [],
  resourcepacks: [],
  shaderpacks: [],
  news: [],
  events: [],
  patchNotes: [],
  maintenance: { active: false },
  alert: { active: false, kind: "info", message: "" },
  jvmArgs: [],
} as unknown as LauncherManifest;

describe("launchGame process ownership", () => {
  afterEach(async () => {
    vi.clearAllMocks();
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it("hands the detached process to the controller before post-spawn I/O", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "jach-spawn-control-"));
    temporaryDirectories.push(root);
    const child = fakeChild();
    mocks.ensureMinecraftRoot.mockResolvedValue(root);
    mocks.ensureJava.mockResolvedValue("java");
    mocks.parseVersion.mockResolvedValue({});
    mocks.install.mockResolvedValue(undefined);
    mocks.installDependencies.mockResolvedValue(undefined);
    mocks.launch.mockResolvedValue(child);
    mocks.markInstanceInstalled.mockResolvedValue(undefined);
    const onSpawn = vi.fn();

    const result = launchGame(
      manifest,
      "https://yourlauncher.vercel.app",
      {
        ramMb: 4096,
        ramMode: "balanced",
        fullscreen: false,
        closeOnLaunch: false,
        minimizeOnLaunch: true,
        resolution: "1280x720",
      },
      vi.fn(),
      vi.fn(),
      undefined,
      onSpawn,
    );

    await expect(result).resolves.toBe(child);
    expect(onSpawn).toHaveBeenCalledWith(child);
    expect(mocks.markInstanceInstalled).toHaveBeenCalledOnce();
    expect(
      mocks.markInstanceInstalled.mock.invocationCallOrder[0],
    ).toBeLessThan(mocks.launch.mock.invocationCallOrder[0]);
    expect(mocks.launch.mock.invocationCallOrder[0]).toBeLessThan(
      onSpawn.mock.invocationCallOrder[0],
    );
  });
});

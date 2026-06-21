import net from "node:net";
import type { ServerStatusResult } from "../shared-types/ipc";

/** Mesure la latence TCP (connexion) vers le serveur, en ms. */
function tcpPing(host: string, port: number, timeout = 3000): Promise<number | undefined> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (v: number | undefined) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(v);
    };
    socket.setTimeout(timeout);
    socket.once("connect", () => finish(Date.now() - start));
    socket.once("timeout", () => finish(undefined));
    socket.once("error", () => finish(undefined));
    socket.connect(port, host);
  });
}

/**
 * Interroge l'état d'un serveur Minecraft via l'API publique mcsrvstat.us,
 * enrichi d'un ping TCP réel et du MOTD/version.
 */
export async function fetchServerStatus(
  address: string,
  port?: number,
): Promise<ServerStatusResult> {
  const p = port ?? 25565;
  const host = port ? `${address}:${port}` : address;

  const [statusRes, pingMs] = await Promise.all([
    (async () => {
      try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(host)}`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return null;
        return (await res.json()) as {
          online?: boolean;
          players?: { online?: number; max?: number };
          version?: string;
          motd?: { clean?: string[] };
        };
      } catch {
        return null;
      }
    })(),
    tcpPing(address, p),
  ]);

  if (!statusRes) return { online: false, pingMs };

  const motd = statusRes.motd?.clean?.join(" ").trim();
  return {
    online: Boolean(statusRes.online),
    players: statusRes.players?.online,
    maxPlayers: statusRes.players?.max,
    version: statusRes.version,
    motd: motd || undefined,
    pingMs,
  };
}

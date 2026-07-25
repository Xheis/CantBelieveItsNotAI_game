import express from "express";
import http from "node:http";
import path from "node:path";
import { WebSocketServer } from "ws";
import { makeCue } from "./lib/voice.js";
import { CONFIG } from "./config.js";
import { Game } from "./lib/game.js";
import { scanPacks } from "./lib/packs.js";
import { publishMdns } from "./lib/mdns.js";
import { getLanIps, getPrimaryIp, buildJoinUrl } from "./lib/net.js";
import { makeQrDataUrl } from "./lib/qr.js";

async function main() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1_000_000,
  });

  const { packs, allAssets, warnings } = await scanPacks(CONFIG);
  const avatarStore = new Map();

  const game = new Game(CONFIG, packs, allAssets, avatarStore, warnings);

  let mdns = null;

  if (CONFIG.mdns) {
    mdns = await publishMdns({
      port: CONFIG.port,
      name: CONFIG.serviceName,
    });
  }

  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "img-src 'self' data: blob:",
        "media-src 'self' blob:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "connect-src 'self' ws: wss:",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join("; "),
    );

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");

    next();
  });

  app.use(express.static(path.resolve("public")));

  app.get("/join", (req, res) => {
    res.sendFile(path.resolve("public/join.html"));
  });

  app.get("/api/lobby", async (req, res) => {
    const ips = getLanIps();
    const primaryIp = getPrimaryIp();

    const primaryUrl = buildJoinUrl({
      port: CONFIG.port,
      publicUrl: CONFIG.publicUrl,
      ip: primaryIp,
    });

    const qrDataUrl = await makeQrDataUrl(primaryUrl);

    res.json({
      primaryUrl,
      mdnsUrl: mdns?.url ?? null,
      ips,
      qrDataUrl,
    });
  });

  app.get("/api/voice/:category", (req, res) => {
    const cue = makeCue(req.params.category, { probability: 1 });

    if (!cue) {
      res.json({});
      return;
    }

    res.json(cue);
  });

  app.get("/avatars/:id", (req, res) => {
    const avatar = avatarStore.get(req.params.id);

    if (!avatar) {
      res.sendStatus(404);
      return;
    }

    res.setHeader("Cache-Control", "private, max-age=86400");
    res.type(avatar.mime);
    res.send(avatar.buffer);
  });

  app.get("/media/:id", (req, res) => {
    const asset = game.getAsset(req.params.id);

    if (!asset) {
      res.sendStatus(404);
      return;
    }

    res.setHeader("Cache-Control", "private, max-age=3600");

    res.sendFile(asset.path, {
      acceptRanges: true,
      dotfiles: "deny",
    });
  });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url, "http://localhost");
    const type = url.searchParams.get("type") === "screen" ? "screen" : "player";

    game.onConnection(ws, type);
  });

  server.listen(CONFIG.port, CONFIG.host, () => {
    console.info(`I Can't Believe It's Not AI running on port ${CONFIG.port}`);
    console.info(`LAN IPs: ${getLanIps().join(", ") || "localhost"}`);

    if (mdns?.url) {
      console.info(`mDNS fallback: ${mdns.url}`);
    }
  });

  process.on("SIGINT", async () => {
    try {
      await mdns?.shutdown?.();
    } catch {
      // Ignore shutdown errors.
    }

    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
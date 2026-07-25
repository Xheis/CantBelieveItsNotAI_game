import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { scanVideoLibrary } from "./videos.js";
import { humanize } from "./utils.js";

const LEGACY_ROOT = path.resolve("videos");
const PACK_ROOT = path.resolve("packs");

export async function scanPacks(config) {
  const packs = [];
  const allAssets = new Map();
  const warnings = [];

  const legacyAssets = await scanVideoLibrary(
    LEGACY_ROOT,
    config.videoExtensions,
  ).catch(() => new Map());

  if (legacyAssets.size > 0) {
    const pack = makePack(
      "default",
      "Default Pack",
      legacyAssets,
      {
        description: "Legacy ./videos pack",
        accent: "#8b5cf6",
      },
    );

    packs.push(pack);
    mergeAssets(allAssets, pack.assets);
  }

  const entries = await readdir(PACK_ROOT, { withFileTypes: true }).catch(
    () => [],
  );

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const root = path.join(PACK_ROOT, entry.name);

    const assets = await scanVideoLibrary(
      root,
      config.videoExtensions,
    ).catch(() => new Map());

    if (assets.size === 0) continue;

    const meta = await readPackJson(root);

    const pack = makePack(
      entry.name,
      meta?.name ?? humanize(entry.name),
      assets,
      meta,
    );

    packs.push(pack);
    mergeAssets(allAssets, pack.assets);
  }

  if (packs.length === 0) {
    warnings.push(
      "No video packs found. Add ./videos/ai and ./videos/real, or packs/<name>/ai and packs/<name>/real.",
    );
  }

  return {
    packs,
    allAssets,
    warnings,
  };
}

async function readPackJson(root) {
  try {
    const raw = await readFile(path.join(root, "pack.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function makePack(id, name, assets, meta = {}) {
  const clips = [...assets.values()];

  return {
    id,
    name,
    description: meta.description ?? "",
    accent: meta.accent ?? "#8b5cf6",
    logo: meta.logo ?? `/assets/packs/${id}.svg`,
    clipCount: clips.length,
    aiCount: clips.filter((clip) => clip.type === "ai").length,
    realCount: clips.filter((clip) => clip.type === "real").length,
    assets,
  };
}

function mergeAssets(target, source) {
  for (const [id, asset] of source) {
    target.set(id, asset);
  }
}
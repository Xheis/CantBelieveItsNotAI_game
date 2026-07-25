import { readdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { shuffle } from "./utils.js";

export async function scanVideoLibrary(packRoot, extensions) {
  const assets = new Map();

  for (const type of ["ai", "real"]) {
    const dir = path.join(packRoot, type);
    const files = await walk(dir, extensions);

    for (const file of files) {
      const id = randomUUID();

      assets.set(id, {
        id,
        type,
        path: file,
      });
    }
  }

  return assets;
}

async function walk(dir, extensions) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath, extensions)));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();

    if (extensions.includes(ext)) {
      files.push(fullPath);
    }
  }

  return files;
}

export function selectClips(assets, config) {
  const all = shuffle([...assets.values()]);

  if (all.length === 0) return [];

  if (!config.balanceSelection) {
    return repeatFill(all, config.rounds);
  }

  const ai = shuffle(all.filter((clip) => clip.type === "ai"));
  const real = shuffle(all.filter((clip) => clip.type === "real"));

  const chosen = [];

  const min = Math.min(
    config.minPerType,
    ai.length,
    real.length,
    Math.floor(config.rounds / 2),
  );

  chosen.push(...ai.slice(0, min));
  chosen.push(...real.slice(0, min));

  const remaining = shuffle(all.filter((clip) => !chosen.includes(clip)));

  for (const clip of remaining) {
    if (chosen.length >= config.rounds) break;
    chosen.push(clip);
  }

  return shuffle(repeatFill(chosen, config.rounds));
}

function repeatFill(clips, count) {
  if (clips.length === 0) return [];

  if (clips.length >= count) {
    return clips.slice(0, count);
  }

  const out = [...clips];

  while (out.length < count) {
    out.push(clips[out.length % clips.length]);
  }

  return out.slice(0, count);
}
import test from "node:test";
import assert from "node:assert/strict";

import { selectClips } from "../lib/videos.js";

function makeAssets(count) {
  const assets = new Map();

  for (let i = 0; i < count; i += 1) {
    const id = String(i);

    assets.set(id, {
      id,
      type: i % 2 === 0 ? "ai" : "real",
      path: `/tmp/${id}.mp4`,
    });
  }

  return assets;
}

const config = {
  rounds: 10,
  balanceSelection: true,
  minPerType: 3,
};

test("selects requested number of clips", () => {
  const clips = selectClips(makeAssets(24), config);

  assert.equal(clips.length, 10);
});

test("balances clip types when possible", () => {
  const clips = selectClips(makeAssets(24), config);

  const ai = clips.filter((clip) => clip.type === "ai").length;
  const real = clips.filter((clip) => clip.type === "real").length;

  assert.ok(ai >= 3);
  assert.ok(real >= 3);
});

test("repeats clips if library is too small", () => {
  const clips = selectClips(makeAssets(3), config);

  assert.equal(clips.length, 10);
});
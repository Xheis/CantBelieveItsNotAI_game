import test from "node:test";
import assert from "node:assert/strict";

import { scanPacks } from "../lib/packs.js";

const config = {
  videoExtensions: [".mp4", ".webm"],
};

test("scanPacks returns packs, assets, and warnings", async () => {
  const result = await scanPacks(config);

  assert.ok(Array.isArray(result.packs));
  assert.ok(result.allAssets instanceof Map);
  assert.ok(Array.isArray(result.warnings));
});

test("scanPacks warns when no clips are found", async () => {
  const result = await scanPacks(config);

  if (result.packs.length === 0) {
    assert.ok(result.warnings.length > 0);
  } else {
    assert.ok(result.packs[0].clipCount >= 0);
  }
});
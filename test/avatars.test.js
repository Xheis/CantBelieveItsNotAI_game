import test from "node:test";
import assert from "node:assert/strict";

import { normalizeAvatar } from "../lib/avatars.js";

const config = {
  avatarMaxDataUrlLength: 200_000,
  avatarMaxBytes: 150_000,
};

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("returns default avatar for invalid input", () => {
  const store = new Map();

  const avatar = normalizeAvatar(undefined, store, config);

  assert.deepEqual(avatar, {
    kind: "emoji",
    value: "🤖",
  });
});

test("accepts emoji avatar", () => {
  const store = new Map();

  const avatar = normalizeAvatar(
    {
      kind: "emoji",
      value: "🦝",
    },
    store,
    config,
  );

  assert.deepEqual(avatar, {
    kind: "emoji",
    value: "🦝",
  });
});

test("rejects invalid image data URL", () => {
  const store = new Map();

  const avatar = normalizeAvatar(
    {
      kind: "image",
      dataUrl: "data:text/plain;base64,aaaa",
    },
    store,
    config,
  );

  assert.equal(avatar.kind, "emoji");
});

test("accepts valid image and stores it", () => {
  const store = new Map();

  const avatar = normalizeAvatar(
    {
      kind: "image",
      dataUrl: TINY_PNG,
    },
    store,
    config,
  );

  assert.equal(avatar.kind, "image");
  assert.match(avatar.url, /^\/avatars\//);
  assert.equal(store.size, 1);
});
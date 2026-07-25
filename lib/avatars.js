import { randomUUID } from "node:crypto";

const DATA_URL_RE =
  /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/;

export function normalizeAvatar(input, avatarStore, config) {
  if (input?.kind === "emoji" && typeof input.value === "string") {
    const value = input.value.trim().slice(0, 16);

    if (value) {
      return {
        kind: "emoji",
        value,
      };
    }
  }

  if (input?.kind === "image" && typeof input.dataUrl === "string") {
    const dataUrl = input.dataUrl.replace(/\s/g, "");

    if (dataUrl.length > config.avatarMaxDataUrlLength) {
      return defaultAvatar();
    }

    if (!DATA_URL_RE.test(dataUrl)) {
      return defaultAvatar();
    }

    const [meta, base64] = dataUrl.split(",");

    const mime = meta.match(/^data:(image\/(png|jpeg|webp));base64$/)?.[1];

    if (!mime) {
      return defaultAvatar();
    }

    const buffer = Buffer.from(base64, "base64");

    if (buffer.length > config.avatarMaxBytes) {
      return defaultAvatar();
    }

    const id = randomUUID();

    avatarStore.set(id, {
      buffer,
      mime,
    });

    return {
      kind: "image",
      url: `/avatars/${id}`,
    };
  }

  return defaultAvatar();
}

export function defaultAvatar() {
  return {
    kind: "emoji",
    value: "🤖",
  };
}
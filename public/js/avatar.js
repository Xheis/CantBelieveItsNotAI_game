export const EMOJIS = [
  "🦝",
  "🍕",
  "🤖",
  "👽",
  "🐸",
  "🔥",
  "🧠",
  "💀",
  "🦊",
  "🐙",
  "🦄",
  "🍩",
  "🎃",
  "👾",
  "🐐",
  "🥸",
  "🤠",
  "🧌",
  "🦍",
  "🐝",
  "🌭",
  "😎",
  "🤡",
  "🛸",
];

export async function compressAvatarFile(file, size = 128, quality = 0.82) {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#0e1526";
      ctx.fillRect(0, 0, size, size);

      const scale = Math.max(size / bitmap.width, size / bitmap.height);

      const drawWidth = bitmap.width * scale;
      const drawHeight = bitmap.height * scale;

      const offsetX = (size - drawWidth) / 2;
      const offsetY = (size - drawHeight) / 2;

      ctx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);

      return canvas.toDataURL("image/jpeg", quality);
    } catch {
      // Fall through to Image fallback.
    }
  }

  return compressWithImageElement(file, size, quality);
}

function compressWithImageElement(file, size, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#0e1526";
        ctx.fillRect(0, 0, size, size);

        const scale = Math.max(size / img.width, size / img.height);

        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;

        const offsetX = (size - drawWidth) / 2;
        const offsetY = (size - drawHeight) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        URL.revokeObjectURL(url);

        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };

    img.src = url;
  });
}
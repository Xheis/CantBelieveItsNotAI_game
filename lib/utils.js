export function shuffle(input) {
  const array = [...input];

  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

export function sanitizeName(name) {
  return String(name ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, 16) || "Player";
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function humanize(id) {
  return String(id)
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
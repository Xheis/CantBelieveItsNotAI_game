export function haptic(pattern = 10) {
  if (!("vibrate" in navigator)) return;

  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore unsupported vibration.
  }
}
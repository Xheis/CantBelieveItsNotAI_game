const CIRCUMFERENCE = 2 * Math.PI * 54;

export function updateCountdown({
  remainingMs,
  totalMs,
  root,
  progressEl,
  numberEl,
}) {
  const ratio = Math.max(0, Math.min(1, remainingMs / totalMs));
  const seconds = Math.ceil(remainingMs / 1000);

  progressEl.style.strokeDashoffset = String(
    CIRCUMFERENCE * (1 - ratio),
  );

  const nextText = String(Number.isFinite(seconds) ? seconds : 0);

  if (numberEl.textContent !== nextText) {
    numberEl.textContent = nextText;

    numberEl.classList.remove("is-pop");
    void numberEl.offsetWidth;
    numberEl.classList.add("is-pop");
  }

  root.classList.toggle("is-critical", seconds <= 3);
}
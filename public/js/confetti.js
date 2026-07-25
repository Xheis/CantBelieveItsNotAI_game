const COLORS = [
  "#8b5cf6",
  "#22d3ee",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#e5e7eb",
];

export function startConfetti(canvas, { duration = 6000 } = {}) {
  if (!canvas) {
    return { stop() {} };
  }

  const ctx = canvas.getContext("2d");

  let running = true;
  let particles = [];
  let raf = null;

  const startedAt = performance.now();

  function resize() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  function spawn(count = 140) {
    particles = [];

    for (let i = 0; i < count; i += 1) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        w: 6 + Math.random() * 8,
        h: 8 + Math.random() * 12,
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 5,
        rot: Math.random() * Math.PI,
        vr: -0.2 + Math.random() * 0.4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }

  function frame(now) {
    if (!running) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vy += 0.04;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (now - startedAt > duration) {
      stop();
      return;
    }

    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;

    if (raf) {
      cancelAnimationFrame(raf);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  resize();
  spawn();

  window.addEventListener("resize", resize);

  raf = requestAnimationFrame(frame);

  return { stop };
}
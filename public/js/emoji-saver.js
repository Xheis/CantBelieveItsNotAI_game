const DEFAULT_EMOJIS = [
    "😂",
    "🙊",
    "🙃",
    "😬",
    "🥱",
    "😵",
    "😪",
    "🤬",
    "🍑",
];

export function createEmojiSaver(container, options = {}) {
    if (!container) {
        return {
            start() { },
            stop() { },
        };
    }

    const emojis = options.emojis ?? DEFAULT_EMOJIS;
    const maxActive = options.maxActive ?? 4;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
    ).matches;

    let running = false;
    let raf = null;
    let items = [];
    let lastTime = 0;

    function spawn() {
        const el = document.createElement("div");
        el.className = "emoji-float";
        el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

        const size = 3 + Math.random() * 4;
        el.style.fontSize = `${size}rem`;

        container.append(el);

        const rect = el.getBoundingClientRect();

        const w = rect.width || 64;
        const h = rect.height || 64;

        const cw = container.clientWidth;
        const ch = container.clientHeight;

        const edge = Math.floor(Math.random() * 4);
        const speed = 1.1 + Math.random() * 1.7;

        let x = 0;
        let y = 0;
        let vx = 0;
        let vy = 0;

        if (edge === 0) {
            x = -w - 24;
            y = Math.random() * Math.max(1, ch - h);
            vx = speed;
            vy = (Math.random() * 2 - 1) * speed * 0.55;
        } else if (edge === 1) {
            x = cw + 24;
            y = Math.random() * Math.max(1, ch - h);
            vx = -speed;
            vy = (Math.random() * 2 - 1) * speed * 0.55;
        } else if (edge === 2) {
            x = Math.random() * Math.max(1, cw - w);
            y = -h - 24;
            vx = (Math.random() * 2 - 1) * speed * 0.55;
            vy = speed;
        } else {
            x = Math.random() * Math.max(1, cw - w);
            y = ch + 24;
            vx = (Math.random() * 2 - 1) * speed * 0.55;
            vy = -speed;
        }

        if (Math.abs(vx) < 0.35) {
            vx = vx < 0 ? -0.55 : 0.55;
        }

        if (Math.abs(vy) < 0.35) {
            vy = vy < 0 ? -0.55 : 0.55;
        }

        const item = {
            el,
            x,
            y,
            w,
            h,
            vx,
            vy,
            rot: Math.random() * 360,
            vr: -1.25 + Math.random() * 2.5,
            bounces: 0,
            leaving: false,
        };

        el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${item.rot}deg)`;

        items.push(item);
    }

    function frame(time) {
        if (!running) return;

        const dt = Math.min(2, (time - lastTime) / 16.666 || 1);
        lastTime = time;

        const cw = container.clientWidth;
        const ch = container.clientHeight;

        for (const item of [...items]) {
            item.x += item.vx * dt;
            item.y += item.vy * dt;
            item.rot += item.vr * dt;

            if (!item.leaving) {
                if (item.x <= 0) {
                    if (item.bounces + 1 >= 12) {
                        item.leaving = true;
                    } else {
                        item.x = 0;
                        item.vx = Math.abs(item.vx);
                        item.bounces += 1;
                    }
                } else if (item.x + item.w >= cw) {
                    if (item.bounces + 1 >= 12) {
                        item.leaving = true;
                    } else {
                        item.x = cw - item.w;
                        item.vx = -Math.abs(item.vx);
                        item.bounces += 1;
                    }
                }

                if (item.y <= 0) {
                    if (item.bounces + 1 >= 12) {
                        item.leaving = true;
                    } else {
                        item.y = 0;
                        item.vy = Math.abs(item.vy);
                        item.bounces += 1;
                    }
                } else if (item.y + item.h >= ch) {
                    if (item.bounces + 1 >= 12) {
                        item.leaving = true;
                    } else {
                        item.y = ch - item.h;
                        item.vy = -Math.abs(item.vy);
                        item.bounces += 1;
                    }
                }
            }

            const gone =
                item.x > cw + item.w * 2 ||
                item.x < -item.w * 2 ||
                item.y > ch + item.h * 2 ||
                item.y < -item.h * 2;

            if (item.leaving && gone) {
                item.el.remove();
                items = items.filter((existing) => existing !== item);

                if (running && items.length < maxActive) {
                    spawn();
                }

                continue;
            }

            item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, 0) rotate(${item.rot}deg)`;
        }

        raf = requestAnimationFrame(frame);
    }

    return {
        start() {
            if (reducedMotion || running) return;

            running = true;
            lastTime = performance.now();

            while (items.length < maxActive) {
                spawn();
            }

            raf = requestAnimationFrame(frame);
        },

        stop() {
            running = false;

            if (raf) {
                cancelAnimationFrame(raf);
                raf = null;
            }

            for (const item of items) {
                item.el.remove();
            }

            items = [];
        },
    };
}
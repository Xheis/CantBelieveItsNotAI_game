export function $(selector, root = document) {
  return root.querySelector(selector);
}

export function $all(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function clear(element) {
  if (!element) return;

  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function setText(element, text) {
  if (!element) return;

  element.textContent = text ?? "";
}

export function toggleHidden(element, hidden) {
  if (!element) return;

  element.hidden = Boolean(hidden);
}

export function renderAvatar(avatar, className = "avatar") {
  const el = document.createElement("div");
  el.className = className;

  if (avatar?.kind === "image" && avatar.url) {
    const img = document.createElement("img");
    img.src = avatar.url;
    img.alt = "";
    el.append(img);
  } else {
    el.textContent = avatar?.value || "🤖";
  }

  return el;
}

export function playerCard(player, { youId = null } = {}) {
  const card = document.createElement("div");

  card.className = `player-card ${player.connected ? "" : "is-offline"}`;

  card.append(renderAvatar(player.avatar));

  const meta = document.createElement("div");
  meta.className = "player-card__meta";

  const name = document.createElement("div");
  name.className = "player-card__name";
  name.textContent = player.name + (player.id === youId ? " (You)" : "");

  const score = document.createElement("div");
  score.className = "player-card__score";
  score.textContent = `${player.score.toLocaleString()} pts`;

  meta.append(name, score);
  card.append(meta);

  if (player.isHost) {
    const host = document.createElement("div");
    host.className = "host-chip";
    host.textContent = "HOST";
    card.append(host);
  }

  return card;
}

export function leaderboardRows(container, entries, { compact = false, youId = null } = {}) {
  clear(container);

  for (const entry of entries) {
    const row = createLeaderboardRow(entry, {
      compact,
      youId,
      displayRank: entry.rank,
      displayScore: entry.score,
      showDelta: true,
    });

    container.append(row);
  }
}

export function renderLeaderboardAnimated(
  container,
  entries,
  { compact = false, youId = null } = {},
) {
  clear(container);

  if (!entries.length) return;

  const hasChanges = entries.some((entry) => {
    const earned = entry.pointsEarned ?? entry.score - (entry.prevScore ?? 0);
    return earned > 0;
  });

  if (!hasChanges) {
    leaderboardRows(container, entries, { compact, youId });
    return;
  }

  const initial = [...entries].sort((a, b) => {
    return (a.prevRank ?? a.rank) - (b.prevRank ?? b.rank);
  });

  const rowMap = new Map();

  for (const entry of initial) {
    const row = createLeaderboardRow(entry, {
      compact,
      youId,
      displayRank: entry.prevRank ?? entry.rank,
      displayScore: entry.prevScore ?? entry.score,
      showDelta: false,
    });

    row.dataset.id = entry.id;

    container.append(row);
    rowMap.set(entry.id, row);
  }

  const countDelay = compact ? 180 : 350;
  const reorderDelay = compact ? 850 : 1500;
  const countDuration = compact ? 500 : 900;

  setTimeout(() => {
    for (const entry of entries) {
      const row = rowMap.get(entry.id);

      if (!row) continue;

      const earned = entry.pointsEarned ?? entry.score - (entry.prevScore ?? 0);

      if (earned > 0) {
        const scoreEl = row.querySelector(".leaderboard-row__score");

        scoreEl.dataset.value = String(entry.prevScore ?? 0);
        row.classList.add("is-scoring");

        countUp(scoreEl, entry.score, countDuration);
      }
    }
  }, countDelay);

  setTimeout(() => {
    flipSort(container, entries, rowMap);

    for (const entry of entries) {
      const row = rowMap.get(entry.id);

      if (row) {
        updateRowFinal(row, entry, youId);
      }
    }
  }, reorderDelay);
}

function createLeaderboardRow(
  entry,
  { compact = false, youId = null, displayRank, displayScore, showDelta = true } = {},
) {
  const row = document.createElement("div");

  row.className = `leaderboard-row ${displayRank <= 3 ? "is-top" : ""}`;
  row.dataset.id = entry.id;

  const rank = document.createElement("div");
  rank.className = "leaderboard-row__rank";
  rank.textContent = String(displayRank);

  const avatar = renderAvatar(
    entry.avatar,
    compact ? "avatar avatar--small" : "avatar",
  );

  const name = document.createElement("div");
  name.className = "leaderboard-row__name";
  name.textContent = entry.name + (entry.id === youId ? " (You)" : "");

  const score = document.createElement("div");
  score.className = "leaderboard-row__score";
  score.dataset.value = String(displayScore);
  score.textContent = Number(displayScore).toLocaleString();

  const delta = document.createElement("div");
  delta.className = "leaderboard-row__delta";

  if (showDelta) {
    updateDelta(delta, entry);
  } else {
    delta.textContent = "—";
  }

  row.append(rank, avatar, name, score, delta);

  return row;
}

function updateRowFinal(row, entry, youId) {
  row.classList.toggle("is-top", entry.rank <= 3);

  const rank = row.querySelector(".leaderboard-row__rank");
  rank.textContent = String(entry.rank);

  const name = row.querySelector(".leaderboard-row__name");
  name.textContent = entry.name + (entry.id === youId ? " (You)" : "");

  const score = row.querySelector(".leaderboard-row__score");
  score.dataset.value = String(entry.score);
  score.textContent = entry.score.toLocaleString();

  const delta = row.querySelector(".leaderboard-row__delta");
  updateDelta(delta, entry);

  row.classList.remove("is-scoring");

  row.style.transition = "";
  row.style.transform = "";
}

function updateDelta(el, entry) {
  if (!el) return;

  el.className = "leaderboard-row__delta";

  if (entry.delta > 0) {
    el.textContent = `▲${entry.delta}`;
    el.classList.add("delta-up");
  } else if (entry.delta < 0) {
    el.textContent = `▼${Math.abs(entry.delta)}`;
    el.classList.add("delta-down");
  } else {
    el.textContent = "—";
  }
}

function flipSort(container, entries, rowMap) {
  const firstRects = new Map();

  for (const [id, row] of rowMap) {
    firstRects.set(id, row.getBoundingClientRect());
  }

  const sorted = [...entries].sort((a, b) => a.rank - b.rank);

  for (const entry of sorted) {
    const row = rowMap.get(entry.id);

    if (row) {
      container.append(row);
    }
  }

  for (const entry of sorted) {
    const row = rowMap.get(entry.id);

    if (!row) continue;

    const first = firstRects.get(entry.id);
    const last = row.getBoundingClientRect();

    const deltaY = first.top - last.top;

    if (Math.abs(deltaY) > 1) {
      row.style.transition = "none";
      row.style.transform = `translateY(${deltaY}px)`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          row.style.transition =
            "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
          row.style.transform = "";
        });
      });

      setTimeout(() => {
        row.style.transition = "";
        row.style.transform = "";
      }, 600);
    }
  }
}

export function countUp(element, to, duration = 900) {
  const from = Number(element.dataset.value ?? 0);
  const start = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);

    element.textContent = value.toLocaleString();

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      element.dataset.value = String(to);
    }
  }

  requestAnimationFrame(frame);
}
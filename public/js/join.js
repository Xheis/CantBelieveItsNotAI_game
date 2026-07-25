import { createSocket } from "./net.js";
import { $, clear, setText, toggleHidden, renderAvatar, playerCard, leaderboardRows } from "./ui.js";
import { createClock } from "./timer.js";
import { AudioEngine } from "./audio.js";
import { haptic } from "./haptics.js";
import { EMOJIS, compressAvatarFile } from "./avatar.js";
import { updateCountdown } from "./countdown.js";

const elements = {
  screenJoin: $("[data-screen-join]"),
  screenLobby: $("[data-screen-lobby]"),
  screenWatch: $("[data-screen-watch]"),
  screenVoting: $("[data-screen-voting]"),
  screenResult: $("[data-screen-result]"),

  nameInput: $("[data-name-input]"),
  avatarPreview: $("[data-avatar-preview]"),
  emojiGrid: $("[data-emoji-grid]"),
  uploadButton: $("[data-upload-button]"),
  avatarFile: $("[data-avatar-file]"),
  joinButton: $("[data-join-button]"),
  status: $("[data-status]"),

  editProfileButton: $("[data-edit-profile-button]"),
  hostSettings: $("[data-host-settings]"),
  packSelector: $("[data-pack-selector]"),
  speedToggle: $("[data-speed-toggle]"),
  startButton: $("[data-start-button]"),
  hostWarnings: $("[data-host-warnings]"),
  playerList: $("[data-player-list]"),

  watchTitle: $("[data-watch-title]"),
  watchText: $("[data-watch-text]"),

  countdown: $("[data-controller-countdown]"),
  countdownProgress: $("[data-countdown-progress]"),
  countdownNumber: $("[data-countdown-number]"),
  voteButtons: [...document.querySelectorAll("[data-vote]")],
  voteStatus: $("[data-vote-status]"),

  result: $("[data-result]"),
};

const audio = new AudioEngine();
const clock = createClock();

let socket = null;
let state = null;
let you = null;

let avatarTab = "emoji";
let selectedEmoji = "🦝";
let imageDataUrl = null;
let hasProfile = false;

const playerId = ensurePlayerId();
const savedProfile = loadProfile();

if (savedProfile) {
  hasProfile = true;
  elements.nameInput.value = savedProfile.name ?? "";
  selectedEmoji = savedProfile.emoji ?? "🦝";
  imageDataUrl = savedProfile.imageDataUrl ?? null;
  avatarTab = savedProfile.avatarTab ?? "emoji";
}

buildEmojiGrid();
updateAvatarPreview();
setAvatarTab(avatarTab);

socket = createSocket("player", {
  onOpen: () => {
    setText(elements.status, "Connected.");
    if (hasProfile) {
      sendJoin();
    }
  },
  onWelcome: (message) => {
    you = message.you;
    saveProfile();
  },
  onState: handleState,
  onError: (message) => {
    setText(elements.status, message.message ?? "Connection error.");
  },
});

elements.joinButton.addEventListener("click", async () => {
  await audio.unlock();
  audio.playSfx("ui-press");
  haptic(12);

  hasProfile = true;
  saveProfile();
  sendJoin();
});

elements.editProfileButton.addEventListener("click", () => {
  audio.playSfx("ui-press");
  haptic(10);
  showScreen("join");
  elements.joinButton.textContent = "Save Profile";
});

// elements.uploadButton.addEventListener("click", () => {
//   audio.playSfx("ui-press");
//   haptic(10);
//   elements.avatarFile.click();
// });

elements.avatarFile.addEventListener("change", async () => {
  const file = elements.avatarFile.files?.[0];

  if (!file) return;

  try {
    imageDataUrl = await compressAvatarFile(file);
    avatarTab = "upload";
    updateAvatarPreview();
    setAvatarTab("upload");
    haptic(18);
  } catch {
    setText(elements.status, "Could not load that image.");
  }
});

elements.speedToggle.addEventListener("change", () => {
  haptic(12);

  socket.send({
    t: "setSpeedBonus",
    enabled: elements.speedToggle.checked,
  });
});

elements.startButton.addEventListener("click", () => {
  audio.unlock();
  audio.playSfx("start");
  haptic(24);

  socket.send({ t: "start" });
});

for (const button of elements.voteButtons) {
  button.addEventListener("click", () => {
    if (state?.phase !== "voting") return;

    audio.unlock();
    audio.playSfx("vote-select");
    haptic(18);

    socket.send({
      t: "vote",
      guess: button.dataset.vote,
    });

    selectVoteButton(button.dataset.vote);
    setText(elements.voteStatus, "Vote sent. You can change until time ends.");
  });
}

startFrameLoop();

function handleState(nextState) {
  state = nextState;

  if (state.you) {
    you = state.you;
  }

  clock.sync(state);
  document.body.dataset.phase = state.phase;

  render();
}

function render() {
  if (!you) {
    showScreen("join");
    return;
  }

  if (state.phase === "lobby") {
    showScreen("lobby");
    renderLobby();
    return;
  }

  if (
    state.phase === "rules" ||
    state.phase === "intro" ||
    state.phase === "playing"
  ) {
    showScreen("watch");
    renderWatch();
    return;
  }

  if (state.phase === "voting") {
    showScreen("voting");
    renderVoting();
    return;
  }

  showScreen("result");
  renderResult();
}

function renderLobby() {
  elements.hostSettings.hidden = !you.isHost;

  elements.speedToggle.checked = Boolean(state.settings.speedBonus);
  elements.startButton.disabled = !state.lobby.canStart;

  clear(elements.packSelector);

  const packs = state.lobby.packs;

  if (packs.length <= 1) {
    elements.packSelector.hidden = true;
  } else {
    elements.packSelector.hidden = false;

    for (const pack of packs) {
      const button = document.createElement("button");
      button.type = "button";

      button.className = `pack-card ${pack.id === state.lobby.selectedPackId ? "is-selected" : ""
        }`;

      if (pack.accent) {
        button.style.setProperty("--pack-accent", pack.accent);
      }

      const logo = document.createElement("img");
      logo.className = "pack-card__logo";
      logo.alt = "";

      if (pack.logo) {
        logo.src = pack.logo;
        logo.addEventListener("error", () => {
          logo.style.display = "none";
        });
      } else {
        logo.style.display = "none";
      }

      const text = document.createElement("div");
      text.className = "pack-card__text";

      const name = document.createElement("div");
      name.className = "pack-card__name";
      name.textContent = pack.name;

      const meta = document.createElement("div");
      meta.className = "pack-card__meta";
      meta.textContent = `${pack.clipCount} clips • ${pack.aiCount} AI • ${pack.realCount} real`;

      const description = document.createElement("div");
      description.className = "pack-card__description";
      description.textContent = pack.description ?? "";

      text.append(name, meta, description);
      button.append(logo, text);

      button.addEventListener("click", () => {
        audio.playSfx("ui-press");
        haptic(14);

        socket.send({
          t: "selectPack",
          packId: pack.id,
        });
      });

      elements.packSelector.append(button);
    }
  }

  clear(elements.hostWarnings);

  for (const warning of state.lobby.warnings) {
    const div = document.createElement("div");
    div.textContent = warning;
    elements.hostWarnings.append(div);
  }

  clear(elements.playerList);

  for (const player of state.lobby.players) {
    elements.playerList.append(playerCard(player, { youId: you.id }));
  }
}

function renderWatch() {
  if (state.phase === "rules") {
    setText(elements.watchTitle, "Rules");
    setText(
      elements.watchText,
      "Watch the main screen for a quick explanation.",
    );
    return;
  }

  setText(elements.watchTitle, `Round ${state.roundNumber}`);

  setText(
    elements.watchText,
    state.phase === "intro"
      ? "Get ready. Watch the main screen."
      : "Watch the main screen. No buttons yet.",
  );
}

function renderVoting() {
  selectVoteButton(state.game.yourVote);

  setText(
    elements.voteStatus,
    state.game.yourVote
      ? `Current vote: ${state.game.yourVote.toUpperCase()}`
      : "Tap AI or REAL.",
  );
}

function renderResult() {
  clear(elements.result);

  if (state.phase === "reveal") {
    renderPersonalReveal();
    return;
  }

  if (state.phase === "leaderboard") {
    renderMiniLeaderboard();
    return;
  }

  if (state.phase === "final") {
    renderFinal();
  }
}

function renderPersonalReveal() {
  const card = document.createElement("div");
  card.className = "result-card card";

  const result = state.game.result;

  const stamp = document.createElement("div");
  stamp.className = `result-card__stamp ${result}`;
  stamp.textContent = result === "ai" ? "AI" : "REAL";

  const myResult = (state.game.roundResults ?? []).find(
    (row) => row.id === you.id,
  );

  const line = document.createElement("div");
  line.className = "result-card__line";

  if (!myResult || myResult.guess === null) {
    line.textContent = "You didn’t vote.";
  } else if (myResult.correct) {
    line.textContent = `You voted ${myResult.guess.toUpperCase()}. Correct.`;
    haptic([30, 40, 30]);
    audio.playSfx("correct");
  } else {
    line.textContent = `You voted ${myResult.guess.toUpperCase()}. Wrong.`;
    haptic(60);
    audio.playSfx("wrong");
  }

  const points = document.createElement("div");
  points.className = `result-card__points ${myResult?.correct ? "good" : "bad"
    }`;
  points.textContent = `+${myResult?.pointsEarned ?? 0}`;

  card.append(stamp, line, points);
  elements.result.append(card);
}

function renderMiniLeaderboard() {
  const wrap = document.createElement("div");
  wrap.className = "card";

  const title = document.createElement("h3");
  title.className = "card__title";
  title.textContent = "Leaderboard";

  const board = document.createElement("div");
  board.className = "mini-leaderboard";

  leaderboardRows(board, state.game.leaderboard ?? [], {
    compact: true,
    youId: you.id,
  });

  wrap.append(title, board);
  elements.result.append(wrap);
}

function renderFinal() {
  const wrap = document.createElement("div");
  wrap.className = "card result-card";

  const winner = state.game.winners?.[0] ?? state.game.leaderboard?.[0];

  const label = document.createElement("div");
  label.className = "final__label";
  label.textContent = "Winner";

  const name = document.createElement("div");
  name.className = "final__name";
  name.textContent = winner?.name ?? "Nobody";

  const score = document.createElement("div");
  score.className = "final__score";
  score.textContent = `${(winner?.score ?? 0).toLocaleString()} points`;

  wrap.append(label, name, score);

  const board = document.createElement("div");
  board.className = "mini-leaderboard";

  leaderboardRows(board, state.game.leaderboard ?? [], {
    compact: true,
    youId: you.id,
  });

  wrap.append(board);

  if (you.isHost) {
    const restart = document.createElement("button");
    restart.className = "btn btn--primary btn--large";
    restart.textContent = "Back to Lobby";

    restart.addEventListener("click", () => {
      audio.playSfx("start");
      haptic(24);

      socket.send({ t: "restart" });
    });

    wrap.append(restart);
  }

  elements.result.append(wrap);

  haptic([60, 60, 60, 60, 120]);
}

function selectVoteButton(guess) {
  for (const button of elements.voteButtons) {
    button.classList.toggle(
      "is-selected",
      button.dataset.vote === guess,
    );
  }
}

function showScreen(name) {
  toggleHidden(elements.screenJoin, name !== "join");
  toggleHidden(elements.screenLobby, name !== "lobby");
  toggleHidden(elements.screenWatch, name !== "watch");
  toggleHidden(elements.screenVoting, name !== "voting");
  toggleHidden(elements.screenResult, name !== "result");
}

function sendJoin() {
  const name = elements.nameInput.value.trim().slice(0, 16) || "Player";

  const avatar =
    avatarTab === "upload" && imageDataUrl
      ? {
        kind: "image",
        dataUrl: imageDataUrl,
      }
      : {
        kind: "emoji",
        value: selectedEmoji,
      };

  socket.send({
    t: "join",
    playerId,
    name,
    avatar,
  });
}

function buildEmojiGrid() {
  clear(elements.emojiGrid);

  for (const emoji of EMOJIS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "emoji-btn";
    button.textContent = emoji;

    if (emoji === selectedEmoji) {
      button.classList.add("is-selected");
    }

    button.addEventListener("click", () => {
      selectedEmoji = emoji;
      avatarTab = "emoji";
      imageDataUrl = imageDataUrl;
      updateAvatarPreview();
      buildEmojiGrid();
      setAvatarTab("emoji");
      haptic(10);
    });

    elements.emojiGrid.append(button);
  }
}

function setAvatarTab(tab) {
  avatarTab = tab;

  elements.emojiGrid.hidden = tab !== "emoji";

  for (const button of document.querySelectorAll("[data-avatar-tab]")) {
    button.classList.toggle(
      "btn--primary",
      button.dataset.avatarTab === tab,
    );
  }
}

function updateAvatarPreview() {
  clear(elements.avatarPreview);

  if (avatarTab === "upload" && imageDataUrl) {
    const img = document.createElement("img");
    img.src = imageDataUrl;
    img.alt = "Avatar preview";
    elements.avatarPreview.append(img);
  } else {
    elements.avatarPreview.textContent = selectedEmoji;
  }
}

function ensurePlayerId() {
  const key = "icbina:playerId";

  let id = localStorage.getItem(key);

  if (!id) {
    id = createLocalId();
    localStorage.setItem(key, id);
  }

  return id;
}

function createLocalId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
}
bytes[6] = (bytes[6] & 0x0f) | 0x40;

function saveProfile() {
  localStorage.setItem(
    "icbina:profile",
    JSON.stringify({
      name: elements.nameInput.value.trim().slice(0, 16),
      emoji: selectedEmoji,
      imageDataUrl,
      avatarTab,
    }),
  );
}

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem("icbina:profile") ?? "null");
  } catch {
    return null;
  }
}

function startFrameLoop() {
  function frame() {
    if (state?.phase === "voting") {
      const remaining = clock.remainingMs(state);
      const total = clock.totalMs(state);

      if (total > 0) {
        updateCountdown({
          remainingMs: remaining,
          totalMs: total,
          root: elements.countdown,
          progressEl: elements.countdownProgress,
          numberEl: elements.countdownNumber,
        });
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
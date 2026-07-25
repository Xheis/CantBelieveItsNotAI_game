import { createSocket } from "./net.js";
import {
  $,
  $all,
  clear,
  setText,
  toggleHidden,
  renderAvatar,
  playerCard,
  leaderboardRows,
  renderLeaderboardAnimated,
} from "./ui.js";
import { createClock } from "./timer.js";
import { AudioEngine } from "./audio.js";
import { updateCountdown } from "./countdown.js";
import { startConfetti } from "./confetti.js";
import { createEmojiSaver } from "./emoji-saver.js";

const elements = {
  unlock: $("[data-unlock]"),
  unlockButton: $("[data-unlock-button]"),

  qr: $("[data-qr]"),
  joinUrl: $("[data-join-url]"),
  mdnsUrl: $("[data-mdns-url]"),
  warnings: $("[data-warnings]"),
  playerGrid: $("[data-player-grid]"),

  packLogo: $("[data-pack-logo]"),
  packName: $("[data-pack-name]"),
  packHeroLogo: $("[data-pack-hero-logo]"),
  packHeroName: $("[data-pack-hero-name]"),
  packHeroDescription: $("[data-pack-hero-description]"),

  speedBadge: $("[data-speed-badge]"),
  muteButton: $("[data-mute-button]"),

  emojiSaver: $("[data-emoji-saver]"),

  stage: $("[data-stage]"),
  video: $("[data-video]"),
  videoProgress: $("[data-video-progress]"),

  roundOverlay: $("[data-round-overlay]"),
  roundNumber: $("[data-round-number]"),

  rulesLeaderboard: $("[data-rules-leaderboard]"),
  rulesSteps: $("[data-rules-steps]"),
  rulesCountdown: $("[data-rules-countdown]"),

  countdown: $("[data-countdown]"),
  countdownProgress: $("[data-countdown-progress]"),
  countdownNumber: $("[data-countdown-number]"),
  voteCount: $("[data-vote-count]"),

  stamp: $("[data-stamp]"),
  roundResults: $("[data-round-results]"),

  leaderboard: $("[data-leaderboard]"),

  final: $("[data-final]"),
  confetti: $("[data-confetti]"),

  captions: $("[data-captions]"),
};

const panels = Object.fromEntries(
  $all("[data-panel]").map((el) => [el.dataset.panel, el]),
);

const audio = new AudioEngine();
const clock = createClock();
const emojiSaver = createEmojiSaver(elements.emojiSaver);

let socket = null;
let state = null;
let activePanel = panels.lobby;

let lastPhaseKey = null;
let lastCueKey = null;
let lastTickSecond = null;
let lastLeaderboardKey = null;
let lastFinalKey = null;

let rulesDemoInterval = null;
let rulesDemoTimeout = null;
let rulesStepInterval = null;
let lastRulesKey = null;
let lastRevealKey = null;


let revealTimeout = null;
let cueTimeout = null;
let captionTimeout = null;
let lobbyVoiceTimeout = null;
let confettiControl = null;

elements.packLogo.addEventListener("error", () => {
  elements.packLogo.hidden = true;
});

elements.packHeroLogo.addEventListener("error", () => {
  elements.packHeroLogo.hidden = true;
});

elements.unlockButton.addEventListener("click", async () => {
  await audio.unlock();

  elements.video.muted = audio.muted;
  elements.unlock.hidden = true;

  socket = createSocket("screen", {
    onState: handleState,
  });

  fetchLobbyInfo();
  startFrameLoop();

  audio.playMusic("lobby");
});

elements.muteButton.addEventListener("click", () => {
  audio.toggleMute();
  elements.video.muted = audio.muted;
  elements.muteButton.textContent = audio.muted ? "🔇" : "🔊";
});

elements.video.addEventListener("canplay", () => {
  if (state?.phase === "intro" && socket) {
    socket.send({ t: "mediaReady" });
  }
});

emojiSaver.start();

async function fetchLobbyInfo() {
  try {
    const response = await fetch("/api/lobby");
    const info = await response.json();

    elements.qr.src = info.qrDataUrl;
    setText(elements.joinUrl, info.primaryUrl);
    setText(
      elements.mdnsUrl,
      info.mdnsUrl ? `Bonjour fallback: ${info.mdnsUrl}` : "",
    );
  } catch {
    setText(elements.joinUrl, "Could not load lobby info.");
  }
}

function handleState(nextState) {
  state = nextState;
  clock.sync(state);

  document.body.dataset.phase = state.phase;

  render();
  phaseEffects();
  maybeCue();
}

function render() {
  renderTopbar();

  if (state.phase === "lobby") {
    showPanel("lobby");
    renderLobby();
    pauseVideo();
    return;
  }

  if (state.phase === "rules") {
    showPanel("rules");
    renderRules();
    pauseVideo();
    return;
  }

  if (["intro", "playing", "voting", "reveal"].includes(state.phase)) {
    showPanel("stage");
    renderStage();
    return;
  }

  if (state.phase === "leaderboard") {
    showPanel("leaderboard");
    renderLeaderboard();
    return;
  }

  if (state.phase === "final") {
    showPanel("final");
    renderFinal();
    pauseVideo();
  }
}

function showPanel(name) {
  const next = panels[name];

  if (!next || next === activePanel) return;

  const current = activePanel;

  if (current) {
    current.classList.add("is-leaving-up");
    current.classList.remove("is-active");

    setTimeout(() => {
      current.classList.add("no-transition");
      current.classList.remove("is-leaving-up");

      void current.offsetWidth;

      current.classList.remove("no-transition");
    }, 700);
  }

  next.classList.add("no-transition");
  next.classList.remove("is-leaving-up");

  void next.offsetWidth;

  next.classList.remove("no-transition");
  next.classList.add("is-active");

  activePanel = next;
}
function renderTopbar() {
  const selectedPack = state.lobby.packs.find(
    (pack) => pack.id === state.lobby.selectedPackId,
  );

  if (selectedPack?.logo) {
    elements.packLogo.src = selectedPack.logo;
    elements.packLogo.hidden = false;

    elements.packHeroLogo.src = selectedPack.logo;
    elements.packHeroLogo.hidden = false;
  } else {
    elements.packLogo.hidden = true;
    elements.packHeroLogo.hidden = true;
  }

  setText(elements.packName, selectedPack?.name ?? "No Pack");
  setText(elements.packHeroName, selectedPack?.name ?? "No Pack");
  setText(elements.packHeroDescription, selectedPack?.description ?? "");

  if (selectedPack?.accent) {
    document.documentElement.style.setProperty(
      "--pack-accent",
      selectedPack.accent,
    );
  }

  setText(
    elements.speedBadge,
    state.settings.speedBonus ? "Speed Bonus On" : "Speed Bonus Off",
  );

  elements.muteButton.textContent = audio.muted ? "🔇" : "🔊";
}

function renderLobby() {
  clear(elements.playerGrid);

  for (const player of state.lobby.players) {
    elements.playerGrid.append(playerCard(player));
  }

  clear(elements.warnings);

  for (const warning of state.lobby.warnings) {
    const div = document.createElement("div");
    div.textContent = warning;
    elements.warnings.append(div);
  }

  emojiSaver.start();
}

const RULES_CAST = [
  {
    id: "rules-1",
    name: "Alice",
    avatar: { kind: "emoji", value: "🦝" },
  },
  {
    id: "rules-2",
    name: "Bob",
    avatar: { kind: "emoji", value: "🍕" },
  },
  {
    id: "rules-3",
    name: "Chloe",
    avatar: { kind: "emoji", value: "🐸" },
  },
  {
    id: "rules-4",
    name: "Dan",
    avatar: { kind: "emoji", value: "🤖" },
  },
  {
    id: "rules-5",
    name: "Erin",
    avatar: { kind: "emoji", value: "🔥" },
  },
];

function renderRules() {
  const key = `rules:${state.phaseStartedAt}`;

  if (key !== lastRulesKey) {
    lastRulesKey = key;
    startRulesDemo();
  }

  updateRulesCountdown();
}

function startRulesDemo() {
  stopRulesDemo();

  if (!elements.rulesLeaderboard) return;

  let players = RULES_CAST.map((player) => ({
    ...player,
    score: 0,
  }));

  let entries = players.map((player, index) => ({
    ...player,
    rank: index + 1,
    prevRank: null,
    prevScore: 0,
    pointsEarned: 0,
    delta: 0,
  }));

  renderLeaderboardAnimated(elements.rulesLeaderboard, entries, {
    compact: false,
    youId: null,
  });

  const tick = () => {
    if (state?.phase !== "rules") return;

    for (const player of players) {
      if (Math.random() < 0.65) {
        const options = [1000, 1000, 1500, 2000];
        player.score += options[Math.floor(Math.random() * options.length)];
      }
    }

    const prevById = new Map(entries.map((entry) => [entry.id, entry]));

    const sorted = [...players].sort((a, b) => b.score - a.score);

    entries = sorted.map((player, index) => {
      const prev = prevById.get(player.id);

      const prevRank = prev?.rank ?? null;
      const prevScore = prev?.score ?? 0;

      return {
        ...player,
        rank: index + 1,
        prevRank,
        prevScore,
        pointsEarned: Math.max(0, player.score - prevScore),
        delta: prevRank ? prevRank - (index + 1) : 0,
      };
    });

    renderLeaderboardAnimated(elements.rulesLeaderboard, entries, {
      compact: false,
      youId: null,
    });
  };

  rulesDemoTimeout = setTimeout(tick, 7500);
  rulesDemoInterval = setInterval(tick, 10000);

  startRulesSteps();
}

function startRulesSteps() {
  if (!elements.rulesSteps) return;

  const steps = [...elements.rulesSteps.children];

  let index = 0;

  const activate = () => {
    steps.forEach((step, stepIndex) => {
      step.classList.toggle("is-active", stepIndex === index);
    });

    index = (index + 1) % steps.length;
  };

  activate();

  rulesStepInterval = setInterval(activate, 2300);
}

function stopRulesDemo() {
  clearTimeout(rulesDemoTimeout);
  clearInterval(rulesDemoInterval);
  clearInterval(rulesStepInterval);

  rulesDemoTimeout = null;
  rulesDemoInterval = null;
  rulesStepInterval = null;
}

function updateRulesCountdown() {
  if (!state || state.phase !== "rules") return;

  const remaining = clock.remainingMs(state);

  if (!Number.isFinite(remaining)) {
    setText(elements.rulesCountdown, "Starting soon…");
    return;
  }

  const seconds = Math.max(0, Math.ceil(remaining / 1000));

  setText(elements.rulesCountdown, `Starting in ${seconds}s`);
}

function renderStage() {
  const isIntro = state.phase === "intro";
  console.info("[CLIENT] renderStage phase:", state.phase);
  toggleHidden(elements.roundOverlay, !isIntro);

  elements.stage.classList.toggle(
    "is-frozen",
    state.phase === "voting" || state.phase === "reveal",
  );

  if (isIntro) {
    setText(elements.roundNumber, String(state.roundNumber));
    setVideoSrc(state.game.videoUrl, true);
    pauseVideo();

    elements.countdown.hidden = true;
    elements.voteCount.textContent = "";
    elements.stamp.hidden = true;

    clear(elements.roundResults);
    return;
  }

  if (state.phase === "playing") {
    setVideoSrc(state.game.videoUrl, false);
    playVideo();

    elements.countdown.hidden = true;
    elements.voteCount.textContent = "";
    elements.stamp.hidden = true;

    clear(elements.roundResults);
    return;
  }

  if (state.phase === "voting") {
    pauseVideo();

    elements.countdown.hidden = false;

    setText(
      elements.voteCount,
      `Votes: ${state.game.votedCount ?? 0} / ${state.game.totalVoters ?? 0}`,
    );

    elements.stamp.hidden = true;

    clear(elements.roundResults);
    return;
  }

  if (state.phase === "reveal") {
    pauseVideo();

    elements.countdown.hidden = true;
    elements.voteCount.textContent = "";
    console.log("renderReveal()")
    renderReveal();
  }
}

function renderReveal() {
  const result = state.game.result;

  if (!result) return;

  const key = `reveal:${state.phaseStartedAt}:${result}`;

  if (key === lastRevealKey) return;

  lastRevealKey = key;

  console.info("[CLIENT] Building stamp for result:", result);

  buildStamp(result);

  const elapsed = clock.elapsedMs(state);
  const suspense = state.settings.revealSuspenseMs ?? 1200;

  const delay = Math.max(0, Math.min(suspense - elapsed, suspense));

  console.info("[CLIENT] Stamp delay:", delay);

  clearTimeout(revealTimeout);

  revealTimeout = setTimeout(() => {
    console.info("[CLIENT] Showing stamp now");

    elements.stamp.hidden = false;

    void elements.stamp.offsetWidth;

    elements.stamp.classList.add("is-visible");

    elements.stage.classList.add("is-stamped");

    audio.playSfx(result === "ai" ? "stamp-ai" : "stamp-real");

    setTimeout(() => {
      elements.stage.classList.remove("is-stamped");
    }, 450);
  }, delay);

  clear(elements.roundResults);

  for (const row of state.game.roundResults ?? []) {
    const chip = document.createElement("div");
    chip.className = `result-chip ${row.correct ? "is-correct" : "is-wrong"}`;

    chip.append(renderAvatar(row.avatar, "avatar avatar--small"));

    const name = document.createElement("div");
    name.textContent = row.name;

    const points = document.createElement("div");
    points.className = "result-chip__points";
    points.textContent = row.correct ? `+${row.pointsEarned}` : "+0";

    chip.append(name, points);
    elements.roundResults.append(chip);
  }
}
function buildStamp(result) {
  const stamp = elements.stamp;

  stamp.className = `stamp stamp--${result}`;
  stamp.hidden = false;
  stamp.classList.remove("is-visible");
  stamp.replaceChildren();

  const splatter = document.createElement("div");
  splatter.className = "stamp__splatter";

  const blobCount = 18;

  for (let i = 0; i < blobCount; i += 1) {
    const blob = document.createElement("i");

    const angle = Math.random() * Math.PI * 2;
    const distance = 70 + Math.random() * 180;

    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;

    const size = 10 + Math.random() * 54;
    const scale = 0.7 + Math.random() * 1.5;
    const delay = Math.random() * 90;

    blob.style.setProperty("--tx", `${tx}px`);
    blob.style.setProperty("--ty", `${ty}px`);
    blob.style.setProperty("--size", `${size}px`);
    blob.style.setProperty("--scale", scale.toFixed(2));
    //blob.style.setProperty("--delay", `${delay}ms`);

    splatter.append(blob);
  }

  const text = document.createElement("div");
  text.className = "stamp__text";
  text.textContent = result === "ai" ? "AI" : "REAL";

  stamp.append(splatter, text);
}

function renderLeaderboard() {
  const key = `${state.phase}:${state.phaseStartedAt}`;

  if (key === lastLeaderboardKey) return;

  lastLeaderboardKey = key;

  renderLeaderboardAnimated(elements.leaderboard, state.game.leaderboard ?? [], {
    compact: false,
    youId: null,
  });

  preloadNextVideo();
}

function renderFinal() {
  const key = `final:${state.phaseStartedAt}`;

  if (key === lastFinalKey) return;

  lastFinalKey = key;

  clear(elements.final);

  const card = document.createElement("div");
  card.className = "final__card card";

  const label = document.createElement("div");
  label.className = "final__label";
  label.textContent = "Winner";

  const winner = state.game.winners?.[0] ?? state.game.leaderboard?.[0];

  if (winner) {
    const winnerWrap = document.createElement("div");
    winnerWrap.className = "final__winner";

    const avatar = renderAvatar(winner.avatar, "avatar final__avatar");

    const name = document.createElement("div");
    name.className = "final__name";
    name.textContent = winner.name;

    const score = document.createElement("div");
    score.className = "final__score";
    score.textContent = `${winner.score.toLocaleString()} points`;

    winnerWrap.append(avatar, name, score);
    card.append(label, winnerWrap);
  }

  const leaderboardWrap = document.createElement("div");
  leaderboardWrap.className = "final__leaderboard";

  const title = document.createElement("h3");
  title.className = "panel-title";
  title.textContent = "Final Scores";

  const board = document.createElement("div");
  board.className = "leaderboard";

  leaderboardRows(board, state.game.leaderboard ?? [], { youId: null });

  leaderboardWrap.append(title, board);
  card.append(leaderboardWrap);

  elements.final.append(card);

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  confettiControl = startConfetti(elements.confetti, {
    duration: 8000,
  });

  // if (!reduceMotion) {
  //   confettiControl?.stop?.();
  //   confettiControl = startConfetti(elements.confetti, {
  //     duration: 8000,
  //   });
  // }
}

function phaseEffects() {
  const phaseKey = `${state.phase}:${state.phaseStartedAt}`;

  if (phaseKey === lastPhaseKey) return;

  lastPhaseKey = phaseKey;

  // Stop lobby voice scheduling and stop any voice already playing.
  stopLobbyVoice();

  if (state.phase == "rules") {
    audio.stopVoice();
    console.log("state.phase = rules, so stop the lobby voice lines");
  }
  // Stop rules announcement if we are leaving rules.
  audio.stopAnnouncement(0.15);

  // Only clear the stamp timeout when leaving reveal,
  // not when entering reveal.

  console.log(state.phase);
  if (state.phase !== "reveal") {
    console.log("state.phase NOT REVEAL");
    console.log(state.phase);
    clearTimeout(revealTimeout);
  }

  confettiControl?.stop?.();
  stopRulesDemo();

  if (state.phase === "lobby") {
    emojiSaver.start();
    audio.playMusic("lobby");
    startLobbyVoice();
    return;
  }

  emojiSaver.stop();

  switch (state.phase) {
    case "rules": {
      audio.stopMusic();

      if (clock.remainingMs(state) > 3000) {
        audio.playAnnouncement("rules");
      }

      startRulesDemo();
      break;
    }

    case "intro": {
      audio.stopMusic();
      audio.playSfx("round-card");
      break;
    }

    case "playing": {
      audio.stopMusic();
      audio.playSfx("glitch");
      break;
    }

    case "voting": {
      audio.playMusic("countdown");
      audio.playSfx("vote-open");
      break;
    }

    case "reveal": {
      audio.stopMusic();
      audio.playSfx("suspense");
      break;
    }

    case "leaderboard": {
      audio.playMusic("leaderboard");
      audio.playSfx("leaderboard-rise");
      break;
    }

    case "final": {
      audio.playMusic("final");
      audio.playSfx("winner");
      break;
    }
  }
}

function startLobbyVoice() {
  stopLobbyVoice();
  scheduleLobbyVoice(7000);
}

function stopLobbyVoice() {
  clearTimeout(lobbyVoiceTimeout);
  lobbyVoiceTimeout = null;
}

function scheduleLobbyVoice(delay) {
  lobbyVoiceTimeout = setTimeout(async () => {
    if (state?.phase !== "lobby") return;

    try {
      const response = await fetch("/api/voice/lobby");
      const cue = await response.json();

      if (cue?.src && state?.phase === "lobby") {
        showCaption(cue.subtitle);
        audio.playVoice(cue.src);
      }
    } catch {
      // Ignore missing voice files or route issues.
    }

    scheduleLobbyVoice(18000 + Math.random() * 17000);
  }, delay);
}

function maybeCue() {
  if (!state.cue) return;

  const cueKey = `${state.phase}:${state.phaseStartedAt}:${state.cue.id}`;

  if (cueKey === lastCueKey) return;

  lastCueKey = cueKey;

  clearTimeout(cueTimeout);

  cueTimeout = setTimeout(() => {
    showCaption(state.cue.subtitle);
    audio.playVoice(state.cue.src);
  }, 0);
}

function showCaption(text) {
  if (!text) return;

  setText(elements.captions, text);
  elements.captions.classList.add("is-visible");

  clearTimeout(captionTimeout);

  captionTimeout = setTimeout(() => {
    elements.captions.classList.remove("is-visible");
  }, 3800);
}

function setVideoSrc(url, preloadMuted) {
  if (!url) return;

  if (elements.video.dataset.url !== url) {
    elements.video.dataset.url = url;
    elements.video.src = url;
    elements.video.load();
  }

  elements.video.muted = preloadMuted ? true : audio.muted;
}

function playVideo() {
  elements.stage.classList.remove("is-entering");
  void elements.stage.offsetWidth;
  elements.stage.classList.add("is-entering");

  const elapsed = clock.elapsedMs(state);

  if (elapsed > 0 && Number.isFinite(elements.video.duration)) {
    elements.video.currentTime = Math.min(
      elapsed / 1000,
      elements.video.duration,
    );
  }

  elements.video
    .play()
    .then(() => {
      elements.video.muted = audio.muted;
    })
    .catch(() => {
      elements.video.muted = true;

      elements.video.play().catch(() => {
        // Ignore playback failure.
      });
    });
}

function pauseVideo() {
  elements.video.pause();
}

function preloadNextVideo() {
  const url = state.game.preloadNextUrl;

  if (!url) return;

  if (elements.video.dataset.url !== url) {
    elements.video.dataset.url = url;
    elements.video.muted = true;
    elements.video.src = url;
    elements.video.load();
  }
}

function startFrameLoop() {
  function frame() {
    updateDynamic();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function updateDynamic() {
  if (!state) return;

  if (state.phase === "rules") {
    updateRulesCountdown();
  }

  const remaining = clock.remainingMs(state);
  const total = clock.totalMs(state);

  if (state.phase === "playing" && total > 0) {
    const elapsed = total - remaining;
    const ratio = Math.min(1, Math.max(0, elapsed / total));

    elements.videoProgress.style.transform = `scaleX(${ratio})`;

    if (remaining <= 0) {
      pauseVideo();
    }
  }

  if (state.phase === "voting" && total > 0) {
    updateCountdown({
      remainingMs: remaining,
      totalMs: total,
      root: elements.countdown,
      progressEl: elements.countdownProgress,
      numberEl: elements.countdownNumber,
    });

    const second = Math.ceil(remaining / 1000);

    if (second !== lastTickSecond && second > 0 && remaining > 0) {
      lastTickSecond = second;
      audio.playSfx(second <= 3 ? "tick-critical" : "tick-normal");
    }
  } else {
    lastTickSecond = null;
  }
}
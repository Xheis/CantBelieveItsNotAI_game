import { randomUUID } from "node:crypto";

import { selectClips } from "./videos.js";
import { scoreVote, comparePlayers } from "./scoring.js";
import { normalizeAvatar } from "./avatars.js";
import { makeCue } from "./voice.js";
import { sanitizeName } from "./utils.js";

const PLAYER_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;

export class Game {
  constructor(config, packs, allAssets, avatarStore, initialWarnings = []) {
    this.config = config;
    this.packs = packs;
    this.allAssets = allAssets;
    this.avatarStore = avatarStore;

    this.players = new Map();
    this.screens = new Set();

    this.phase = "lobby";
    this.roundNumber = 0;
    this.clips = [];
    this.votes = new Map();

    this.hostId = null;
    this.selectedPackId = packs[0]?.id ?? null;

    this.settings = {
      speedBonus: config.speedBonusDefault,
      revealSuspenseMs: config.revealSuspenseMs,
    };

    this.warnings = [...initialWarnings];

    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = null;
    this.phaseToken = 0;
    this.phaseTimer = null;

    this.cue = null;
    this.roundResults = [];
    this.leaderboard = [];
    this.winners = [];
    this.lastResult = null;
    this.votingStartMs = 0;
    this.mediaReady = false;

    this.updateWarnings();
    this.enterLobby();
  }

  get selectedPack() {
    return this.packs.find((pack) => pack.id === this.selectedPackId) ?? null;
  }

  chooseLeaderboardCue() {
    const result = this.lastResult;

    const correctCount = this.roundResults.filter(
      (row) => row.correct,
    ).length;

    const total = this.players.size;
    const ratio = total === 0 ? 0 : correctCount / total;

    if (total > 0 && ratio >= 0.35 && ratio <= 0.65) {
      return makeCue("result_mixed");
    }

    if (result === "ai") {
      return makeCue("reveal_ai");
    }

    if (result === "real") {
      return makeCue("reveal_real");
    }

    return makeCue("leaderboard", { probability: 0.5 });
  }

  getAsset(id) {
    return this.allAssets.get(id);
  }

  canStart() {
    return (
      this.phase === "lobby" &&
      this.players.size >= this.config.minPlayers &&
      Boolean(this.selectedPack) &&
      this.selectedPack.clipCount > 0
    );
  }

  currentClip() {
    if (this.roundNumber <= 0) return null;
    return this.clips[this.roundNumber - 1] ?? null;
  }

  onConnection(ws, type) {
    ws.clientType = type;
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    if (type === "screen") {
      this.screens.add(ws);

      this.send(ws, {
        t: "state",
        state: this.stateForScreen(),
      });

      ws.on("message", (raw) => this.handleScreenMessage(ws, raw));

      ws.on("close", () => {
        this.screens.delete(ws);
      });

      return;
    }

    ws.on("message", (raw) => this.handlePlayerMessage(ws, raw));

    ws.on("close", () => {
      this.handlePlayerDisconnect(ws);
    });
  }

  handleScreenMessage(ws, raw) {
    const message = parseMessage(raw);

    if (!message) return;

    if (message.t === "mediaReady") {
      this.markMediaReady();
    }
  }

  handlePlayerMessage(ws, raw) {
    const message = parseMessage(raw);

    if (!message) return;

    if (message.t === "join") {
      this.handleJoin(ws, message);
      return;
    }

    const player = ws.playerId ? this.players.get(ws.playerId) : null;

    if (!player) return;

    switch (message.t) {
      case "updateProfile": {
        if (this.phase !== "lobby") return;

        if (message.name) {
          player.name = sanitizeName(message.name);
        }

        if (message.avatar) {
          player.avatar = normalizeAvatar(
            message.avatar,
            this.avatarStore,
            this.config,
          );
        }

        this.broadcast();
        break;
      }

      case "selectPack": {
        if (this.phase !== "lobby") return;
        if (player.id !== this.hostId) return;

        this.selectPack(message.packId);
        break;
      }

      case "setSpeedBonus": {
        if (this.phase !== "lobby") return;
        if (player.id !== this.hostId) return;

        this.settings.speedBonus = Boolean(message.enabled);
        this.broadcast();
        break;
      }

      case "start": {
        if (player.id !== this.hostId) return;

        this.start();
        break;
      }

      case "vote": {
        this.castVote(player.id, message.guess);
        break;
      }

      case "restart": {
        if (player.id !== this.hostId) return;

        this.restartToLobby();
        break;
      }
    }
  }

  handleJoin(ws, message) {
    const requestedId =
      typeof message.playerId === "string" && PLAYER_ID_RE.test(message.playerId)
        ? message.playerId
        : null;

    const existing = requestedId ? this.players.get(requestedId) : null;

    if (existing) {
      this.reconnectPlayer(ws, existing, message);
      return;
    }

    if (this.phase !== "lobby") {
      this.send(ws, {
        t: "error",
        message: "Game already in progress.",
      });
      return;
    }

    if (this.players.size >= this.config.maxPlayers) {
      this.send(ws, {
        t: "error",
        message: "Lobby is full.",
      });
      return;
    }

    const id = requestedId && !this.players.has(requestedId)
      ? requestedId
      : randomUUID();

    const player = {
      id,
      name: sanitizeName(message.name),
      avatar: normalizeAvatar(message.avatar, this.avatarStore, this.config),
      score: 0,
      correct: 0,
      tieTimeMs: 0,
      connected: true,
      joinedAt: Date.now(),
      socket: ws,
      disconnectTimer: null,
    };

    this.players.set(id, player);

    if (!this.hostId) {
      this.hostId = id;
    }

    ws.playerId = id;

    this.sendWelcome(ws, player);
    this.broadcast();
  }

  reconnectPlayer(ws, player, message) {
    clearTimeout(player.disconnectTimer);

    const oldSocket = player.socket;

    player.connected = true;
    player.socket = ws;
    ws.playerId = player.id;

    if (this.phase === "lobby") {
      if (message.name) {
        player.name = sanitizeName(message.name);
      }

      if (message.avatar) {
        player.avatar = normalizeAvatar(
          message.avatar,
          this.avatarStore,
          this.config,
        );
      }
    }

    if (!this.hostId) {
      this.hostId = player.id;
    }

    if (oldSocket && oldSocket !== ws) {
      try {
        oldSocket.close();
      } catch {
        // Ignore socket close errors.
      }
    }

    this.sendWelcome(ws, player);
    this.broadcast();
  }

  handlePlayerDisconnect(ws) {
    const player = ws.playerId ? this.players.get(ws.playerId) : null;

    if (!player) return;

    if (player.socket === ws) {
      player.connected = false;
      player.socket = null;
    }

    if (player.id === this.hostId) {
      clearTimeout(player.disconnectTimer);

      player.disconnectTimer = setTimeout(() => {
        const current = this.players.get(player.id);

        if (!current?.connected) {
          this.migrateHost();
        }
      }, 10_000);
    }

    this.broadcast();
  }

  migrateHost() {
    const connected = [...this.players.values()]
      .filter((player) => player.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt);

    this.hostId = connected[0]?.id ?? null;

    if (!this.hostId && this.phase !== "lobby") {
      this.enterLobby();
    }

    this.broadcast();
  }

  selectPack(packId) {
    const pack = this.packs.find((item) => item.id === packId);

    if (!pack) return;

    this.selectedPackId = packId;
    this.updateWarnings();
    this.broadcast();
  }

  updateWarnings() {
    const warnings = [];
    const pack = this.selectedPack;

    if (!pack) {
      warnings.push("Select a video pack.");
    } else {
      if (pack.clipCount === 0) {
        warnings.push("This pack has no clips.");
      }

      if (pack.clipCount > 0 && pack.clipCount < this.config.rounds) {
        warnings.push(
          `This pack has ${pack.clipCount} clips. Some clips may repeat.`,
        );
      }

      if (pack.aiCount === 0) {
        warnings.push("This pack has no AI clips.");
      }

      if (pack.realCount === 0) {
        warnings.push("This pack has no real clips.");
      }
    }

    this.warnings = warnings;
  }

  start() {
    if (!this.canStart()) return;

    const pack = this.selectedPack;

    this.clips = selectClips(pack.assets, this.config);
    this.roundNumber = 1;

    for (const player of this.players.values()) {
      player.score = 0;
      player.correct = 0;
      player.tieTimeMs = 0;
    }

    this.enterRules();
  }

  enterLobby() {
    this.roundNumber = 0;
    this.clips = [];
    this.votes.clear();
    this.roundResults = [];
    this.leaderboard = [];
    this.winners = [];
    this.lastResult = null;
    this.cue = makeCue("lobby");

    this.setPhase("lobby", null);
  }

  enterIntro() {
    this.votes.clear();
    this.roundResults = [];
    this.lastResult = null;
    this.mediaReady = false;
    this.cue = makeCue("intro");

    this.setPhase("intro", this.config.introMs);
  }

  enterPlaying() {
    this.cue = null;
    this.setPhase("playing", this.config.playMs);
  }

  enterVoting() {
    this.votingStartMs = Date.now();
    this.cue = makeCue("voting", { probability: 0.8 });

    this.setPhase("voting", this.config.voteMs);
  }

  enterReveal() {
    const clip = this.currentClip();

    if (!clip) {
      this.enterLobby();
      return;
    }

    this.lastResult = clip.type;

    const results = [];

    for (const player of this.players.values()) {
      const vote = this.votes.get(player.id);
      const correct = Boolean(vote && vote.guess === clip.type);

      const scored = scoreVote({
        correct,
        voteMs: vote?.atMs,
        votingStartMs: this.votingStartMs,
        settings: this.settings,
        config: this.config,
      });

      if (correct) {
        player.score += scored.points;
        player.correct += 1;
        player.tieTimeMs += scored.elapsed;
      }

      results.push({
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        guess: vote?.guess ?? null,
        correct,
        pointsEarned: scored.points,
      });
    }

    this.roundResults = results.sort((a, b) => {
      return (
        Number(b.correct) - Number(a.correct) ||
        b.pointsEarned - a.pointsEarned
      );
    });

    this.leaderboard = this.buildLeaderboard();

    const correctCount = results.filter((result) => result.correct).length;
    const total = this.players.size;
    const ratio = total === 0 ? 0 : correctCount / total;

    if (total > 0 && ratio >= 0.35 && ratio <= 0.65) {
      this.cue = makeCue("result_mixed");
    } else {
      this.cue = makeCue(clip.type === "ai" ? "reveal_ai" : "reveal_real");
    }
    this.cue = null; //Now doing leaderboard after
    this.setPhase("reveal", this.config.revealMs);
  }

  enterLeaderboard() {
    if (this.roundNumber >= this.config.rounds) {
      this.enterFinal();
      return;
    }

    this.cue = this.chooseLeaderboardCue();

    this.setPhase("leaderboard", this.config.leaderboardMs);
  }

  enterFinal() {
    if (this.leaderboard.length === 0) {
      this.leaderboard = this.buildLeaderboard();
    }

    const topScore = this.leaderboard[0]?.score ?? 0;

    this.winners = this.leaderboard.filter(
      (entry) => entry.score === topScore,
    );

    this.cue = makeCue("final");

    this.setPhase("final", null);
  }
  restartToLobby() {
    for (const player of this.players.values()) {
      player.score = 0;
      player.correct = 0;
      player.tieTimeMs = 0;
    }

    this.clips = [];
    this.roundNumber = 0;
    this.votes.clear();
    this.roundResults = [];
    this.leaderboard = [];
    this.winners = [];
    this.lastResult = null;
    this.cue = makeCue("restart", { probability: 0.9 });

    this.setPhase("lobby", null);
  }

  advance() {
    switch (this.phase) {
      case "rules": {
        this.enterIntro();
        break;
      }

      case "intro": {
        this.enterPlaying();
        break;
      }

      case "playing": {
        this.enterVoting();
        break;
      }

      case "voting": {
        this.enterReveal();
        break;
      }

      case "reveal": {
        this.enterLeaderboard();
        break;
      }

      case "leaderboard": {
        this.roundNumber += 1;
        this.enterIntro();
        break;
      }
    }
  }

  enterRules() {
    if (!this.config.rulesMs) {
      this.enterIntro();
      return;
    }

    this.votes.clear();
    this.roundResults = [];
    this.lastResult = null;
    this.mediaReady = false;
    this.cue = null;

    this.setPhase("rules", this.config.rulesMs);
  }

  markMediaReady() {
    if (this.phase !== "intro" || this.mediaReady) return;

    this.mediaReady = true;

    const elapsed = Date.now() - this.phaseStartedAt;
    const minIntroMs = 800;
    const token = this.phaseToken;

    clearTimeout(this.phaseTimer);

    if (elapsed >= minIntroMs) {
      if (token === this.phaseToken) {
        this.enterPlaying();
      }

      return;
    }

    this.phaseTimer = setTimeout(() => {
      if (token === this.phaseToken) {
        this.enterPlaying();
      }
    }, minIntroMs - elapsed);
  }

  castVote(playerId, guess) {
    if (this.phase !== "voting") return;
    if (guess !== "ai" && guess !== "real") return;

    const player = this.players.get(playerId);

    if (!player?.connected) return;

    const existing = this.votes.get(playerId);

    if (existing && !this.config.allowVoteChange) return;

    this.votes.set(playerId, {
      guess,
      atMs: Date.now(),
    });

    this.broadcast();
  }

  buildLeaderboard() {
    const oldInfo = new Map(
      this.leaderboard.map((entry) => [
        entry.id,
        {
          rank: entry.rank,
          score: entry.score,
        },
      ]),
    );

    return [...this.players.values()]
      .sort(comparePlayers)
      .map((player, index) => {
        const rank = index + 1;

        const prev = oldInfo.get(player.id) ?? null;

        const prevRank = prev?.rank ?? null;
        const prevScore = prev?.score ?? 0;

        return {
          id: player.id,
          name: player.name,
          avatar: player.avatar,
          score: player.score,
          correct: player.correct,
          connected: player.connected,
          isHost: player.id === this.hostId,

          rank,
          prevRank,
          prevScore,

          pointsEarned: Math.max(0, player.score - prevScore),
          delta: prevRank === null ? 0 : prevRank - rank,
        };
      });
  }

  setPhase(phase, durationMs) {
    this.phase = phase;
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = durationMs ? this.phaseStartedAt + durationMs : null;

    const token = ++this.phaseToken;

    clearTimeout(this.phaseTimer);

    if (durationMs) {
      this.phaseTimer = setTimeout(() => {
        if (token === this.phaseToken) {
          this.advance();
        }
      }, durationMs);
    }

    this.broadcast();
  }

  sendWelcome(ws, player) {
    this.send(ws, {
      t: "welcome",
      you: publicPlayer(player, this.hostId),
      state: this.stateForPlayer(player),
    });
  }

  broadcast() {
    for (const ws of this.screens) {
      this.send(ws, {
        t: "state",
        state: this.stateForScreen(),
      });
    }

    for (const player of this.players.values()) {
      if (player.socket && player.connected) {
        this.send(player.socket, {
          t: "state",
          state: this.stateForPlayer(player),
        });
      }
    }
  }

  send(ws, payload) {
    if (ws.readyState !== 1) return;

    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // Ignore send errors.
    }
  }

  stateCommon() {
    return {
      phase: this.phase,
      roundNumber: this.roundNumber,
      totalRounds: this.config.rounds,
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt,
      serverNow: Date.now(),

      settings: {
        speedBonus: this.settings.speedBonus,
        revealSuspenseMs: this.settings.revealSuspenseMs,
      },

      cue: this.cue,

      lobby: {
        hostId: this.hostId,
        canStart: this.canStart(),
        warnings: this.warnings,
        selectedPackId: this.selectedPackId,
        packs: this.packs.map(packSummary),
        players: [...this.players.values()]
          .sort((a, b) => a.joinedAt - b.joinedAt)
          .map((player) => publicPlayer(player, this.hostId)),
      },
    };
  }

  stateForScreen() {
    const state = this.stateCommon();
    const game = {};

    const clip = this.currentClip();

    if (this.phase === "intro" || this.phase === "playing") {
      if (clip) {
        game.videoUrl = `/media/${clip.id}`;
      }
    }

    if (this.phase === "leaderboard") {
      const nextClip = this.clips[this.roundNumber];

      if (nextClip) {
        game.preloadNextUrl = `/media/${nextClip.id}`;
      }
    }

    if (this.phase === "voting") {
      game.votedCount = this.votes.size;
      game.totalVoters = this.players.size;
    }

    if (this.phase === "reveal") {
      game.result = this.lastResult;
      game.roundResults = this.roundResults;
    }

    if (this.phase === "leaderboard") {
      game.result = this.lastResult;
      game.roundResults = this.roundResults;
      game.leaderboard = this.leaderboard;
    }

    if (this.phase === "final") {
      game.leaderboard = this.leaderboard;
      game.winners = this.winners;
    }

    state.game = game;

    return state;
  }

  stateForPlayer(player) {
    const state = this.stateCommon();
    const game = {};

    if (
      this.phase === "rules" ||
      this.phase === "intro" ||
      this.phase === "playing"
    ) {
      game.watch = true;
    }

    if (this.phase === "voting") {
      game.votedCount = this.votes.size;
      game.totalVoters = this.players.size;
      game.yourVote = this.votes.get(player.id)?.guess ?? null;
    }

    if (this.phase === "reveal") {
      game.result = this.lastResult;
      game.roundResults = this.roundResults;
      game.yourVote = this.votes.get(player.id)?.guess ?? null;
    }

    if (this.phase === "leaderboard") {
      game.result = this.lastResult;
      game.roundResults = this.roundResults;
      game.leaderboard = this.leaderboard;
    }

    if (this.phase === "final") {
      game.leaderboard = this.leaderboard;
      game.winners = this.winners;
    }

    state.game = game;
    state.you = publicPlayer(player, this.hostId);

    return state;
  }
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw.toString());
  } catch {
    return null;
  }
}

function publicPlayer(player, hostId) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    score: player.score,
    correct: player.correct,
    connected: player.connected,
    isHost: player.id === hostId,
  };
}

function packSummary(pack) {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    accent: pack.accent,
    logo: pack.logo,
    clipCount: pack.clipCount,
    aiCount: pack.aiCount,
    realCount: pack.realCount,
  };
}
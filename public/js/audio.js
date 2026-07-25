const MUSIC_SOURCES = {
  lobby: [
    "/assets/music/lobby.mp3",
    "/assets/music/lobby.ogg",
    "/assets/music/lobby.wav",
  ],

  leaderboard: [
    "/assets/music/leaderboard.mp3",
    "/assets/music/leaderboard.ogg",
    "/assets/music/leaderboard.wav",
  ],

  final: [
    "/assets/music/final.mp3",
    "/assets/music/final.ogg",
    "/assets/music/final.wav",
  ],

  countdown: [
    "/assets/music/countdown.mp3",
    "/assets/music/countdown.ogg",
    "/assets/music/countdown.wav",
  ],
};

const ANNOUNCEMENT_SOURCES = {
  rules: [
    "/assets/rules/rules-01.mp3",
    "/assets/rules/rules-01.ogg",
    "/assets/rules/rules-01.wav",
  ],
};

const ANNOUNCEMENT_VOLUMES = {
  rules: 0.95,
};

const MUSIC_VOLUMES = {
  lobby: 0.32,
  leaderboard: 0.32,
  final: 0.32,
  countdown: 0.22,
};

const AI_STAMP_SFX = Array.from(
  { length: 5 },
  (_, i) => `/assets/sfx/ai-reveal-soundeffect-0${i + 1}.mp3`,
);

const REAL_STAMP_SFX = Array.from(
  { length: 5 },
  (_, i) => `/assets/sfx/real-reveal-soundeffect-0${i + 1}.mp3`,
);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;

    this.voice = null;

    this.announcement = null;
    this.announcementName = null;

    this.music = null;
    this.musicName = null;
    this.musicBaseVolume = 0.32;
    this.musicDuckVolume = 0.1;

    this.muted = localStorage.getItem("icbina:mute") === "1";
  }

  async unlock() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();

      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.7;
      this.master.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;

    localStorage.setItem("icbina:mute", this.muted ? "1" : "0");

    if (this.master) {
      this.master.gain.value = this.muted ? 0 : 0.7;
    }

    this.updateMusicVolume();
    this.updateAnnouncementVolume();

    if (this.voice) {
      this.voice.volume = this.muted ? 0 : 0.95;
    }
  }

  updateMusicVolume() {
    if (!this.music) return;

    const baseVolume = Number(
      this.music.dataset.baseVolume ?? this.musicBaseVolume,
    );

    this.music.volume = this.muted ? 0 : baseVolume;
  }

  stopVoice(fade = 0.08) {
    if (!this.voice) return;

    const audio = this.voice;

    this.voice = null;

    audio.onended = null;
    audio.onerror = null;

    if (fade > 0 && !this.muted) {
      const startVolume = audio.volume;
      const startTime = performance.now();

      const tick = () => {
        const t = (performance.now() - startTime) / (fade * 1000);

        audio.volume = Math.max(0, startVolume * (1 - t));

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          audio.pause();
        }
      };

      requestAnimationFrame(tick);
    } else {
      audio.pause();
    }

    this.restoreMusic();
  }

  playAnnouncement(name) {
    if (this.announcementName === name && this.announcement) return;

    this.stopAnnouncement(0.2);

    const urls = ANNOUNCEMENT_SOURCES[name];

    if (!urls || urls.length === 0) return;

    const audio = new Audio();

    const baseVolume = ANNOUNCEMENT_VOLUMES[name] ?? 0.95;

    audio.volume = this.muted ? 0 : baseVolume;
    audio.dataset.baseVolume = String(baseVolume);

    this.announcementName = name;
    this.announcement = audio;

    let index = 0;

    const tryNext = () => {
      if (this.announcement !== audio) return;

      if (index >= urls.length) return;

      audio.src = urls[index];
      index += 1;

      audio.load();

      audio.play().catch(() => {
        tryNext();
      });
    };

    audio.onerror = () => {
      tryNext();
    };

    tryNext();
  }

  stopAnnouncement(fade = 0.3) {
    const audio = this.announcement;

    this.announcement = null;
    this.announcementName = null;

    if (!audio) return;

    if (fade > 0 && !this.muted) {
      const startVolume = audio.volume;
      const startTime = performance.now();

      const tick = () => {
        const t = (performance.now() - startTime) / (fade * 1000);

        audio.volume = Math.max(0, startVolume * (1 - t));

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          audio.pause();
        }
      };

      requestAnimationFrame(tick);
    } else {
      audio.pause();
    }
  }

  updateAnnouncementVolume() {
    if (!this.announcement) return;

    const baseVolume = Number(
      this.announcement.dataset.baseVolume ?? 0.95,
    );

    this.announcement.volume = this.muted ? 0 : baseVolume;
  }

  playMusic(name) {
    if (this.musicName === name && this.music) return;

    this.stopMusic(0.25);

    const urls = MUSIC_SOURCES[name];

    if (!urls) return;

    const audio = new Audio();

    const baseVolume = MUSIC_VOLUMES[name] ?? this.musicBaseVolume;

    audio.loop = true;
    audio.volume = this.muted ? 0 : baseVolume;
    audio.dataset.baseVolume = String(baseVolume);

    this.musicName = name;
    this.music = audio;

    let index = 0;

    const tryNext = () => {
      if (this.music !== audio) return;

      if (index >= urls.length) return;

      audio.src = urls[index];
      index += 1;

      audio.load();

      audio.play().catch(() => {
        // Try next source on failure.
      });
    };

    audio.onerror = tryNext;

    tryNext();
  }

  stopMusic(fade = 0.35) {
    const audio = this.music;

    this.music = null;
    this.musicName = null;

    if (!audio) return;

    if (fade > 0 && !this.muted) {
      const startVolume = audio.volume;
      const startTime = performance.now();

      const tick = () => {
        const t = (performance.now() - startTime) / (fade * 1000);

        audio.volume = Math.max(0, startVolume * (1 - t));

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          audio.pause();
        }
      };

      requestAnimationFrame(tick);
    } else {
      audio.pause();
    }
  }

  duckMusic() {
    if (!this.music) return;

    const baseVolume = Number(
      this.music.dataset.baseVolume ?? this.musicBaseVolume,
    );

    this.music.volume = this.muted
      ? 0
      : Math.min(baseVolume * 0.35, this.musicDuckVolume);
  }

  restoreMusic() {
    this.updateMusicVolume();
  }

  playVoice(src) {
    if (this.muted || !src) return;

    if (this.voice) {
      this.voice.pause();
    }

    const audio = new Audio(src);

    audio.volume = 0.95;

    audio.onended = () => {
      this.restoreMusic();
    };

    audio.onerror = () => {
      this.restoreMusic();
    };

    this.voice = audio;

    this.duckMusic();

    audio.play().catch(() => {
      this.restoreMusic();
    });
  }

  playSfx(name) {
    if (this.muted) return;

    if (name === "stamp-ai") {
      this.playSfxFile(AI_STAMP_SFX, 0.95);
      return;
    }

    if (name === "stamp-real") {
      this.playSfxFile(REAL_STAMP_SFX, 0.95);
      return;
    }

    if (!this.ctx) return;

    switch (name) {
      case "ui-hover":
        this.tone({ freq: 520, duration: 0.03, type: "triangle", gain: 0.04 });
        break;

      case "ui-press":
        this.tone({ freq: 320, duration: 0.05, type: "square", gain: 0.08 });
        break;

      case "join":
        this.tone({ freq: 440, duration: 0.08, type: "triangle", gain: 0.1 });
        this.tone({ freq: 660, duration: 0.1, type: "triangle", gain: 0.08, when: 0.07 });
        break;

      case "start":
        this.noise({ duration: 0.18, gain: 0.12 });
        this.tone({ freq: 220, slideTo: 660, duration: 0.22, type: "sawtooth", gain: 0.1 });
        break;

      case "round-card":
        this.tone({ freq: 200, duration: 0.12, type: "square", gain: 0.1 });
        break;

      case "glitch":
        this.noise({ duration: 0.16, gain: 0.16 });
        break;

      case "vote-open":
        this.tone({ freq: 392, duration: 0.07, type: "triangle", gain: 0.1 });
        this.tone({ freq: 523, duration: 0.09, type: "triangle", gain: 0.08, when: 0.06 });
        break;

      case "vote-select":
        this.tone({ freq: 600, duration: 0.05, type: "square", gain: 0.09 });
        break;

      case "vote-lock":
        this.tone({ freq: 240, duration: 0.12, type: "square", gain: 0.12 });
        break;

      case "tick-normal":
        this.tone({ freq: 800, duration: 0.03, type: "square", gain: 0.06 });
        break;

      case "tick-critical":
        this.tone({ freq: 1050, duration: 0.05, type: "square", gain: 0.12 });
        break;

      case "suspense":
        this.tone({
          freq: 110,
          slideTo: 420,
          duration: 0.9,
          type: "sawtooth",
          gain: 0.1,
        });
        break;

      case "correct":
        this.tone({ freq: 660, duration: 0.08, type: "triangle", gain: 0.12 });
        this.tone({ freq: 880, duration: 0.12, type: "triangle", gain: 0.1, when: 0.07 });
        break;

      case "wrong":
        this.tone({ freq: 170, duration: 0.24, type: "sawtooth", gain: 0.12 });
        break;

      case "leaderboard-rise":
        this.tone({ freq: 330, duration: 0.07, type: "triangle", gain: 0.09 });
        this.tone({ freq: 440, duration: 0.07, type: "triangle", gain: 0.09, when: 0.07 });
        this.tone({ freq: 550, duration: 0.1, type: "triangle", gain: 0.09, when: 0.14 });
        break;

      case "winner":
        this.tone({ freq: 523, duration: 0.12, type: "triangle", gain: 0.12 });
        this.tone({ freq: 659, duration: 0.12, type: "triangle", gain: 0.12, when: 0.12 });
        this.tone({ freq: 784, duration: 0.14, type: "triangle", gain: 0.12, when: 0.24 });
        this.tone({ freq: 1046, duration: 0.24, type: "triangle", gain: 0.12, when: 0.38 });
        break;

      default:
        break;
    }
  }

  playSfxFile(urls, volume = 0.9) {
    if (this.muted || !Array.isArray(urls) || urls.length === 0) return;

    const startIndex = Math.floor(Math.random() * urls.length);

    let attempts = 0;

    const tryIndex = (index) => {
      const audio = new Audio(urls[index]);

      audio.volume = volume;

      const fail = () => {
        attempts += 1;

        if (attempts < urls.length) {
          tryIndex((index + 1) % urls.length);
        }
      };

      audio.onerror = fail;

      audio.play().catch(fail);
    };

    tryIndex(startIndex);
  }

  tone({ freq = 440, slideTo = null, duration = 0.1, type = "sine", gain = 0.1, when = 0 }) {
    const osc = this.ctx.createOscillator();
    const envelope = this.ctx.createGain();

    const startAt = this.ctx.currentTime + when;
    const endAt = startAt + duration;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    if (slideTo) {
      osc.frequency.linearRampToValueAtTime(slideTo, endAt);
    }

    envelope.gain.setValueAtTime(0.0001, startAt);
    envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

    osc.connect(envelope);
    envelope.connect(this.master);

    osc.start(startAt);
    osc.stop(endAt + 0.03);
  }

  noise({ duration = 0.2, gain = 0.1, when = 0 }) {
    const buffer = this.ctx.createBuffer(
      1,
      this.ctx.sampleRate * duration,
      this.ctx.sampleRate,
    );

    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    const envelope = this.ctx.createGain();

    const startAt = this.ctx.currentTime + when;
    const endAt = startAt + duration;

    source.buffer = buffer;

    envelope.gain.setValueAtTime(gain, startAt);
    envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

    source.connect(envelope);
    envelope.connect(this.master);

    source.start(startAt);
    source.stop(endAt + 0.02);
  }
}
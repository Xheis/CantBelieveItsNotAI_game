const VOICE_LINES = [
  {
    id: "lobby-01",
    category: "lobby",
    line: "Welcome to the uncanny valley. You better watch your step!",
  },
  {
    id: "lobby-02",
    category: "lobby",
    line: "Real people. Fake physics. Seven seconds to figure it out.",
  },
  {
    id: "lobby-03",
    category: "lobby",
    line: "Tonight’s forecast: one hundred percent chance of doubt.",
  },

  {
    id: "lobby-04",
    category: "lobby",
    line: "You’re going to LOVE these videos, but you won’t BELIEVE Video 3!!",
  },
  {
    id: "lobby-05",
    category: "lobby",
    line: "That’s it, collect all your most gullible friends. Take your time.",
  },
  {
    id: "lobby-06",
    category: "lobby",
    line: "Oh, take your time. Don’t mind me — it’s not like I have better things to do.",
  },
  {
    id: "lobby-07",
    category: "lobby",
    line: "Scientists hate this one simple trick: watching videos.",
  },
  // {
  //   id: "lobby-08",
  //   category: "lobby",
  //   line: "If you can beat this game, you are legally required to brag about it.",
  // },
  // {
  //   id: "lobby-09",
  //   category: "lobby",
  //   line: "Welcome back to the channel nobody asked for.",
  // },
  // {
  //   id: "lobby-10",
  //   category: "lobby",
  //   line: "Today’s challenge: trust your eyes, or trust your trauma.",
  // },
  // {
  //   id: "lobby-11",
  //   category: "lobby",
  //   line: "I’d explain the rules, but the comments section would just correct me anyway.",
  // },
  // {
  //   id: "lobby-12",
  //   category: "lobby",
  //   line: "This game is ten percent skill, ninety percent pretending you knew it all along.",
  // },
  // {
  //   id: "lobby-13",
  //   category: "lobby",
  //   line: "Smash that join button. Or don’t. I’m a voice, not a cop.",
  // },
  // {
  //   id: "lobby-14",
  //   category: "lobby",
  //   line: "These videos are so real, some of them are fake.",
  // },
  // {
  //   id: "lobby-15",
  //   category: "lobby",
  //   line: "You may want to lower your expectations. Then lower them again.",
  // },
  // {
  //   id: "lobby-16",
  //   category: "lobby",
  //   line: "If you lose, remember: confidence is free.",
  // },
  // {
  //   id: "lobby-17",
  //   category: "lobby",
  //   line: "We checked the source. The source shrugged.",
  // },
  // {
  //   id: "lobby-18",
  //   category: "lobby",
  //   line: "Warning: side effects include smugness, denial, and sudden expertise.",
  // },


  {
    id: "rules-01",
    category: "rules",
    line: "Okay, you know the rules.... Ohh you don't??? Well! The aim of the game is to win the most POINTS. HOW I hear you ask?  Well... each round you'll be shown 7 seconds of a video... and YOU! will have to decide if you saw a REAL video, or an AI FAKERY. [pause 0.55s] I can already hear your embarrassing thoughts like :  [pause 0.25s] \"WAIT a minute - was that REAL, or AI ?\" or.... [pause 0.25s] \"Can Gorilla's reeaally do THAT??\" You'll have 10 rounds. Sooo earn those points!, and humiliate your gullible friends!",
  },
  {
    id: "intro-01",
    category: "intro",
    line: "Eyes on the screen. Suspicion on.",
  },
  {
    id: "intro-02",
    category: "intro",
    line: "If you blink, you deserve what happens next.",
  },
  {
    id: "intro-03",
    category: "intro",
    line: "Is it human? Is it GPU? Let’s find out.",
  },
  {
    id: "intro-04",
    category: "intro",
    line: "Seven seconds. No excuses.",
  },

  {
    id: "voting-01",
    category: "voting",
    line: "Lock in your answer before your brain is tricked into changing it.",
  },
  {
    id: "voting-02",
    category: "voting",
    line: "Vote now, regret later.",
  },
  {
    id: "voting-03",
    category: "voting",
    line: "AI doesn’t sweat, but you should.",
  },
  {
    id: "voting-04",
    category: "voting",
    line: "Choose your embarrassment.",
  },
  {
    id: "voting-05",
    category: "voting",
    line: "Oh dear.. Did you NEED me to play it again to be sure?",
  },
  {
    id: "reveal-ai-01",
    category: "reveal_ai",
    line: "It was AI. The robots are getting cheeky.",
  },
  {
    id: "reveal-ai-02",
    category: "reveal_ai",
    line: "AI. Somewhere, a graphics card is smirking at you...",
  },
  {
    id: "reveal-ai-03",
    category: "reveal_ai",
    line: "AI made that, and honestly? I'm not impressed.",
  },
  {
    id: "reveal-ai-04",
    category: "reveal_ai",
    line: "If you thought that was real, I have a bridge to sell you.",
  },

  {
    id: "reveal-real-01",
    category: "reveal_real",
    line: "It was real. Nature remains undefeated.",
  },
  {
    id: "reveal-real-02",
    category: "reveal_real",
    line: "Real. Absolutely unhinged, but real.",
  },
  {
    id: "reveal-real-03",
    category: "reveal_real",
    line: "That was real? I need a minute.",
  },
  {
    id: "reveal-real-04",
    category: "reveal_real",
    line: "No AI here. Just real..ly disappointing",
  },

  {
    id: "result-mixed-01",
    category: "result_mixed",
    line: "Half of you are geniuses. The other half? Future content.",
  },
  {
    id: "result-mixed-02",
    category: "result_mixed",
    line: "Some of you saw that. The rest were vibes.",
  },
  {
    id: "result-mixed-03",
    category: "result_mixed",
    line: "We have believers, skeptics, and casualties.",
  },

  {
    id: "leaderboard-01",
    category: "leaderboard",
    line: "How did some of you manage to turn on your phone this morning?",
  },
  {
    id: "leaderboard-02",
    category: "leaderboard",
    line: "The leaderboard is looking spicy.",
  },
  {
    id: "leaderboard-03",
    category: "leaderboard",
    line: "Rankings updated. Friendships downgraded.",
  },

  {
    id: "final-01",
    category: "final",
    line: "We have a champion. Act surprised.",
  },
  {
    id: "final-02",
    category: "final",
    line: "And that, folks, is why we can’t trust our eyes.",
  },
  {
    id: "final-03",
    category: "final",
    line: "The crown has been awarded. But some of you look traumatised.",
  },

  {
    id: "restart-01",
    category: "restart",
    line: "Back to the lobby. Your judgment remains on trial.",
  },
];

const lastByCategory = new Map();

export function makeCue(category, { probability = 1 } = {}) {
  if (Math.random() > probability) return null;

  const lines = VOICE_LINES.filter((line) => line.category === category);

  if (lines.length === 0) return null;

  let candidates = lines.filter(
    (line) => line.id !== lastByCategory.get(category),
  );

  if (candidates.length === 0) {
    candidates = lines;
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];

  lastByCategory.set(category, chosen.id);

  return {
    id: chosen.id,
    category: chosen.category,
    subtitle: chosen.line,
    src: `/assets/voice/${chosen.id}.wav`,
  };
}
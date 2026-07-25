import test from "node:test";
import assert from "node:assert/strict";

import { scoreVote, comparePlayers } from "../lib/scoring.js";

const config = {
  voteMs: 7000,
  correctPoints: 1000,
  maxSpeedBonus: 500,
};

test("incorrect vote scores zero", () => {
  const result = scoreVote({
    correct: false,
    voteMs: 1000,
    votingStartMs: 0,
    settings: { speedBonus: false },
    config,
  });

  assert.equal(result.points, 0);
});

test("correct vote without speed bonus scores base points", () => {
  const result = scoreVote({
    correct: true,
    voteMs: 1000,
    votingStartMs: 0,
    settings: { speedBonus: false },
    config,
  });

  assert.equal(result.points, 1000);
  assert.equal(result.bonus, 0);
});

test("faster vote gets higher speed bonus when enabled", () => {
  const fast = scoreVote({
    correct: true,
    voteMs: 700,
    votingStartMs: 0,
    settings: { speedBonus: true },
    config,
  });

  const slow = scoreVote({
    correct: true,
    voteMs: 6300,
    votingStartMs: 0,
    settings: { speedBonus: true },
    config,
  });

  assert.ok(fast.points > slow.points);
});

test("comparePlayers sorts by score, correct, then time", () => {
  const players = [
    { score: 1000, correct: 1, tieTimeMs: 5000 },
    { score: 2000, correct: 2, tieTimeMs: 9000 },
    { score: 2000, correct: 2, tieTimeMs: 3000 },
  ];

  const sorted = players.sort(comparePlayers);

  assert.equal(sorted[0].tieTimeMs, 3000);
  assert.equal(sorted[1].tieTimeMs, 9000);
  assert.equal(sorted[2].score, 1000);
});
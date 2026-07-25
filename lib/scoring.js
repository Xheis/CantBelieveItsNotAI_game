export function scoreVote({
  correct,
  voteMs,
  votingStartMs,
  settings,
  config,
}) {
  if (!correct) {
    return {
      points: 0,
      bonus: 0,
      elapsed: 0,
    };
  }

  const elapsed = Math.min(
    Math.max((voteMs ?? votingStartMs) - votingStartMs, 0),
    config.voteMs,
  );

  if (!settings.speedBonus) {
    return {
      points: config.correctPoints,
      bonus: 0,
      elapsed,
    };
  }

  const bonus = Math.round(
    (1 - elapsed / config.voteMs) * config.maxSpeedBonus,
  );

  return {
    points: config.correctPoints + bonus,
    bonus,
    elapsed,
  };
}

export function comparePlayers(a, b) {
  return (
    b.score - a.score ||
    b.correct - a.correct ||
    a.tieTimeMs - b.tieTimeMs
  );
}
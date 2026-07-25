export const CONFIG = {
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  publicUrl: process.env.PUBLIC_URL ?? "",
  serviceName: process.env.SERVICE_NAME ?? "ICBINA",

  rounds: 10,

  rulesMs: 3500,
  introMs: 2200,
  playMs: 7000,
  voteMs: 7000,
  revealMs: 5000,
  revealSuspenseMs: 1200,
  leaderboardMs: 5000,


  minPlayers: 2,
  maxPlayers: 20,

  correctPoints: 1000,
  speedBonusDefault: false,
  maxSpeedBonus: 500,

  allowVoteChange: true,

  balanceSelection: true,
  minPerType: 3,

  avatarMaxDataUrlLength: 200_000,
  avatarMaxBytes: 150_000,

  videoExtensions: [".mp4", ".webm", ".m4v", ".mov"],

  mdns: true,
};
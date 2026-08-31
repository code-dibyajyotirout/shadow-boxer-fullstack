import { router, publicProcedure } from "../trpc";

export const leaderboardRouter = router({
  getTopLeaderboard: publicProcedure.query(async () => {
    return [
      { rank: 1, username: "IronMike_Prime", mode: "power", highScore: 14850, maxCombo: 28, peakVelocity: 5.8, punchesThrown: 240 },
      { rank: 2, username: "SpeedBlitz_99", mode: "cardio", highScore: 13920, maxCombo: 34, peakVelocity: 5.4, punchesThrown: 310 },
      { rank: 3, username: "MatrixSlip_Ghost", mode: "defense", highScore: 12400, maxCombo: 22, peakVelocity: 4.9, punchesThrown: 185 },
      { rank: 4, username: "CyberPuncher_X", mode: "all", highScore: 11800, maxCombo: 19, peakVelocity: 5.1, punchesThrown: 195 },
      { rank: 5, username: "NeonSlugger", mode: "all", highScore: 10500, maxCombo: 16, peakVelocity: 4.7, punchesThrown: 160 },
    ];
  }),
});

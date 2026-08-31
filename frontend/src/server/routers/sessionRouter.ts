import { router, publicProcedure } from "../trpc";
import { RECRUITER_PRESETS } from "../../lib/dummyData";

export const sessionRouter = router({
  getRecentSessions: publicProcedure.query(async () => {
    return [
      {
        id: "session_001",
        userId: "iron_mike",
        username: "IronMike_Prime",
        routineName: "Heavy Hitter",
        startTime: new Date().toISOString(),
        durationSeconds: 900,
        totalPunches: 310,
        peakVelocity: 5.84,
        avgVelocity: 4.25,
        peakAcceleration: 48.2,
        avgPower: 92.5,
        caloriesBurned: 245.0,
        highestCombo: 28,
        accuracyScore: 96.5,
      },
      {
        id: "session_002",
        userId: "speed_blitz",
        username: "SpeedBlitz_99",
        routineName: "Cardio Blitz",
        startTime: new Date(Date.now() - 3600000).toISOString(),
        durationSeconds: 850,
        totalPunches: 450,
        peakVelocity: 5.42,
        avgVelocity: 3.95,
        peakAcceleration: 39.5,
        avgPower: 79.0,
        caloriesBurned: 310.0,
        highestCombo: 42,
        accuracyScore: 94.0,
      },
    ];
  }),

  getSessionAnalytics: publicProcedure.query(async () => {
    return {
      totalWorkouts: 48,
      totalPunchesAllTime: 12480,
      totalCaloriesBurned: 6850.5,
      careerPeakVelocity: 5.84,
      favoriteStrike: "HOOK",
      averageAccuracy: 94.5,
      presets: RECRUITER_PRESETS,
    };
  }),
});

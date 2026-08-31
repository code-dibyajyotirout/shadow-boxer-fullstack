import { router } from "../trpc";
import { sessionRouter } from "./sessionRouter";
import { leaderboardRouter } from "./leaderboardRouter";
import { physicsRouter } from "./physicsRouter";

export const appRouter = router({
  session: sessionRouter,
  leaderboard: leaderboardRouter,
  physics: physicsRouter,
});

export type AppRouter = typeof appRouter;

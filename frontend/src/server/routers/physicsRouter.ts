import { router, publicProcedure } from "../trpc";

export const physicsRouter = router({
  getFilterBenchmark: publicProcedure.query(async () => {
    return {
      samplesProcessed: 2000,
      benchmarkDurationMs: 1.15,
      throughputSamplesPerSec: 1739130,
      rawVariance: 0.04012,
      filteredVariance: 0.00784,
      jitterReductionPercentage: 80.5,
      latencyOverheadMs: 0.0006,
    };
  }),
});

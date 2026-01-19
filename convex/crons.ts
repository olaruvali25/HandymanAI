import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "grant_free_credits_no_plan",
  { hours: 1 },
  internal.credits.grantFreeCreditsForNoPlan,
);

export default crons;

import { getAuthUserId } from "@convex-dev/auth/server";

import { mutation, query } from "./_generated/server";

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      ...user,
      plan: user.plan ?? "none",
      isAdmin: user.isAdmin ?? false,
    };
  },
});

export const adminSetMyPlanToPro = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const adminEmail = (process.env.MY_ADMIN_EMAIL ?? "olaruvali25@gmail.com")
      .trim()
      .toLowerCase();
    const userEmail = (user.email ?? "").trim().toLowerCase();

    if (!userEmail || userEmail !== adminEmail) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(userId, { plan: "pro", isAdmin: true });
  },
});

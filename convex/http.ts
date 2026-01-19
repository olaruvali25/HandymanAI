import { httpRouter } from "convex/server";

import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }
    const body = await request.text();
    try {
      await ctx.runAction(internal.stripe.handleWebhook, {
        body,
        signature,
      });
      return new Response(null, { status: 200 });
    } catch {
      return new Response("Webhook handler failed", { status: 400 });
    }
  }),
});

export default http;

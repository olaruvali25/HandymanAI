import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import type { Value } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => {
        const email =
          typeof params.email === "string" ? params.email.trim().toLowerCase() : "";
        const name = typeof params.name === "string" ? params.name.trim() : undefined;
        return { email, name } as { email: string; name?: string } & Record<string, Value>;
      },
    }),
  ],
});

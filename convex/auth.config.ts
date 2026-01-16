import type { AuthConfig } from "convex/server";

const getDomain = () => {
  const domain = process.env.CONVEX_SITE_URL;
  if (!domain) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Missing CONVEX_SITE_URL in Convex environment. Auth providers will fail until it is set.",
      );
    }
    throw new Error("Missing CONVEX_SITE_URL in Convex environment.");
  }
  return domain;
};

export default {
  providers: [
    {
      get domain() {
        return getDomain();
      },
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

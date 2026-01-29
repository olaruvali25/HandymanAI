import type { AuthConfig } from "convex/server";

const getDomain = () => {
  const domain =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.CONVEX_SITE_URL;
  if (!domain) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "Missing SITE_URL/CONVEX_SITE_URL in Convex environment. Auth providers will fail until it is set.",
      );
    }
    throw new Error("Missing SITE_URL/CONVEX_SITE_URL in Convex environment.");
  }
  return domain.replace(/\/$/, "");
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

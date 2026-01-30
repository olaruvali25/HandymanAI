import type { AuthConfig } from "convex/server";

const PRODUCTION_DOMAIN = "https://fixlyapp.dev";

const getDomain = () => {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_DOMAIN;
  }

  let domain = process.env.CONVEX_SITE_URL;

  let isLocalhost = false;
  if (domain) {
    try {
      const host = new URL(domain).hostname;
      isLocalhost = /(localhost|127\.0\.0\.1)/i.test(host);
    } catch {
      // ignore parse errors; treat as non-localhost
      isLocalhost = false;
    }
  }

  if (!domain || isLocalhost) {
    const vercelHost = process.env.VERCEL_URL;
    if (vercelHost) {
      domain = vercelHost.startsWith("http")
        ? vercelHost
        : `https://${vercelHost}`;
    } else {
      domain = PRODUCTION_DOMAIN;
    }
  }

  if (domain && !domain.startsWith("http")) {
    domain = `https://${domain}`;
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

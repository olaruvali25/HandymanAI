import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isProtectedRoute = createRouteMatcher(["/tasks(.*)"]);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    if (isProtectedRoute(request)) {
      const url = request.nextUrl;
      // Let OAuth callback land and exchange the code for tokens on the client.
      if (url.searchParams.has("code")) {
        return;
      }
      if (!(await convexAuth.isAuthenticated())) {
        return nextjsMiddlewareRedirect(request, "/login");
      }
    }
  },
  {
    // Avoid proxying /api/auth so the local route handler can return the OAuth verifier.
    apiRoute: "/api/auth-proxy",
    // Don't strip ?code=... from auth endpoints; /api/auth/signin/* needs it.
    shouldHandleCode: (request) => {
      const pathname = request.nextUrl.pathname;
      return !pathname.startsWith("/api/auth");
    },
  },
);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

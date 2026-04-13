export { default } from "next-auth/middleware";

// Protect ALL routes except:
// - /login (the login page itself)
// - /api/auth/* (NextAuth endpoints — needed for OAuth flow)
// - /_next/* (Next.js internals)
// - /favicon.ico, /manifest.json (static assets)
// - Public HTML files that may be shared externally (media-kit, sponsor-onboarding, grant-pitch)
export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon\\.ico|manifest\\.json|media-kit\\.html|sponsor-onboarding\\.html|grant-pitch\\.html).*)",
  ],
};

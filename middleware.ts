export { default } from "next-auth/middleware";

// Protect page routes only — NOT API routes
// API routes handle their own auth (TERMINAL_PASSWORD, CRON_SECRET, session checks)
// Redirecting API calls to a login page doesn't make sense — they should return 401
export const config = {
  matcher: [
    "/((?!login|api|_next/static|_next/image|favicon\\.ico|manifest\\.json|media-kit\\.html|sponsor-onboarding\\.html|grant-pitch\\.html).*)",
  ],
};

import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      // Separate credentials from YouTube OAuth (GOOGLE_CLIENT_ID/SECRET)
      // These are specifically for MasterHQ login
      clientId: process.env.MASTER_GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.MASTER_GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    signIn({ user }) {
      // Single-user whitelist — only Stuart can access MasterHQ
      const allowedEmail = process.env.ALLOWED_EMAIL;
      if (!allowedEmail) {
        // If ALLOWED_EMAIL not set, allow any Google login (fallback)
        console.warn("ALLOWED_EMAIL not set — allowing any Google login");
        return true;
      }
      // Case-insensitive email comparison
      if (user.email?.toLowerCase() === allowedEmail.toLowerCase()) {
        return true;
      }
      // Reject everyone else
      return false;
    },
    session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };

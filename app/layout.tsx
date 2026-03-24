import type { Metadata } from "next";
import "./globals.css";
import LayoutShell from "@/components/LayoutShell";

export const metadata: Metadata = {
  title: "TheMaster — Command & Control",
  description: "Unified platform for managing all projects, deployments, and growth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-base">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}

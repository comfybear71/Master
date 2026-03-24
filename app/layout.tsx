import type { Metadata } from "next";
import "./globals.css";

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
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}

function Sidebar() {
  const navItems = [
    { href: "/", label: "Dashboard", icon: "⬡" },
    { href: "/projects", label: "Projects", icon: "◈" },
    { href: "/monitoring", label: "Monitoring", icon: "◉" },
    { href: "/cicd", label: "CI/CD", icon: "⟐" },
    { href: "/growth", label: "Growth", icon: "△" },
  ];

  return (
    <nav className="w-56 bg-base-light border-r border-slate-800 flex flex-col p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-accent font-mono tracking-wider">
          TheMaster
        </h1>
        <p className="text-xs text-slate-500 mt-1">Command & Control</p>
      </div>
      <ul className="space-y-1 flex-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-accent hover:bg-base-card transition-colors"
            >
              <span className="text-accent">{item.icon}</span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <div className="text-xs text-slate-600 mt-4 font-mono">v1.0.0</div>
    </nav>
  );
}

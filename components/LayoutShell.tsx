"use client";

import { useState, useEffect } from "react";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (clicking a link)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("nav a")) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-base-light border-b border-slate-800 md:hidden">
        <h1 className="text-lg font-bold text-accent font-mono tracking-wider">
          TheMaster
        </h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-400 hover:text-accent transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`
          fixed top-0 left-0 z-40 h-full w-56 bg-base-light border-r border-slate-800 flex flex-col p-4
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:z-auto
        `}
      >
        <div className="mb-8 mt-12 md:mt-0">
          <h1 className="text-xl font-bold text-accent font-mono tracking-wider">
            TheMaster
          </h1>
          <p className="text-xs text-slate-500 mt-1">Command & Control</p>
        </div>
        <ul className="space-y-1 flex-1">
          {[
            { href: "/", label: "Dashboard", icon: "\u2B21" },
            { href: "/projects", label: "Projects", icon: "\u25C8" },
            { href: "/monitoring", label: "Monitoring", icon: "\u25C9" },
            { href: "/cicd", label: "CI/CD", icon: "\u27D0" },
            { href: "/growth", label: "Growth", icon: "\u25B3" },
            { href: "/docs", label: "Docs", icon: "\u25A1" },
            { href: "/media-kit", label: "Media Kit", icon: "\u2605" },
          ].map((item) => (
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

      {/* Main content - add top padding on mobile for the fixed header */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">{children}</main>
    </div>
  );
}

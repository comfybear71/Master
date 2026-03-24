"use client";

export default function GrowthPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-2">Growth Engine</h1>
      <p className="text-sm text-slate-500 mb-8">Social media management and campaign generation</p>

      <div className="bg-base-card rounded-xl border border-slate-800 p-12 text-center">
        <div className="text-4xl mb-4">△</div>
        <h2 className="text-lg text-white mb-2">Coming in Phase 3</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Social media dashboard, AI campaign generator, post scheduler, and viral trigger system.
          Platforms: X, YouTube, Facebook, Instagram, TikTok.
        </p>
        <div className="flex justify-center gap-6 mt-8 text-slate-600">
          <div className="text-center">
            <div className="text-2xl mb-1">𝕏</div>
            <div className="text-xs">X/Twitter</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">▶</div>
            <div className="text-xs">YouTube</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">f</div>
            <div className="text-xs">Facebook</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">◎</div>
            <div className="text-xs">Instagram</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">♪</div>
            <div className="text-xs">TikTok</div>
          </div>
        </div>
      </div>
    </div>
  );
}

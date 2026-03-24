"use client";

interface Commit {
  repo: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

export default function CommitFeed({ commits }: { commits: Commit[] }) {
  if (commits.length === 0) {
    return (
      <div className="text-slate-500 text-sm p-4">No recent commits found.</div>
    );
  }

  return (
    <div className="space-y-3">
      {commits.map((commit, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-base/50 hover:bg-base-card/50 transition-colors">
          <div className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
          <div className="min-w-0 flex-1">
            <a
              href={commit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white hover:text-accent transition-colors line-clamp-1"
            >
              {commit.message}
            </a>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="font-mono text-accent/70">{commit.repo.split("/")[1]}</span>
              <span>·</span>
              <span>{commit.author}</span>
              <span>·</span>
              <time>{new Date(commit.date).toLocaleDateString()}</time>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

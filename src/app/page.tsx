import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold text-emerald-400">GoLive</span>
        <div className="flex gap-4">
          <Link
            href="/deploy"
            className="text-slate-300 hover:text-white transition-colors"
          >
            Deploy
          </Link>
          <Link
            href="/deploy"
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          You built it with AI.
          <br />
          <span className="text-emerald-400">We make it live.</span>
        </h1>
        <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto">
          Built something in Cursor but stuck on deployment? Open your project
          folder, connect GitHub & Vercel once, and get a live URL in 60 seconds. No
          Git. No DevOps. No confusion.
        </p>
        <Link
          href="/deploy"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
        >
          Deploy Your App Free
        </Link>

        <div className="mt-24 grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="text-2xl mb-3">📤</div>
            <h3 className="font-semibold text-lg mb-2">Open Folder</h3>
            <p className="text-slate-400 text-sm">
              Select your project folder (like Cursor). We auto-detect Next.js, React,
              Vue, and more.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="text-2xl mb-3">🔗</div>
            <h3 className="font-semibold text-lg mb-2">Connect</h3>
            <p className="text-slate-400 text-sm">
              Sign in to GitHub and Vercel once. We handle repos, databases, and
              env vars.
            </p>
          </div>
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="font-semibold text-lg mb-2">Live</h3>
            <p className="text-slate-400 text-sm">
              Get your live URL instantly. Database + payment test keys included
              if needed.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

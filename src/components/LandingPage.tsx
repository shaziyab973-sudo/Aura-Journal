import React, { useState } from 'react';
import { 
  Sparkles, 
  Shield, 
  Lock, 
  BrainCircuit, 
  MessageSquareHeart, 
  Compass, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Feather, 
  HeartHandshake, 
  Database,
  Search,
  EyeOff,
  ListTodo,
  Activity,
  MapPin
} from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isLoading, error }) => {
  const [activeTab, setActiveTab] = useState<'reflect' | 'summarize' | 'privacy'>('reflect');

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/20 to-stone-100 text-stone-900 selection:bg-amber-200 selection:text-amber-950 font-sans">
      {/* Subtle Top Navigation */}
      <header className="sticky top-0 z-30 w-full border-b border-stone-200/60 bg-stone-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-700 via-amber-800 to-stone-900 text-stone-50 shadow-md">
              <Sparkles className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <span className="font-serif text-xl font-bold tracking-tight text-stone-900 block leading-tight">
                Aura Journal
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-stone-500">
                AI Reflection Companion
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <Lock className="h-3.5 w-3.5 text-emerald-700" />
              <span>Isolated Cloud Firestore</span>
            </div>

            <button
              id="landing-signin-top-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="flex items-center gap-2.5 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-50 shadow-md transition-all hover:bg-stone-800 hover:shadow-lg active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          {/* Subtle Tag pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/60 px-4 py-1.5 text-xs font-medium text-amber-900 shadow-2xs mb-6">
            <Feather className="h-3.5 w-3.5 text-amber-700" />
            <span>A Safe, Non-Judgmental Space for Your Thoughts</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-stone-900 leading-[1.15]">
            Reflect. Understand. Grow.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-stone-600 leading-relaxed">
            Write your private stream of consciousness. Have gentle, multi-turn reflective conversations with Gemini, uncover emotional clarity, and save your journey securely in Cloud Firestore.
          </p>

          {/* Primary CTA Button */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="hero-google-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="group flex w-full sm:w-auto items-center justify-center gap-3 rounded-2xl bg-stone-900 px-8 py-4 text-base font-semibold text-stone-50 shadow-xl shadow-stone-900/15 transition-all hover:bg-stone-800 hover:shadow-2xl hover:shadow-stone-900/25 active:scale-95 disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-200 border-t-transparent" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.25 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>Begin With Google</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {error && (
            <div className="mx-auto mt-4 max-w-md rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              100% Free & Private
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              No Passwords to Store
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Strict Firestore Rules
            </span>
          </div>

          {/* Interactive Live Preview Card */}
          <div className="mt-14 mx-auto max-w-3xl rounded-3xl border border-stone-200/80 bg-white/90 p-6 sm:p-8 shadow-2xl shadow-stone-200 text-left backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-400 inline-block" />
                <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
                <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block" />
                <span className="ml-3 font-serif text-sm font-semibold text-stone-800">
                  Daily Reflection Session
                </span>
              </div>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 border border-amber-200/60">
                Mood: Overwhelmed → Calm
              </span>
            </div>

            {/* Conversation Flow Demonstration */}
            <div className="space-y-4 text-sm">
              {/* User Entry */}
              <div className="flex gap-3 justify-end">
                <div className="max-w-md rounded-2xl bg-stone-900 px-4 py-3 text-stone-50 shadow-sm">
                  <p className="text-xs font-semibold text-amber-200 mb-1">You</p>
                  <p className="leading-relaxed">
                    I had a really difficult day at college today. I struggled during my presentation and felt like everyone noticed my voice shaking.
                  </p>
                </div>
              </div>

              {/* Gemini Empathetic Reflection */}
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 border border-amber-300 text-amber-900">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="max-w-lg rounded-2xl bg-stone-100/90 border border-stone-200/70 p-4 text-stone-800 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-stone-900">Aura (Gemini Reflection)</span>
                    <span className="text-[10px] text-stone-600">Thoughtful Inquiry</span>
                  </div>
                  <p className="leading-relaxed text-stone-700">
                    That makes complete sense. Speaking in front of peers can trigger intense vulnerability, and our minds often magnify every nervous tremor far more than anyone else hears.
                  </p>
                  <div className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/70 p-2.5 text-xs text-amber-950 font-medium">
                    🪞 <span className="underline decoration-amber-300">Reflection Question:</span> If a close friend walked off that stage feeling the same way, what gentle truth would you whisper to them?
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section className="border-t border-stone-200/70 bg-white/60 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-serif text-3xl font-bold tracking-tight text-stone-900">
              How Your AI Journal Works
            </h2>
            <p className="mt-3 text-stone-600">
              A seamless bridge between free-form writing, introspective questions, and lasting clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-3xl border border-stone-200/80 bg-white p-7 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 font-serif text-lg font-bold">
                1
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-stone-900">
                Write Freely
              </h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Log what happened, how you feel, goals, or worries. No formatting pressure, no rigid questions—just write whatever is on your mind.
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200/80 bg-white p-7 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 font-serif text-lg font-bold">
                2
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-stone-900">
                Reflect With Gemini
              </h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                Gemini listens with emotional intelligence, asks perceptive clarifying questions, brainstorms realistic approaches, and identifies patterns.
              </p>
            </div>

            <div className="rounded-3xl border border-stone-200/80 bg-white p-7 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200 font-serif text-lg font-bold">
                3
              </div>
              <h3 className="mt-5 font-serif text-lg font-semibold text-stone-900">
                Summarize & Organize
              </h3>
              <p className="mt-2 text-sm text-stone-600 leading-relaxed">
                One-click session summaries synthesize key takeaways, positive breakthroughs, and actionable next steps, all saved directly in Cloud Firestore.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              Thoughtful AI Features
            </span>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-stone-900">
              Designed For Mental Space & Growth
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Multi-Turn Conversation Context
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Gemini maintains continuous awareness of your current journal entry, allowing natural deep dialogue without having to repeat details.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
                <FileText className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Structured Session Summaries
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Automatically breaks reflections down into: Main Topic, Key Thoughts, Underlying Concerns, Positive Moments, and Next Steps.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
                <Compass className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Deep Socratic Reflection Prompts
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Instead of shallow cheerleading, receive warm, probing questions that help you understand your triggers, values, and inner resilience.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Supportive & Non-Medical Tone
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Carefully tuned to be an empathetic journaling companion. It never pretends to diagnose medical conditions or give clinical prescriptions.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Auto-Saved Cloud Firestore
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Every reflection, prompt, and summary persists in your personal subcollection in real-time. Never worry about lost browser tabs.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200/80 bg-white/80 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
                <Search className="h-5 w-5" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Journal History & Search
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Easily revisit previous sessions, search by keywords, filter by emotional mood, review past summaries, or continue conversations anytime.
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900 mb-4">
                <ListTodo className="h-5 w-5 text-indigo-700" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Action Item Extractor
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Automatically converts journal thoughts into prioritized action items, saved directly into your user-isolated tasks workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-900 mb-4">
                <Activity className="h-5 w-5 text-teal-700" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Sentiment Pulse & Telemetry
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Track emotional polarity scores (-1.0 to +1.0), energy levels, and cognitive trends across time with interactive visual charts.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 backdrop-blur-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 mb-4">
                <MapPin className="h-5 w-5 text-amber-700" />
              </div>
              <h4 className="font-serif text-base font-semibold text-stone-900">
                Location-Aware Tagging (Fuzzed)
              </h4>
              <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                Ground journal reflections in the place where they occurred. Backend-proxied Google Maps lookups with 2-decimal coordinate fuzzing ensure zero exact tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="border-t border-stone-200/80 bg-stone-900 text-stone-100 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-300 mb-6">
            <Shield className="h-4 w-4" />
            <span>Strict User Data Isolation & Zero-Knowledge Architecture</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Your Private Thoughts Stay Strictly Yours
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-stone-400 text-sm sm:text-base leading-relaxed">
            Journaling is personal. We treat your reflections with the highest security standards.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="rounded-2xl border border-stone-800 bg-stone-800/60 p-6">
              <Lock className="h-6 w-6 text-emerald-400 mb-3" />
              <h4 className="font-serif text-base font-semibold text-white">Firestore Security Rules</h4>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                Rules enforce that each request must be authenticated and that <code className="text-emerald-300">request.auth.uid == userId</code>. User A cannot read, query, or write User B's entries.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-800/60 p-6">
              <EyeOff className="h-6 w-6 text-amber-400 mb-3" />
              <h4 className="font-serif text-base font-semibold text-white">Server-Side Secret Isolation</h4>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                The Gemini API key is never exposed to browser bundles or network inspection. All AI requests are mediated via secure backend proxies.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-800 bg-stone-800/60 p-6">
              <CheckCircle2 className="h-6 w-6 text-sky-400 mb-3" />
              <h4 className="font-serif text-base font-semibold text-white">No Passwords Stored</h4>
              <p className="mt-2 text-xs text-stone-400 leading-relaxed">
                We outsource identity exclusively to Google Sign-In via Firebase Auth. No custom passwords are stored in databases.
              </p>
            </div>
          </div>

          {/* Bottom Sign In CTA */}
          <div className="mt-14">
            <button
              id="footer-google-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-amber-500 px-8 py-4 text-base font-semibold text-stone-950 shadow-xl shadow-amber-500/10 transition hover:bg-amber-400 active:scale-95 disabled:opacity-70 cursor-pointer"
            >
              <Sparkles className="h-5 w-5 text-stone-900" />
              <span>Sign In & Start Journaling Now</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-100 py-8 text-center text-xs text-stone-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} AuraJournal. Built with Gemini Flash & Cloud Firestore.</p>
          <p className="text-[11px] text-stone-500">
            For personal reflection only. Not intended as psychiatric or medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
};

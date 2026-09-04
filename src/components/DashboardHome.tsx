import React from 'react';
import { JournalSession, UserProfile } from '../types';
import { 
  Sparkles, 
  Plus, 
  BookOpen, 
  Calendar, 
  History, 
  ArrowRight, 
  ShieldCheck, 
  Smile, 
  Feather, 
  Compass, 
  Lightbulb, 
  Clock,
  ListTodo,
  Activity,
  MapPin
} from 'lucide-react';

interface DashboardHomeProps {
  user: UserProfile;
  sessions: JournalSession[];
  onNewJournal: () => void;
  onSelectSession: (sessionId: string) => void;
  onNavigate: (view: any) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  user,
  sessions,
  onNewJournal,
  onSelectSession,
  onNavigate,
}) => {
  // Determine time of day greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = (user.displayName || 'Friend').split(' ')[0];

  const totalMessages = sessions.reduce((acc, s) => acc + (s.messageCount || 0), 0);
  const recentSessions = sessions.slice(0, 4);

  // Daily dynamic prompts
  const dailyPrompts = [
    "What is one thought you've been carrying today that deserves gentle curiosity rather than judgment?",
    "If you paused all expectations for five minutes right now, what would your body and mind ask for?",
    "What was a subtle moment of beauty, kindness, or relief you experienced recently?",
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-stone-200/80 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 p-6 sm:p-10 text-stone-50 shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200 mb-4">
            <Feather className="h-3.5 w-3.5" />
            <span>Daily Reflection Journey</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            {timeGreeting}, {firstName}.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-stone-300 leading-relaxed">
            Take a breath. This is your private sanctuary to untangle complex feelings, celebrate small moments, and discover mindful clarity with Gemini.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              id="dash-start-journal-btn"
              onClick={onNewJournal}
              className="flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-3 text-sm font-semibold text-stone-950 shadow-md transition hover:bg-amber-400 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>+ Start Today's Journal</span>
            </button>

            <button
              onClick={() => onNavigate('history')}
              className="flex items-center gap-2 rounded-2xl border border-stone-600 bg-stone-800/80 px-5 py-3 text-sm font-medium text-stone-200 transition hover:bg-stone-700 hover:text-white"
            >
              <History className="h-4 w-4" />
              <span>Browse History</span>
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-amber-600/10 blur-3xl" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Journals</span>
            <BookOpen className="h-4 w-4 text-amber-700" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            {sessions.length}
          </p>
          <p className="mt-1 text-[11px] text-stone-500">
            Recorded in your private Firestore
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Reflections Logged</span>
            <Sparkles className="h-4 w-4 text-amber-700" />
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            {totalMessages}
          </p>
          <p className="mt-1 text-[11px] text-stone-500">
            Multi-turn dialogs and user entries
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Data Isolation</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="font-serif text-lg font-bold text-emerald-800 flex items-center gap-1.5 mt-1">
            <span>Owner-Only Rule</span>
          </p>
          <p className="mt-1 text-[11px] text-stone-500 truncate" title={user.uid}>
            UID: {user.uid.slice(0, 10)}...
          </p>
        </div>
      </div>

      {/* Growth Studio Modules Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          onClick={() => onNavigate('tasks')}
          className="group relative overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-white p-6 shadow-2xs transition hover:border-indigo-400 hover:shadow-md cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-2xs">
              <ListTodo className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800">
              AI Powered
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900 mt-4 group-hover:text-indigo-900 transition">
            Tasks Studio & Action Items
          </h3>
          <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
            Automatically extract actionable tasks and milestones from your journal reflections into a private, isolated task collection.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-700 group-hover:gap-2 transition-all">
            <span>Open Tasks Studio</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('analytics')}
          className="group relative overflow-hidden rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-white p-6 shadow-2xs transition hover:border-teal-400 hover:shadow-md cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 shadow-2xs">
              <Activity className="h-5 w-5" />
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">
              Telemetry
            </span>
          </div>
          <h3 className="font-serif text-lg font-bold text-stone-900 mt-4 group-hover:text-teal-900 transition">
            Sentiment Pulse & Analytics
          </h3>
          <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">
            Monitor emotional polarity arcs, energy curves, and cognitive patterns synthesized across all your journal sessions.
          </p>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:gap-2 transition-all">
            <span>Explore Telemetry</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Introspective Prompts of the Day */}
      <div className="rounded-3xl border border-stone-200/80 bg-stone-50/90 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-900 mb-2">
          <Compass className="h-4 w-4 text-amber-700" />
          <span>Need Inspiration? Today's Reflective Prompts</span>
        </div>
        <h3 className="font-serif text-xl font-bold text-stone-900 mb-4">
          Choose a seed to begin your journaling
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dailyPrompts.map((prompt, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-2xs transition hover:border-amber-300 hover:shadow-sm"
            >
              <p className="text-xs text-stone-700 leading-relaxed italic">
                "{prompt}"
              </p>
              <button
                onClick={onNewJournal}
                className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-900 hover:text-amber-950 self-start"
              >
                <span>Write about this</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl font-bold text-stone-900">
            Recent Journals
          </h3>
          {sessions.length > 4 && (
            <button
              onClick={() => onNavigate('history')}
              className="flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900"
            >
              <span>View all ({sessions.length})</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {recentSessions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className="group flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-2xs transition hover:border-stone-300 hover:shadow-md cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-stone-500 mb-2">
                    <span className="capitalize font-medium text-stone-700">
                      Mood: {session.mood || 'Reflective'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="font-serif text-base font-bold text-stone-900 group-hover:text-amber-900 transition line-clamp-1">
                    {session.title}
                  </h4>
                  <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {session.preview || 'Click to continue conversation...'}
                  </p>

                  {/* Feature Badges */}
                  {(session.location || session.sentiment) && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-1">
                      {session.location && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] text-stone-700 font-medium">
                          <MapPin className="h-3 w-3 text-amber-700" />
                          <span className="truncate max-w-[120px]">{session.location.placeName}</span>
                        </span>
                      )}
                      {session.sentiment && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 border border-teal-100 px-2 py-0.5 text-[10px] text-teal-800 font-medium">
                          <Activity className="h-3 w-3 text-teal-600" />
                          <span>{session.sentiment.primaryEmotion} ({session.sentiment.overallScore >= 0 ? `+${session.sentiment.overallScore.toFixed(2)}` : session.sentiment.overallScore.toFixed(2)})</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-[11px] text-stone-500">
                  <span>{session.messageCount || 0} reflections</span>
                  <span className="font-semibold text-stone-800 group-hover:underline flex items-center gap-1">
                    Continue <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
            <Feather className="mx-auto h-8 w-8 text-stone-400 mb-2" />
            <p className="text-sm font-semibold text-stone-800">Your journal is waiting</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Start your first session to capture your thoughts and have Gemini reflect with you.
            </p>
            <button
              onClick={onNewJournal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
            >
              <Plus className="h-3.5 w-3.5 text-amber-300" />
              <span>Create Journal</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

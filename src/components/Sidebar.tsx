import React from 'react';
import { ActiveView, JournalSession } from '../types';
import { 
  Plus, 
  Home, 
  History, 
  ShieldCheck, 
  BookHeart, 
  MessageSquare,
  Sparkles,
  ChevronRight,
  ListTodo,
  Activity
} from 'lucide-react';

interface SidebarProps {
  currentView: ActiveView;
  activeSessionId: string | null;
  recentSessions: JournalSession[];
  onNavigate: (view: ActiveView) => void;
  onNewJournal: () => void;
  onSelectSession: (sessionId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  activeSessionId,
  recentSessions,
  onNavigate,
  onNewJournal,
  onSelectSession,
}) => {
  return (
    <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-stone-200/80 bg-stone-50/50 p-4 shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none overflow-y-auto">
      <div className="space-y-6">
        {/* New Journal Primary CTA */}
        <button
          id="sidebar-new-journal-btn"
          onClick={onNewJournal}
          className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-stone-900 px-4 py-3.5 text-sm font-semibold text-stone-50 shadow-md shadow-stone-900/10 transition-all hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/15 active:scale-[0.98] cursor-pointer"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 transition group-hover:rotate-90">
            <Plus className="h-3.5 w-3.5" />
          </div>
          <span>Start New Journal</span>
        </button>

        {/* Main Navigation Links */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Navigation
          </p>
          <button
            id="sidebar-nav-home"
            onClick={() => onNavigate('dashboard')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-stone-200/80 text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Home className="h-4 w-4 text-stone-500" />
            <span>Dashboard</span>
          </button>

          <button
            id="sidebar-nav-tasks"
            onClick={() => onNavigate('tasks')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
              currentView === 'tasks'
                ? 'bg-indigo-100 text-indigo-950 shadow-2xs font-semibold'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <ListTodo className="h-4 w-4 text-indigo-600" />
            <div className="flex items-center justify-between w-full">
              <span>Tasks Studio</span>
              <span className="text-[10px] bg-indigo-200/60 text-indigo-800 px-1.5 py-0.5 rounded-full font-semibold">AI</span>
            </div>
          </button>

          <button
            id="sidebar-nav-analytics"
            onClick={() => onNavigate('analytics')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
              currentView === 'analytics'
                ? 'bg-teal-100 text-teal-950 shadow-2xs font-semibold'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Activity className="h-4 w-4 text-teal-600" />
            <div className="flex items-center justify-between w-full">
              <span>Sentiment Pulse</span>
              <span className="text-[10px] bg-teal-200/60 text-teal-800 px-1.5 py-0.5 rounded-full font-semibold">AI</span>
            </div>
          </button>

          <button
            id="sidebar-nav-history"
            onClick={() => onNavigate('history')}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
              currentView === 'history'
                ? 'bg-stone-200/80 text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <History className="h-4 w-4 text-stone-500" />
              <span>My Journal History</span>
            </div>
            {recentSessions.length > 0 && (
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                {recentSessions.length}
              </span>
            )}
          </button>

          <button
            id="sidebar-nav-security"
            onClick={() => onNavigate('security')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition cursor-pointer ${
              currentView === 'security'
                ? 'bg-stone-200/80 text-stone-900 shadow-2xs font-semibold'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Privacy & Rules</span>
          </button>
        </div>

        {/* Recent Reflections Subsection */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
              Recent Reflections
            </span>
            <button
              onClick={() => onNavigate('history')}
              className="text-[11px] text-amber-700 hover:text-amber-800 hover:underline"
            >
              View all
            </button>
          </div>

          <div className="space-y-1">
            {recentSessions.slice(0, 5).map((session) => {
              const isActive = currentView === 'journal-detail' && activeSessionId === session.id;
              return (
                <button
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${
                    isActive
                      ? 'bg-amber-100/70 text-amber-950 font-medium'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <MessageSquare className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-amber-700' : 'text-stone-400'}`} />
                    <span className="truncate">{session.title}</span>
                  </div>
                  <ChevronRight className="h-3 w-3 shrink-0 text-stone-400 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}

            {recentSessions.length === 0 && (
              <div className="rounded-xl border border-dashed border-stone-200 p-3 text-center">
                <BookHeart className="mx-auto h-5 w-5 text-stone-400" />
                <p className="mt-1 text-[11px] text-stone-500">
                  No journals yet. Start your first entry!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gentle Mindfulness Prompt at the Bottom */}
      <div className="rounded-2xl border border-amber-200/60 bg-amber-50/60 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span>Mindful Intention</span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-stone-600">
          "Writing is how we untangle the knots in our mind and invite inner calm."
        </p>
      </div>
    </aside>
  );
};

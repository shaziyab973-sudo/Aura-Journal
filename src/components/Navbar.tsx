import React from 'react';
import { UserProfile, ActiveView } from '../types';
import { 
  Sparkles, 
  LogOut, 
  Plus, 
  Menu, 
  X, 
  ShieldCheck, 
  BookOpen, 
  History, 
  Home, 
  Lock,
  ListTodo,
  Activity
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  currentView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onNewJournal: () => void;
  onLogout: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  currentView,
  onNavigate,
  onNewJournal,
  onLogout,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="group flex items-center gap-2.5 text-left focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 rounded-lg"
            id="nav-brand-btn"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-stone-800 text-stone-50 shadow-sm transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <span className="font-serif text-lg font-semibold tracking-tight text-stone-900 block leading-tight">
                Aura Journal
              </span>
              <span className="text-[11px] font-medium tracking-wide uppercase text-stone-600">
                AI Reflection Companion
              </span>
            </div>
          </button>
        </div>

        {/* Center / Desktop Action Pill & Navigation Links */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === 'dashboard' ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onNavigate('tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === 'tasks' ? 'bg-indigo-100 text-indigo-900' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListTodo className="h-3.5 w-3.5 text-indigo-600" />
            <span>Tasks Studio</span>
          </button>
          <button
            onClick={() => onNavigate('analytics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === 'analytics' ? 'bg-teal-100 text-teal-900' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Activity className="h-3.5 w-3.5 text-teal-600" />
            <span>Sentiment Pulse</span>
          </button>
          <button
            onClick={() => onNavigate('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              currentView === 'history' ? 'bg-stone-200 text-stone-900' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            History
          </button>
        </div>

        {/* Center / Desktop Action Pill */}
        <div className="hidden md:flex items-center gap-2">
          <button
            id="nav-new-journal-btn"
            onClick={onNewJournal}
            className="flex items-center gap-2 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 shadow-sm transition-all hover:bg-stone-800 hover:shadow active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            <span>New Journal</span>
          </button>

          <button
            onClick={() => onNavigate('security')}
            id="nav-security-badge-btn"
            className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 cursor-pointer"
            title="Isolated Firestore with Owner Security Rules"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Isolated & Encrypted</span>
          </button>
        </div>

        {/* Right side: User Profile & Actions */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2.5 pl-2">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User profile'}
                referrerPolicy="no-referrer"
                className="h-9 w-9 rounded-full border border-stone-200 object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 font-serif font-medium text-amber-900 border border-amber-200 text-sm">
                {(user.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-left leading-none">
              <p className="text-xs font-semibold text-stone-900 truncate max-w-[130px]">
                {user.displayName || 'Friend'}
              </p>
              <p className="text-[10px] text-stone-600 truncate max-w-[130px]">
                {user.email || 'Authenticated'}
              </p>
            </div>
          </div>

          <button
            id="nav-logout-btn"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 focus:outline-none"
            title="Sign out of your private account"
          >
            <LogOut className="h-3.5 w-3.5 text-stone-500" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            id="nav-mobile-new-btn"
            onClick={onNewJournal}
            className="flex items-center gap-1 rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5 text-amber-300" />
            <span>New</span>
          </button>

          <button
            id="nav-mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-stone-600 hover:bg-stone-200 focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-stone-200 bg-stone-50 px-4 pt-3 pb-5 shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 pb-3 border-b border-stone-200">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full border border-stone-200 object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 font-serif font-medium text-amber-900 border border-amber-200">
                {(user.displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-stone-900">{user.displayName || 'Friend'}</p>
              <p className="text-xs text-stone-600">{user.email || 'Google Authenticated'}</p>
            </div>
          </div>

          <nav className="mt-3 flex flex-col gap-1.5">
            <button
              onClick={() => {
                onNavigate('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                currentView === 'dashboard' ? 'bg-stone-200 text-stone-900' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Home className="h-4 w-4 text-stone-600" />
              <span>Dashboard Home</span>
            </button>

            <button
              onClick={() => {
                onNavigate('tasks');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                currentView === 'tasks' ? 'bg-indigo-100 text-indigo-900 font-semibold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <ListTodo className="h-4 w-4 text-indigo-600" />
              <span>Tasks Studio</span>
            </button>

            <button
              onClick={() => {
                onNavigate('analytics');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                currentView === 'analytics' ? 'bg-teal-100 text-teal-900 font-semibold' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Activity className="h-4 w-4 text-teal-600" />
              <span>Sentiment Pulse</span>
            </button>

            <button
              onClick={() => {
                onNavigate('history');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                currentView === 'history' ? 'bg-stone-200 text-stone-900' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <History className="h-4 w-4 text-stone-600" />
              <span>My Journal History</span>
            </button>

            <button
              onClick={() => {
                onNavigate('security');
                setMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                currentView === 'security' ? 'bg-stone-200 text-stone-900' : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <Lock className="h-4 w-4 text-emerald-700" />
              <span>Privacy & Security Rules</span>
            </button>

            <div className="pt-2">
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
              >
                <LogOut className="h-4 w-4 text-stone-600" />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

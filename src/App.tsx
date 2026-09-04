import React, { useState, useEffect } from 'react';
import { UserProfile, JournalSession, ActiveView } from './types';
import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeToAuth, 
  createSession, 
  deleteSession, 
  subscribeToSessions 
} from './lib/firebase';
import { LandingPage } from './components/LandingPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardHome } from './components/DashboardHome';
import { JournalHistory } from './components/JournalHistory';
import { JournalChat } from './components/JournalChat';
import { ActionItemsWorkspace } from './components/ActionItemsWorkspace';
import { SentimentAnalyticsView } from './components/SentimentAnalyticsView';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<ActiveView>('dashboard');
  const [sessions, setSessions] = useState<JournalSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);

  // Subscribe to Firebase Authentication changes
  useEffect(() => {
    const unsubscribe = subscribeToAuth((authenticatedUser) => {
      setUser(authenticatedUser);
      setIsAuthLoading(false);
      if (!authenticatedUser) {
        setSessions([]);
        setActiveSessionId(null);
        setCurrentView('dashboard');
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to user's private sessions when authenticated
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = subscribeToSessions(
      user.uid,
      (fetchedSessions) => {
        setSessions(fetchedSessions);
      },
      (err) => {
        console.error('Failed to subscribe to user sessions:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      setIsAuthLoading(true);
      const userProfile = await loginWithGoogle();
      if (userProfile) {
        setUser(userProfile);
        setCurrentView('dashboard');
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setAuthError(err?.message || 'Google Sign-In failed. Please ensure popups are allowed.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle User Logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setCurrentView('dashboard');
      setActiveSessionId(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Create and navigate to a brand new journal session
  const handleNewJournal = async () => {
    if (!user?.uid) return;

    try {
      const now = new Date();
      const defaultTitle = `Reflection on ${now.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;

      const newSession = await createSession(user.uid, {
        title: defaultTitle,
        mood: 'reflective',
        preview: '',
        tags: ['Daily Reflection'],
      });

      setActiveSessionId(newSession.id);
      setCurrentView('journal-detail');
      setMobileMenuOpen(false);
    } catch (err) {
      console.error('Failed to create new journal session:', err);
    }
  };

  // Select an existing session to view / continue
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCurrentView('journal-detail');
    setMobileMenuOpen(false);
  };

  // Delete a session
  const handleDeleteSession = async (sessionId: string) => {
    if (!user?.uid) return;
    try {
      await deleteSession(user.uid, sessionId);
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setCurrentView('history');
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Active session object
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Initial authentication loading state
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 shadow-sm animate-pulse">
            <Sparkles className="h-6 w-6 text-amber-700" />
          </div>
          <p className="font-serif text-base font-medium text-stone-800">
            Opening your reflection space...
          </p>
          <div className="h-1 w-28 overflow-hidden rounded-full bg-stone-200">
            <div className="h-full w-full bg-stone-800 animate-[indeterminate_1.5s_infinite_linear]" />
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated: Render beautiful Landing Page with Google Sign In
  if (!user) {
    return (
      <LandingPage
        onSignIn={handleSignIn}
        isLoading={isAuthLoading}
        error={authError}
      />
    );
  }

  // If authenticated: Render Private User Dashboard & Studio
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-950">
      {/* Top Application Navbar */}
      <Navbar
        user={user}
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'security') {
            setShowSecurityModal(true);
          } else {
            setCurrentView(view);
          }
        }}
        onNewJournal={handleNewJournal}
        onLogout={handleLogout}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Layout Container with Sidebar and Content View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Persistent Desktop Sidebar */}
        <Sidebar
          currentView={currentView}
          activeSessionId={activeSessionId}
          recentSessions={sessions}
          onNavigate={(view) => {
            if (view === 'security') {
              setShowSecurityModal(true);
            } else {
              setCurrentView(view);
            }
          }}
          onNewJournal={handleNewJournal}
          onSelectSession={handleSelectSession}
        />

        {/* Dynamic View Area */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {currentView === 'dashboard' && (
            <DashboardHome
              user={user}
              sessions={sessions}
              onNewJournal={handleNewJournal}
              onSelectSession={handleSelectSession}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'history' && (
            <JournalHistory
              user={user}
              sessions={sessions}
              onSelectSession={handleSelectSession}
              onDeleteSession={handleDeleteSession}
              onNewJournal={handleNewJournal}
            />
          )}

          {currentView === 'tasks' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <ActionItemsWorkspace
                user={user}
                sessions={sessions}
                onOpenSession={handleSelectSession}
                onNewJournal={handleNewJournal}
              />
            </div>
          )}

          {currentView === 'analytics' && (
            <div className="p-4 sm:p-6 lg:p-8">
              <SentimentAnalyticsView
                user={user}
                sessions={sessions}
                onOpenSession={handleSelectSession}
                onNewJournal={handleNewJournal}
              />
            </div>
          )}

          {currentView === 'journal-detail' && activeSession && (
            <JournalChat
              user={user}
              session={activeSession}
              onUpdateSessionTitle={(newTitle) => {
                setSessions((prev) =>
                  prev.map((s) => (s.id === activeSession.id ? { ...s, title: newTitle } : s))
                );
              }}
              onBackToHistory={() => setCurrentView('history')}
            />
          )}

          {currentView === 'journal-detail' && !activeSession && (
            <div className="flex h-full items-center justify-center p-8 text-center">
              <div className="max-w-sm">
                <p className="font-serif text-lg font-bold text-stone-800">
                  Journal session not found or deleted
                </p>
                <p className="mt-2 text-xs text-stone-500">
                  The requested journal entry could not be located in your private Firestore collection.
                </p>
                <button
                  onClick={handleNewJournal}
                  className="mt-4 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800"
                >
                  Create New Journal
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Privacy & Security Rules Modal */}
      {showSecurityModal && (
        <PrivacySettingsModal
          user={user}
          sessions={sessions}
          onClose={() => setShowSecurityModal(false)}
        />
      )}
    </div>
  );
}

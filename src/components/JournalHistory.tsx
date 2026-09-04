import React, { useState } from 'react';
import { JournalSession, JournalMood, UserProfile } from '../types';
import { 
  Search, 
  Filter, 
  Trash2, 
  MessageSquare, 
  Calendar, 
  Clock, 
  ArrowRight, 
  FileText, 
  BookHeart, 
  Plus, 
  AlertTriangle,
  Sparkles,
  Tag
} from 'lucide-react';

interface JournalHistoryProps {
  user: UserProfile;
  sessions: JournalSession[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onNewJournal: () => void;
}

const MOOD_EMOJIS: Record<string, { emoji: string; label: string }> = {
  calm: { emoji: '🌿', label: 'Calm' },
  reflective: { emoji: '🪞', label: 'Reflective' },
  grateful: { emoji: '✨', label: 'Grateful' },
  inspired: { emoji: '💡', label: 'Inspired' },
  hopeful: { emoji: '🌱', label: 'Hopeful' },
  anxious: { emoji: '🌊', label: 'Anxious' },
  overwhelmed: { emoji: '⚡', label: 'Overwhelmed' },
  tired: { emoji: '🌙', label: 'Tired' },
};

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  sessions,
  onSelectSession,
  onDeleteSession,
  onNewJournal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter and search
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.preview && s.preview.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood =
      selectedMoodFilter === 'all' || s.mood === selectedMoodFilter;

    return matchesSearch && matchesMood;
  });

  const confirmDelete = async () => {
    if (!deletingSessionId) return;
    try {
      setIsDeleting(true);
      await onDeleteSession(deletingSessionId);
      setDeletingSessionId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            My Journal History
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Revisit your reflections, track emotional patterns, and continue past conversations.
          </p>
        </div>

        <button
          id="history-new-journal-btn"
          onClick={onNewJournal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800 active:scale-95 cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4 text-amber-300" />
          <span>New Journal Entry</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past journal titles or reflections..."
            className="w-full rounded-2xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Mood Filter Dropdown */}
        <div className="relative">
          <select
            value={selectedMoodFilter}
            onChange={(e) => setSelectedMoodFilter(e.target.value)}
            className="w-full appearance-none rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 transition shadow-2xs cursor-pointer"
          >
            <option value="all">All Moods & Feelings</option>
            <option value="calm">🌿 Calm</option>
            <option value="reflective">🪞 Reflective</option>
            <option value="grateful">✨ Grateful</option>
            <option value="inspired">💡 Inspired</option>
            <option value="hopeful">🌱 Hopeful</option>
            <option value="anxious">🌊 Anxious</option>
            <option value="overwhelmed">⚡ Overwhelmed</option>
            <option value="tired">🌙 Tired</option>
          </select>
          <Filter className="pointer-events-none absolute right-3.5 top-3 h-4 w-4 text-stone-400" />
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSessions.map((session) => {
            const moodInfo = session.mood && MOOD_EMOJIS[session.mood] ? MOOD_EMOJIS[session.mood] : MOOD_EMOJIS['reflective'];
            const dateFormatted = new Date(session.updatedAt || session.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeFormatted = new Date(session.updatedAt || session.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={session.id}
                className="group flex flex-col justify-between rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs transition hover:border-stone-300 hover:shadow-md relative overflow-hidden"
              >
                <div>
                  {/* Top card metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-0.5 text-xs font-medium text-stone-700">
                      <span>{moodInfo.emoji}</span>
                      <span>{moodInfo.label}</span>
                    </span>

                    <span className="flex items-center gap-1 text-[11px] text-stone-600">
                      <Clock className="h-3 w-3" />
                      <span>{dateFormatted}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => onSelectSession(session.id)}
                    className="font-serif text-base sm:text-lg font-bold text-stone-900 leading-snug cursor-pointer group-hover:text-amber-900 transition line-clamp-2"
                  >
                    {session.title}
                  </h3>

                  {/* Snippet / Preview */}
                  <p className="mt-2.5 text-xs text-stone-600 leading-relaxed line-clamp-3">
                    {session.preview || 'No written thoughts logged yet...'}
                  </p>

                  {/* Summary Indicator Pill */}
                  {session.summary && (
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60 w-fit">
                      <FileText className="h-3.5 w-3.5 text-amber-700" />
                      <span>Summary Available</span>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-4 text-xs">
                  <span className="flex items-center gap-1 text-stone-600">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>{session.messageCount || 0} reflections</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeletingSessionId(session.id)}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
                      title="Delete this session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => onSelectSession(session.id)}
                      className="flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-1.5 font-medium text-stone-50 transition hover:bg-stone-800 active:scale-95"
                    >
                      <span>Open</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white/60 p-12 text-center max-w-md mx-auto">
          <BookHeart className="mx-auto h-12 w-12 text-stone-400" />
          <h3 className="mt-4 font-serif text-lg font-bold text-stone-800">
            {searchQuery || selectedMoodFilter !== 'all' ? 'No matching reflections found' : 'No journal history yet'}
          </h3>
          <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
            {searchQuery || selectedMoodFilter !== 'all'
              ? 'Try adjusting your search terms or filters.'
              : 'Write your thoughts and feelings today. Your sessions will be securely saved here.'}
          </p>
          <button
            onClick={onNewJournal}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
          >
            <Plus className="h-3.5 w-3.5 text-amber-300" />
            <span>Create First Journal</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="rounded-full bg-red-100 p-2.5">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Delete Journal Session?
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              This will permanently remove this journal entry, its multi-turn conversation, and any generated reflections from your private Cloud Firestore storage. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletingSessionId(null)}
                disabled={isDeleting}
                className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

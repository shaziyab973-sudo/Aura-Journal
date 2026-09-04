import React, { useState, useEffect, useMemo } from 'react';
import { ActionTask, UserProfile, JournalSession, JournalMessage } from '../types';
import {
  subscribeToTasks,
  createTask,
  batchCreateTasks,
  updateTask,
  deleteTask,
  getSessionMessages,
} from '../lib/firebase';
import { extractActionTasks } from '../lib/api';
import {
  CheckCircle2,
  Circle,
  Clock,
  Plus,
  Trash2,
  Tag,
  AlertCircle,
  ListTodo,
  Sparkles,
  ArrowRight,
  Filter,
  Briefcase,
  Heart,
  BookOpen,
  Columns,
  List,
  RefreshCw,
  Search,
  Check,
  Zap,
  ArrowUpRight,
  CheckCheck,
  Smile
} from 'lucide-react';

interface ActionItemsWorkspaceProps {
  user: UserProfile;
  sessions: JournalSession[];
  onOpenSession: (sessionId: string) => void;
  onNewJournal: () => void;
}

export const ActionItemsWorkspace: React.FC<ActionItemsWorkspaceProps> = ({
  user,
  sessions,
  onOpenSession,
  onNewJournal,
}) => {
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: Kanban vs List
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Filters & Search
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Task Creation State
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState<'Personal' | 'Career' | 'Wellness' | 'Learning' | 'General'>('Personal');
  const [newTaskTimeframe, setNewTaskTimeframe] = useState('This week');
  const [newTaskContext, setNewTaskContext] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Extraction State
  const [isHarvesting, setIsHarvesting] = useState(false);
  const [harvestSessionId, setHarvestSessionId] = useState<string>('all');
  const [harvestFeedback, setHarvestFeedback] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Real-time Firestore subscription to user's private tasks collection
  useEffect(() => {
    if (!user.uid) return;
    const unsub = subscribeToTasks(
      user.uid,
      (fetched) => {
        setTasks(fetched);
        setLoading(false);
      },
      (err) => {
        console.error('Failed to subscribe to tasks:', err);
        setActionError('Failed to load tasks. Verify connection.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user.uid]);

  // Status transitions
  const handleUpdateStatus = async (task: ActionTask, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      await updateTask(user.uid, task.id, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? Date.now() : undefined,
      });
    } catch (err: any) {
      console.error('Error updating task status:', err);
      setActionError('Could not update task status.');
    }
  };

  const handleToggleCompleted = async (task: ActionTask) => {
    const nextStatus = task.status === 'completed' ? 'pending' : 'completed';
    await handleUpdateStatus(task, nextStatus);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(user.uid, taskId);
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setActionError('Could not delete task.');
    }
  };

  const handleCreateManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setSubmitting(true);
    setActionError(null);
    try {
      await createTask(user.uid, {
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        category: newTaskCategory,
        status: 'pending',
        suggestedTimeframe: newTaskTimeframe,
        context: newTaskContext.trim() || 'Created manually in Tasks Studio',
      });
      setNewTaskTitle('');
      setNewTaskContext('');
      setIsAddingTask(false);
    } catch (err: any) {
      console.error('Error adding task:', err);
      setActionError('Could not save new task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Local fallback parsing logic when Gemini API is unavailable or offline
  const localParseActionItems = (
    text: string,
    sessionTitle: string
  ): Array<Omit<ActionTask, 'id' | 'userId' | 'createdAt'>> => {
    const lines = text.split(/\r?\n/);
    const actionTriggers = [
      /\b(need to|must|have to|plan to|will|going to|should|remind myself to|remember to)\s+([^.!?,\n]{5,100})/i,
      /\b(schedule|call|email|read|finish|start|buy|practice|reach out to|organize|review|clean)\s+([^.!?,\n]{5,80})/i,
      /^\s*[-*•]\s*(\[ \])?\s*(.+)$/,
    ];

    const extracted: Array<Omit<ActionTask, 'id' | 'userId' | 'createdAt'>> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 6) continue;

      for (const regex of actionTriggers) {
        const match = trimmed.match(regex);
        if (match) {
          const rawTitle = (match[2] || match[1] || trimmed).replace(/^\[\s*\]\s*/, '').trim();
          if (rawTitle && rawTitle.length >= 5 && rawTitle.length <= 120) {
            const capitalized = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);
            // Categorize by keywords
            let cat: ActionTask['category'] = 'Personal';
            if (/\b(work|meeting|project|code|boss|client|deadline|career)\b/i.test(capitalized)) {
              cat = 'Career';
            } else if (/\b(sleep|workout|gym|eat|meditate|breathe|walk|health)\b/i.test(capitalized)) {
              cat = 'Wellness';
            } else if (/\b(study|read|book|course|learn|listen)\b/i.test(capitalized)) {
              cat = 'Learning';
            }

            extracted.push({
              title: capitalized,
              priority: 'medium',
              category: cat,
              status: 'pending',
              suggestedTimeframe: 'This week',
              sessionTitle,
              context: `Identified from reflection: "${trimmed.slice(0, 100)}..."`,
            });
            break;
          }
        }
      }
      if (extracted.length >= 8) break;
    }

    return extracted;
  };

  // Automatic Task Harvester from user's Firestore Journal Entries
  const handleHarvestTasks = async () => {
    if (!user.uid || sessions.length === 0) {
      setActionError('No journal entries found to harvest. Create a journal entry first!');
      return;
    }

    setIsHarvesting(true);
    setHarvestFeedback(null);
    setActionError(null);

    try {
      const targetSessions = harvestSessionId === 'all'
        ? sessions.slice(0, 5) // scan recent 5 journals
        : sessions.filter((s) => s.id === harvestSessionId);

      const existingTitles = new Set(tasks.map((t) => t.title.toLowerCase().trim()));
      const newlyDiscovered: Array<Omit<ActionTask, 'id' | 'userId' | 'createdAt'>> = [];

      for (const session of targetSessions) {
        // Collect text from session preview/summary and message history
        let sessionFullText = `${session.title}. ${session.preview || ''}`;
        
        // Fetch detailed message contents from Firestore for deep extraction
        try {
          const msgs: JournalMessage[] = await getSessionMessages(user.uid, session.id);
          const userEntries = msgs.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n');
          if (userEntries) {
            sessionFullText = `${session.title}\n\n${userEntries}`;
          }
        } catch (e) {
          console.warn('Could not load detailed session messages, using session preview:', e);
        }

        if (!sessionFullText.trim() || sessionFullText.length < 15) continue;

        // Attempt extraction with Gemini API first
        let sessionExtractedTasks: Array<{
          title: string;
          priority: 'low' | 'medium' | 'high';
          category: 'Personal' | 'Career' | 'Wellness' | 'Learning' | 'General';
          context?: string;
          suggestedTimeframe?: string;
        }> = [];

        try {
          const res = await extractActionTasks(sessionFullText, session.title);
          if (res && Array.isArray(res.tasks) && res.tasks.length > 0) {
            sessionExtractedTasks = res.tasks;
          }
        } catch (aiErr) {
          console.warn('Gemini extraction failed, using resilient local text-parsing fallback:', aiErr);
          const localItems = localParseActionItems(sessionFullText, session.title);
          sessionExtractedTasks = localItems;
        }

        // De-duplicate and prepare for Firestore batch insertion
        for (const item of sessionExtractedTasks) {
          const lower = item.title.toLowerCase().trim();
          if (!existingTitles.has(lower)) {
            existingTitles.add(lower);
            newlyDiscovered.push({
              title: item.title,
              priority: item.priority || 'medium',
              category: item.category || 'Personal',
              status: 'pending',
              sessionId: session.id,
              sessionTitle: session.title,
              context: item.context || `Extracted from session: "${session.title}"`,
              suggestedTimeframe: item.suggestedTimeframe || 'This week',
            });
          }
        }
      }

      if (newlyDiscovered.length > 0) {
        await batchCreateTasks(user.uid, newlyDiscovered);
        setHarvestFeedback(`Harvested ${newlyDiscovered.length} new actionable commitment${newlyDiscovered.length > 1 ? 's' : ''} from your reflections!`);
      } else {
        setHarvestFeedback('All identified action items from selected journals are already tracked in your workspace.');
      }
    } catch (err: any) {
      console.error('Error harvesting tasks from journals:', err);
      setActionError(err?.message || 'Failed to harvest action items. Please try again.');
    } finally {
      setIsHarvesting(false);
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchContext = t.context?.toLowerCase().includes(q);
        const matchSession = t.sessionTitle?.toLowerCase().includes(q);
        if (!matchTitle && !matchContext && !matchSession) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, categoryFilter, searchQuery]);

  // Kanban column groups
  const todoTasks = filteredTasks.filter((t) => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  const pendingTotal = tasks.filter((t) => t.status === 'pending').length;
  const inProgressTotal = tasks.filter((t) => t.status === 'in_progress').length;
  const completedTotal = tasks.filter((t) => t.status === 'completed').length;

  const getPriorityBadge = (p: 'low' | 'medium' | 'high') => {
    switch (p) {
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'low':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  const getCategoryIcon = (c: string) => {
    switch (c) {
      case 'Career':
        return <Briefcase className="h-3 w-3 text-stone-500" />;
      case 'Wellness':
        return <Heart className="h-3 w-3 text-rose-500" />;
      case 'Learning':
        return <BookOpen className="h-3 w-3 text-indigo-500" />;
      default:
        return <Tag className="h-3 w-3 text-stone-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-800">
              <Sparkles className="h-4 w-4" />
              <span>MindPulse Action Item Extractor</span>
            </div>
            <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
              Tasks Studio & Commitments
            </h1>
            <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
              Transform your contemplative reflections into grounded daily milestones. Tasks are automatically harvested from your Firestore journal entries by Gemini or added manually.
            </p>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Auto-Extract Button */}
            <button
              id="tasks-harvest-btn"
              onClick={handleHarvestTasks}
              disabled={isHarvesting || sessions.length === 0}
              className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs font-semibold text-indigo-900 shadow-2xs transition hover:bg-indigo-100 hover:border-indigo-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Read saved reflections from Firestore and extract action items"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${isHarvesting ? 'animate-spin' : ''}`} />
              <span>{isHarvesting ? 'Scanning Journals...' : 'Scan & Extract Actions'}</span>
            </button>

            {/* Add Manual Task Button */}
            <button
              id="action-add-task-btn"
              onClick={() => setIsAddingTask(true)}
              className="flex items-center gap-2 rounded-2xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              <span>Add Action</span>
            </button>
          </div>
        </div>

        {/* Counter cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-stone-100">
          <div className="rounded-2xl bg-stone-50/80 p-3.5 border border-stone-200/70">
            <span className="text-xs font-medium text-stone-500">To Do</span>
            <p className="text-2xl font-bold text-stone-900 font-serif mt-0.5">{pendingTotal}</p>
          </div>
          <div className="rounded-2xl bg-amber-50/70 p-3.5 border border-amber-200/70">
            <span className="text-xs font-medium text-amber-900">In Progress</span>
            <p className="text-2xl font-bold text-amber-950 font-serif mt-0.5">{inProgressTotal}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200/70">
            <span className="text-xs font-medium text-emerald-900">Completed</span>
            <p className="text-2xl font-bold text-emerald-950 font-serif mt-0.5">{completedTotal}</p>
          </div>
          <div className="rounded-2xl bg-indigo-50/70 p-3.5 border border-indigo-200/70">
            <span className="text-xs font-medium text-indigo-900">Total Harvested</span>
            <p className="text-2xl font-bold text-indigo-950 font-serif mt-0.5">{tasks.length}</p>
          </div>
        </div>
      </div>

      {/* Harvest Feedback Banner */}
      {harvestFeedback && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/90 p-4 text-xs font-medium text-indigo-900 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 shrink-0 text-indigo-600" />
            <span>{harvestFeedback}</span>
          </div>
          <button onClick={() => setHarvestFeedback(null)} className="text-xs font-semibold text-indigo-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Action Error Banner */}
      {actionError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs font-semibold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Add Task Modal Form */}
      {isAddingTask && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/40 p-6 shadow-sm animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-semibold text-stone-900 flex items-center gap-2">
              <Plus className="h-4 w-4 text-amber-700" />
              <span>Define New Actionable Step</span>
            </h3>
            <button
              onClick={() => setIsAddingTask(false)}
              className="text-xs text-stone-500 hover:text-stone-800"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateManualTask} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Action Title *
              </label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Schedule 15 minutes of uninterrupted morning meditation"
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Priority
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category
                </label>
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none"
                >
                  <option value="Personal">Personal</option>
                  <option value="Career">Career</option>
                  <option value="Wellness">Wellness</option>
                  <option value="Learning">Learning</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Timeframe
                </label>
                <input
                  type="text"
                  value={newTaskTimeframe}
                  onChange={(e) => setNewTaskTimeframe(e.target.value)}
                  placeholder="e.g. Today, Next week"
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Context / Notes (Optional)
              </label>
              <input
                type="text"
                value={newTaskContext}
                onChange={(e) => setNewTaskContext(e.target.value)}
                placeholder="Why this matters right now..."
                className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingTask(false)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !newTaskTitle.trim()}
                className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-stone-800 disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Create Action'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Control Bar: View Toggle (Kanban vs List), Filters, and Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-stone-100/80 p-3 rounded-2xl border border-stone-200/80">
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-white p-1 border border-stone-200/80 shadow-2xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'kanban'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'list'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
          </div>

          {/* Quick Status Filter (in list view) */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-1 overflow-x-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'all' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                All ({tasks.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'pending' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                To Do ({pendingTotal})
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'in_progress' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                Active ({inProgressTotal})
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  statusFilter === 'completed' ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-200'
                }`}
              >
                Done ({completedTotal})
              </button>
            </div>
          )}
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative flex-1 md:w-52">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions..."
              className="w-full rounded-xl border border-stone-300 bg-white pl-8 pr-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-white border border-stone-300 rounded-xl px-2.5 py-1.5 text-stone-700 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Personal">Personal</option>
              <option value="Career">Career</option>
              <option value="Wellness">Wellness</option>
              <option value="Learning">Learning</option>
              <option value="General">General</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: Kanban vs List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="h-7 w-7 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto" />
          <p className="text-xs text-stone-500 mt-3 font-medium">Loading your private commitments from Firestore...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white/70 p-12 text-center shadow-2xs">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 mx-auto shadow-2xs">
            <ListTodo className="h-7 w-7 stroke-1" />
          </div>
          <h3 className="font-serif text-xl font-bold text-stone-900 mt-4">
            No action items tracked yet
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto mt-2 leading-relaxed">
            Click <span className="font-semibold text-indigo-900">"Scan & Extract Actions"</span> to have Gemini parse your saved journal reflections, or add your first action item manually.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleHarvestTasks}
              disabled={isHarvesting || sessions.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Harvest from My Journals</span>
            </button>
            <button
              onClick={() => setIsAddingTask(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Action</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* Column 1: TO DO */}
          <div className="rounded-3xl border border-stone-200/80 bg-stone-100/50 p-4 shadow-2xs flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 mb-3">
              <div className="flex items-center gap-2">
                <Circle className="h-4 w-4 text-stone-500" />
                <h3 className="font-serif text-sm font-bold text-stone-900">To Do</h3>
                <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[11px] font-semibold text-stone-700">
                  {todoTasks.length}
                </span>
              </div>
              <button
                onClick={() => setIsAddingTask(true)}
                className="text-stone-500 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-200"
                title="Add task to To Do"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 flex-1">
              {todoTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-200 p-6 text-center text-xs text-stone-400">
                  No tasks waiting to be started
                </div>
              ) : (
                todoTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onStatusChange={(status) => handleUpdateStatus(task, status)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onOpenSession={onOpenSession}
                    getPriorityBadge={getPriorityBadge}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div className="rounded-3xl border border-amber-200/70 bg-amber-50/30 p-4 shadow-2xs flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 mb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-700" />
                <h3 className="font-serif text-sm font-bold text-stone-900">In Progress</h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                  {inProgressTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {inProgressTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-amber-200/60 p-6 text-center text-xs text-stone-400">
                  No tasks currently active
                </div>
              ) : (
                inProgressTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onStatusChange={(status) => handleUpdateStatus(task, status)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onOpenSession={onOpenSession}
                    getPriorityBadge={getPriorityBadge}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: COMPLETED */}
          <div className="rounded-3xl border border-emerald-200/70 bg-emerald-50/30 p-4 shadow-2xs flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="font-serif text-sm font-bold text-stone-900">Completed</h3>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                  {completedTasks.length}
                </span>
              </div>
            </div>

            <div className="space-y-3 flex-1">
              {completedTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-emerald-200/60 p-6 text-center text-xs text-stone-400">
                  No completed milestones yet
                </div>
              ) : (
                completedTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onStatusChange={(status) => handleUpdateStatus(task, status)}
                    onDelete={() => handleDeleteTask(task.id)}
                    onOpenSession={onOpenSession}
                    getPriorityBadge={getPriorityBadge}
                    getCategoryIcon={getCategoryIcon}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-white/60 p-10 text-center">
              <ListTodo className="h-9 w-9 text-stone-400 mx-auto stroke-1" />
              <p className="text-xs text-stone-500 mt-2">No matching tasks found with current filters.</p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = task.status === 'completed';
              return (
                <div
                  key={task.id}
                  className={`group flex items-start justify-between gap-3.5 rounded-2xl border p-4 transition-all ${
                    isDone
                      ? 'border-stone-200 bg-stone-50/70 opacity-80'
                      : 'border-stone-200/80 bg-white hover:border-stone-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleCompleted(task)}
                      className="mt-0.5 shrink-0 text-stone-400 hover:text-stone-900 transition cursor-pointer"
                      title={isDone ? 'Mark to do' : 'Mark completed'}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="h-5 w-5 text-stone-300 group-hover:text-stone-500" />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <p
                        className={`text-sm font-medium leading-snug break-words ${
                          isDone ? 'line-through text-stone-400' : 'text-stone-900'
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                        {/* Status selector */}
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateStatus(task, e.target.value as any)}
                          className="text-[10px] rounded-md border border-stone-200 bg-white px-2 py-0.5 font-medium text-stone-700"
                        >
                          <option value="pending">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>

                        <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                          {getCategoryIcon(task.category)}
                          <span>{task.category}</span>
                        </span>

                        {task.suggestedTimeframe && (
                          <span className="inline-flex items-center gap-1 text-stone-500">
                            <Clock className="h-3 w-3 text-stone-400" />
                            <span>{task.suggestedTimeframe}</span>
                          </span>
                        )}

                        {task.sessionId && (
                          <button
                            onClick={() => onOpenSession(task.sessionId!)}
                            className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 hover:underline"
                            title="Jump to source journal reflection"
                          >
                            <ArrowRight className="h-3 w-3" />
                            <span className="truncate max-w-[160px]">
                              {task.sessionTitle || 'Source Journal'}
                            </span>
                          </button>
                        )}
                      </div>

                      {task.context && (
                        <p className="text-xs text-stone-500 italic mt-0.5 border-l-2 border-amber-300/70 pl-2">
                          "{task.context}"
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition shrink-0 cursor-pointer"
                    title="Delete action"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

// Sub-component for individual Kanban Cards
interface KanbanCardProps {
  task: ActionTask;
  onStatusChange: (status: 'pending' | 'in_progress' | 'completed') => void;
  onDelete: () => void;
  onOpenSession: (sessionId: string) => void;
  getPriorityBadge: (p: 'low' | 'medium' | 'high') => string;
  getCategoryIcon: (c: string) => React.ReactNode;
}

const KanbanCard: React.FC<KanbanCardProps> = ({
  task,
  onStatusChange,
  onDelete,
  onOpenSession,
  getPriorityBadge,
  getCategoryIcon,
}) => {
  const isDone = task.status === 'completed';

  return (
    <div className="group rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs hover:shadow-sm hover:border-stone-300 transition-all">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${getPriorityBadge(
            task.priority
          )}`}
        >
          {task.priority}
        </span>

        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer"
          title="Delete action"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className={`mt-2 text-sm font-medium leading-snug break-words ${isDone ? 'line-through text-stone-400' : 'text-stone-900'}`}>
        {task.title}
      </p>

      {task.context && (
        <p className="mt-1.5 text-[11px] text-stone-500 italic line-clamp-2 border-l border-amber-300 pl-2">
          {task.context}
        </p>
      )}

      {/* Meta tags row */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500">
        <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-stone-600">
          {getCategoryIcon(task.category)}
          <span>{task.category}</span>
        </span>

        {task.suggestedTimeframe && (
          <span className="inline-flex items-center gap-1 text-stone-500">
            <Clock className="h-3 w-3 text-stone-400" />
            <span>{task.suggestedTimeframe}</span>
          </span>
        )}
      </div>

      {/* Source session indicator */}
      {task.sessionId && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
          <button
            onClick={() => onOpenSession(task.sessionId!)}
            className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 hover:underline truncate max-w-[180px] cursor-pointer"
            title="Open original journal session"
          >
            <ArrowUpRight className="h-3 w-3 shrink-0" />
            <span className="truncate">{task.sessionTitle || 'Source Journal'}</span>
          </button>
        </div>
      )}

      {/* Quick Move / Transition actions */}
      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between gap-1 text-[10px]">
        {task.status !== 'pending' && (
          <button
            onClick={() => onStatusChange('pending')}
            className="rounded-md border border-stone-200 px-2 py-1 text-stone-600 hover:bg-stone-100 transition cursor-pointer"
          >
            ← To Do
          </button>
        )}
        {task.status !== 'in_progress' && (
          <button
            onClick={() => onStatusChange('in_progress')}
            className="rounded-md border border-amber-200 bg-amber-50/60 px-2 py-1 text-amber-800 hover:bg-amber-100 transition cursor-pointer"
          >
            {task.status === 'pending' ? 'Start →' : '← In Progress'}
          </button>
        )}
        {task.status !== 'completed' && (
          <button
            onClick={() => onStatusChange('completed')}
            className="rounded-md border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer ml-auto"
          >
            Done ✓
          </button>
        )}
      </div>
    </div>
  );
};

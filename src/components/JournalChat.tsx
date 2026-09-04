import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import { 
  JournalSession, 
  JournalMessage, 
  UserProfile, 
  JournalMood, 
  SessionSummary,
  LocationTag,
  SentimentAnalysis,
  ActionTask
} from '../types';
import { 
  addMessage, 
  subscribeToMessages, 
  updateSession,
  batchCreateTasks,
  updateSessionLocation,
  updateSessionSentiment
} from '../lib/firebase';
import { 
  sendChatMessage, 
  executeAiAction,
  extractActionTasks,
  analyzeSentiment
} from '../lib/api';
import { LocationTagModal } from './LocationTagModal';
import { 
  Send, 
  Sparkles, 
  FileText, 
  Compass, 
  Lightbulb, 
  Edit3, 
  Check, 
  Copy, 
  RotateCcw, 
  AlertCircle, 
  Smile, 
  X, 
  Calendar, 
  Clock, 
  Bot, 
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ListTodo,
  Activity,
  MapPin,
  CheckCircle2
} from 'lucide-react';

interface JournalChatProps {
  user: UserProfile;
  session: JournalSession;
  onUpdateSessionTitle: (title: string) => void;
  onBackToHistory: () => void;
}

const MOODS: { value: JournalMood; label: string; emoji: string; color: string }[] = [
  { value: 'calm', label: 'Calm', emoji: '🌿', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { value: 'reflective', label: 'Reflective', emoji: '🪞', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { value: 'grateful', label: 'Grateful', emoji: '✨', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { value: 'inspired', label: 'Inspired', emoji: '💡', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { value: 'hopeful', label: 'Hopeful', emoji: '🌱', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  { value: 'anxious', label: 'Anxious', emoji: '🌊', color: 'bg-sky-50 text-sky-800 border-sky-200' },
  { value: 'overwhelmed', label: 'Overwhelmed', emoji: '⚡', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  { value: 'tired', label: 'Tired', emoji: '🌙', color: 'bg-stone-100 text-stone-700 border-stone-200' },
];

export const JournalChat: React.FC<JournalChatProps> = ({
  user,
  session,
  onUpdateSessionTitle,
  onBackToHistory,
}) => {
  const [messages, setMessages] = useState<JournalMessage[]>([]);
  const [inputContent, setInputContent] = useState('');
  const [currentMood, setCurrentMood] = useState<JournalMood>(session.mood || 'reflective');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatingAction, setGeneratingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(session.title);

  // Summary drawer/modal state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<string | null>(
    typeof session.summary === 'string' ? session.summary : (session.summary?.rawText || null)
  );

  // Copied indicator
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Feature 1, 2, 3 States
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationTag | undefined>(session.location);
  const [currentSentiment, setCurrentSentiment] = useState<SentimentAnalysis | undefined>(session.sentiment);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Full Screen / Collapsible Composer State
  const [isComposerCollapsed, setIsComposerCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to real-time messages in Cloud Firestore
  useEffect(() => {
    if (!user.uid || !session.id) return;

    const unsubscribe = subscribeToMessages(
      user.uid,
      session.id,
      (fetchedMessages) => {
        setMessages(fetchedMessages);
        setErrorMessage(null);
      },
      (err) => {
        console.error('Failed to subscribe to messages:', err);
        setErrorMessage('Could not load messages from Firestore. Please check your connection.');
      }
    );

    return () => unsubscribe();
  }, [user.uid, session.id]);

  // Sync title and metadata when session changes
  useEffect(() => {
    setEditableTitle(session.title);
    if (session.mood) setCurrentMood(session.mood);
    if (session.summary) {
      setCurrentSummary(typeof session.summary === 'string' ? session.summary : session.summary.rawText);
    }
    setCurrentLocation(session.location);
    setCurrentSentiment(session.sentiment);
  }, [session.id, session.title, session.mood, session.summary, session.location, session.sentiment]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiGenerating]);

  // Handle Title Save
  const handleSaveTitle = async () => {
    const trimmed = editableTitle.trim();
    if (!trimmed || trimmed === session.title) {
      setIsEditingTitle(false);
      setEditableTitle(session.title);
      return;
    }

    try {
      await updateSession(user.uid, session.id, { title: trimmed });
      onUpdateSessionTitle(trimmed);
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  // Handle Mood Change
  const handleMoodSelect = async (mood: JournalMood) => {
    setCurrentMood(mood);
    try {
      await updateSession(user.uid, session.id, { mood });
    } catch (err) {
      console.error('Failed to update mood in Firestore:', err);
    }
  };

  // Submit User Message and request Gemini Reflection
  const handleSendMessage = async (customPrompt?: string) => {
    const contentToSend = (customPrompt || inputContent).trim();
    if (!contentToSend || isAiGenerating) return;

    setErrorMessage(null);
    setInputContent('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // 1. Instantly save user reflection entry to Firestore
      const userMsg = await addMessage(user.uid, session.id, {
        role: 'user',
        content: contentToSend,
        actionType: 'chat',
      });

      // 2. Query Gemini API via server route
      setIsAiGenerating(true);
      setGeneratingAction('reflecting');

      // Include all previous messages + this new message for context
      const chatHistory = [...messages, userMsg];
      const aiResponse = await sendChatMessage(chatHistory, contentToSend, currentMood);

      // 3. Persist Gemini's response to Firestore
      await addMessage(user.uid, session.id, {
        role: 'model',
        content: aiResponse.reply,
        actionType: 'chat',
        modelUsed: aiResponse.modelUsed,
      });
    } catch (err: any) {
      console.error('Message exchange failure:', err);
      setErrorMessage(
        err?.message || 'Something went wrong while communicating with Gemini. Your entry was saved, but the reflection failed.'
      );
    } finally {
      setIsAiGenerating(false);
      setGeneratingAction(null);
    }
  };

  // Dedicated AI Action: Summarize
  const handleGenerateSummary = async () => {
    if (messages.length === 0 && !inputContent.trim()) {
      setErrorMessage('Write at least one reflection before generating a summary.');
      return;
    }

    setErrorMessage(null);
    setIsAiGenerating(true);
    setGeneratingAction('summarizing');

    const combinedText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Reflection Assistant'}: ${m.content}`)
      .join('\n\n') + (inputContent ? `\n\nUser: ${inputContent}` : '');

    try {
      const result = await executeAiAction('summarize', combinedText, currentMood);
      const summaryText = result.result;
      setCurrentSummary(summaryText);
      setShowSummaryModal(true);

      // Save summary in session document
      await updateSession(user.uid, session.id, {
        summary: {
          rawText: summaryText,
          generatedAt: Date.now(),
        },
      });

      // Also append summary to chat stream for clarity
      await addMessage(user.uid, session.id, {
        role: 'model',
        content: `**📋 Session Summary Generated**\n\n${summaryText}`,
        actionType: 'summary',
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      console.error('Summary error:', err);
      setErrorMessage(err?.message || 'Failed to generate session summary.');
    } finally {
      setIsAiGenerating(false);
      setGeneratingAction(null);
    }
  };

  // Dedicated AI Action: Deep Reflection Questions
  const handleGenerateReflectQuestions = async () => {
    if (messages.length === 0 && !inputContent.trim()) {
      setErrorMessage('Share a reflection or thought first to receive personalized reflection questions.');
      return;
    }

    setErrorMessage(null);
    setIsAiGenerating(true);
    setGeneratingAction('deep questions');

    const combinedText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content}`)
      .join('\n\n') + (inputContent ? `\n\nUser: ${inputContent}` : '');

    try {
      const result = await executeAiAction('reflect', combinedText, currentMood);
      await addMessage(user.uid, session.id, {
        role: 'model',
        content: result.result,
        actionType: 'reflect',
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to generate reflection questions.');
    } finally {
      setIsAiGenerating(false);
      setGeneratingAction(null);
    }
  };

  // Dedicated AI Action: Brainstorm Constructive Ideas
  const handleBrainstormIdeas = async () => {
    if (messages.length === 0 && !inputContent.trim()) {
      setErrorMessage('Describe a situation or dilemma first so Gemini can brainstorm ideas for you.');
      return;
    }

    setErrorMessage(null);
    setIsAiGenerating(true);
    setGeneratingAction('brainstorming');

    const combinedText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Gemini'}: ${m.content}`)
      .join('\n\n') + (inputContent ? `\n\nUser: ${inputContent}` : '');

    try {
      const result = await executeAiAction('brainstorm', combinedText, currentMood);
      await addMessage(user.uid, session.id, {
        role: 'model',
        content: result.result,
        actionType: 'brainstorm',
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to brainstorm ideas.');
    } finally {
      setIsAiGenerating(false);
      setGeneratingAction(null);
    }
  };

  // Dedicated AI Action: Daily Prompts
  const handleGetDailyPrompt = async () => {
    setErrorMessage(null);
    setIsAiGenerating(true);
    setGeneratingAction('fetching inspiration');

    try {
      const result = await executeAiAction('prompt', '', currentMood);
      await addMessage(user.uid, session.id, {
        role: 'model',
        content: `**✨ Reflection Prompts for Your Mood (${currentMood}):**\n\n${result.result}`,
        actionType: 'prompt',
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to fetch prompt.');
    } finally {
      setIsAiGenerating(false);
      setGeneratingAction(null);
    }
  };

  // Feature 2: Action Item Extractor
  const handleExtractActions = async () => {
    if (messages.length === 0 && !inputContent.trim()) {
      setErrorMessage('Write a journal entry first to extract action items.');
      return;
    }

    setErrorMessage(null);
    setIsAiGenerating(true);
    setGeneratingAction('extracting action items');

    const combinedText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n') + (inputContent ? `\n\nUser: ${inputContent}` : '');

    try {
      const { tasks, modelUsed } = await extractActionTasks(combinedText, session.title);
      
      if (!tasks || tasks.length === 0) {
        setErrorMessage('No explicit tasks identified. Try sharing your intentions or goals.');
        return;
      }

      // Save each task isolated to /users/{userId}/tasks
      const tasksToPersist = tasks.map((t) => ({
        sessionId: session.id,
        sessionTitle: session.title,
        title: t.title,
        priority: t.priority,
        category: t.category,
        status: 'pending' as const,
        context: t.context,
        suggestedTimeframe: t.suggestedTimeframe,
      }));

      await batchCreateTasks(user.uid, tasksToPersist);

      // Append assistant message in chat stream
      const formattedTaskList = tasks
        .map((t, idx) => `${idx + 1}. **${t.title}** [${t.priority.toUpperCase()} - ${t.category}]\n   _${t.context || ''}_`)
        .join('\n\n');

      await addMessage(user.uid, session.id, {
        role: 'model',
        content: `**🎯 Action Items Extracted & Saved to Tasks Studio:**\n\n${formattedTaskList}\n\n*These tasks have been isolated and securely saved to your Tasks dashboard.*`,
        actionType: 'tasks',
        modelUsed,
      });

      setSuccessToast(`Extracted ${tasks.length} actions into your Tasks Studio.`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Task extraction error:', err);
      setErrorMessage(err?.message || 'Failed to extract tasks.');
    } finally {
      setIsAiGenerating(false);
      setGeneratingAction(null);
    }
  };

  // Feature 1: AI Sentiment Analytics
  const handleAnalyzeSentiment = async () => {
    if (messages.length === 0 && !inputContent.trim()) {
      setErrorMessage('Share some thoughts first to evaluate sentiment.');
      return;
    }

    setErrorMessage(null);
    setIsAiGenerating(true);
    setGeneratingAction('analyzing emotional sentiment');

    const combinedText = messages
      .map((m) => `${m.role === 'user' ? 'User' : ''}: ${m.content}`)
      .join('\n\n') + (inputContent ? `\n\nUser: ${inputContent}` : '');

    try {
      const { sentiment, modelUsed } = await analyzeSentiment(combinedText, currentMood);
      setCurrentSentiment(sentiment);

      // Save to session document
      await updateSessionSentiment(user.uid, session.id, sentiment);

      const breakdownText = sentiment.emotionBreakdown
        .map((e) => `• ${e.emotion}: ${e.percentage}%`)
        .join('\n');

      await addMessage(user.uid, session.id, {
        role: 'model',
        content: `**🌱 Sentiment & Emotional Telemetry:**\n\n- **Polarity Score**: ${sentiment.overallScore >= 0 ? `+${sentiment.overallScore.toFixed(2)}` : sentiment.overallScore.toFixed(2)} (${sentiment.primaryEmotion})\n- **Energy Level**: ${sentiment.energyLevel}\n\n**Emotion Composition:**\n${breakdownText}\n\n**Cognitive Insight:**\n${sentiment.cognitiveInsight}\n\n**Growth Opportunity:**\n${sentiment.growthOpportunity}`,
        actionType: 'sentiment',
        modelUsed,
      });

      setSuccessToast(`Sentiment analyzed: ${sentiment.primaryEmotion}`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      console.error('Sentiment error:', err);
      setErrorMessage(err?.message || 'Failed to analyze emotional sentiment.');
    } finally {
      setIsAiGenerating(false);
      setGeneratingAction(null);
    }
  };

  // Feature 3: Location Tagging
  const handleSaveLocation = async (tag: LocationTag | null) => {
    if (!tag) {
      // Clear location
      await updateSessionLocation(user.uid, session.id, {} as any);
      setCurrentLocation(undefined);
      setSuccessToast('Location tag removed.');
    } else {
      await updateSessionLocation(user.uid, session.id, tag);
      setCurrentLocation(tag);
      setSuccessToast(`Sanctuary pinned: ${tag.placeName}`);
    }
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Copy message content
  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Keyboard shortcut: Enter to send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentMoodObj = MOODS.find((m) => m.value === currentMood) || MOODS[1];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-stone-50/50">
      {/* Top Session Header */}
      <div className="shrink-0 border-b border-stone-200/80 bg-white px-4 sm:px-6 py-3.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 max-w-6xl mx-auto w-full">
          {/* Title and Editing */}
          <div className="flex items-center gap-3 shrink-0 pr-4 sm:pr-6">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 w-full max-w-md">
                <input
                  type="text"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  autoFocus
                  className="w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-1.5 text-sm font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={handleSaveTitle}
                  className="rounded-md bg-stone-900 p-1.5 text-stone-50 hover:bg-stone-800"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div 
                className="flex items-center gap-3 group cursor-pointer" 
                onClick={() => setIsEditingTitle(true)}
              >
                <h2 className="font-serif text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  {session.title}
                </h2>
                <button
                  id="rename-session-pencil-btn"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-stone-100/90 text-stone-700 shadow-2xs transition hover:bg-stone-200 hover:text-stone-900 hover:border-stone-300 active:scale-95 cursor-pointer"
                  title="Rename session"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditingTitle(true);
                  }}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick AI Action Toolbar - Moved to right with margin-left auto */}
          <div className="flex items-center flex-wrap gap-2 lg:justify-end ml-auto">
            {/* Mood Dropdown / Pill */}
            <div className="relative group">
              <button className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs ${currentMoodObj.color}`}>
                <span>{currentMoodObj.emoji}</span>
                <span>{currentMoodObj.label}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>

              <div className="absolute right-0 mt-1 hidden w-44 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl group-hover:block z-50">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase text-stone-600">
                  Select Current Mood
                </div>
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handleMoodSelect(m.value)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-left transition ${
                      currentMood === m.value ? 'bg-stone-100 font-semibold text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summarize Action */}
            <button
              id="chat-summarize-btn"
              onClick={handleGenerateSummary}
              disabled={isAiGenerating || messages.length === 0}
              className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Summarize key thoughts, moments, and next steps"
            >
              <FileText className="h-3.5 w-3.5 text-amber-700" />
              <span>Summarize</span>
            </button>

            {/* Reflect Action */}
            <button
              id="chat-reflect-btn"
              onClick={handleGenerateReflectQuestions}
              disabled={isAiGenerating || messages.length === 0}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Receive thoughtful, open-ended reflection prompts"
            >
              <Compass className="h-3.5 w-3.5 text-stone-600" />
              <span>Reflect</span>
            </button>

            {/* Brainstorm Action */}
            <button
              id="chat-brainstorm-btn"
              onClick={handleBrainstormIdeas}
              disabled={isAiGenerating || messages.length === 0}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Brainstorm realistic, encouraging perspectives"
            >
              <Lightbulb className="h-3.5 w-3.5 text-stone-600" />
              <span>Brainstorm</span>
            </button>

            {/* Feature 2: Extract Tasks Action */}
            <button
              id="chat-extract-tasks-btn"
              onClick={handleExtractActions}
              disabled={isAiGenerating || (messages.length === 0 && !inputContent.trim())}
              className="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-900 hover:bg-indigo-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              title="Extract actionable milestones & save to Tasks"
            >
              <ListTodo className="h-3.5 w-3.5 text-indigo-600" />
              <span>Extract Tasks</span>
            </button>

            {/* Feature 1: Analyze Tone Action */}
            <button
              id="chat-sentiment-btn"
              onClick={handleAnalyzeSentiment}
              disabled={isAiGenerating || (messages.length === 0 && !inputContent.trim())}
              className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1 text-xs font-medium text-teal-900 hover:bg-teal-100 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              title="Evaluate emotional arc and sentiment score"
            >
              <Activity className="h-3.5 w-3.5 text-teal-700" />
              <span>Analyze Tone</span>
            </button>

            {/* Feature 3: Pin Location Action */}
            <button
              id="chat-location-btn"
              onClick={() => setShowLocationModal(true)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs ${
                currentLocation
                  ? 'border-amber-300 bg-amber-100 text-amber-950 font-semibold'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
              }`}
              title="Pin and ground sanctuary location"
            >
              <MapPin className="h-3.5 w-3.5 text-amber-700" />
              <span className="max-w-[120px] truncate">
                {currentLocation ? currentLocation.placeName : 'Pin Location'}
              </span>
            </button>

            {/* View Summary if exists */}
            {currentSummary && (
              <button
                onClick={() => setShowSummaryModal(true)}
                className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-800 hover:bg-stone-200 transition"
              >
                <BookOpen className="h-3.5 w-3.5 text-stone-600" />
                <span>View Summary</span>
              </button>
            )}

            {/* Full Screen / Collapse Composer Toggle Button */}
            <button
              id="chat-toggle-fullscreen-btn"
              onClick={() => {
                setIsComposerCollapsed(!isComposerCollapsed);
                if (isComposerCollapsed) {
                  setTimeout(() => textareaRef.current?.focus(), 150);
                }
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition shadow-2xs cursor-pointer ${
                isComposerCollapsed
                  ? 'border-amber-300 bg-amber-100 text-amber-950 font-semibold'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
              }`}
              title={isComposerCollapsed ? "Press Up Arrow to show reflection input" : "Press Down Arrow for full screen reading view"}
            >
              {isComposerCollapsed ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5 text-amber-700" />
                  <span>Show Input</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5 text-stone-600" />
                  <span>Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sub-bar showing pinned location & active sentiment pills */}
        {(currentLocation || currentSentiment || successToast) && (
          <div className="max-w-5xl mx-auto mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {currentLocation && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] text-stone-700">
                  <MapPin className="h-3 w-3 text-amber-700" />
                  <span>Sanctuary: <strong>{currentLocation.placeName}</strong></span>
                  {currentLocation.isFuzzed && (
                    <span className="text-[10px] text-stone-500">[Fuzzed ~1km]</span>
                  )}
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="ml-1 text-[10px] text-amber-800 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}

              {currentSentiment && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 px-2.5 py-1 text-[11px] text-teal-900">
                  <Activity className="h-3 w-3 text-teal-700" />
                  <span>
                    Tone: <strong>{currentSentiment.primaryEmotion}</strong> ({currentSentiment.overallScore >= 0 ? `+${currentSentiment.overallScore.toFixed(2)}` : currentSentiment.overallScore.toFixed(2)}) • {currentSentiment.energyLevel} Energy
                  </span>
                </div>
              )}
            </div>

            {successToast && (
              <div className="inline-flex items-center gap-1.5 text-emerald-800 font-medium text-[11px] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>{successToast}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="shrink-0 bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Conversation Thread / Message Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* Empty State / Welcome in New Session */}
        {messages.length === 0 && (
          <div className="my-8 rounded-3xl border border-stone-200/90 bg-white/90 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 text-amber-900 shadow-2xs mb-4">
              <Sparkles className="h-7 w-7 text-amber-700" />
            </div>
            <h3 className="font-serif text-xl font-bold text-stone-900">
              Welcome to your private reflection space
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-stone-600 leading-relaxed">
              Write whatever is resting on your mind—a triumph, a heavy thought, a question, or a quiet moment from today. Gemini will listen and offer gentle perspective.
            </p>

            {/* Quick Prompt Starters */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => handleSendMessage("Today, I'm feeling a little overwhelmed by everything on my plate.")}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition text-left"
              >
                "I'm feeling a little overwhelmed by everything..."
              </button>
              <button
                onClick={() => handleSendMessage("Something went surprisingly well today that I'm grateful for.")}
                className="rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition text-left"
              >
                "Something went surprisingly well today..."
              </button>
              <button
                onClick={handleGetDailyPrompt}
                className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition"
              >
                ✨ Give me an introspective prompt
              </button>
            </div>
          </div>
        )}

        {/* Message Items */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Avatar on left for Gemini */}
              {!isUser && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200/80 shadow-2xs mt-1">
                  <Sparkles className="h-4 w-4 text-amber-700" />
                </div>
              )}

              {/* Message Bubble Card */}
              <div
                className={`group relative max-w-[85%] sm:max-w-2xl rounded-2xl p-4 sm:p-5 shadow-xs transition-all ${
                  isUser
                    ? 'bg-stone-900 text-stone-50 rounded-tr-xs'
                    : 'bg-white border border-stone-200/80 text-stone-800 rounded-tl-xs'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-4 mb-2">
                  <span className={`text-[11px] font-semibold ${isUser ? 'text-amber-200' : 'text-stone-900'}`}>
                    {isUser ? (user.displayName || 'You') : 'Aura (Reflection)'}
                  </span>

                  <div className="flex items-center gap-2 text-[10px] opacity-60">
                    <span>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="opacity-0 group-hover:opacity-100 transition hover:text-amber-400 p-0.5"
                      title="Copy text"
                    >
                      {copiedMessageId === msg.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Rendered */}
                {isUser ? (
                  <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed text-stone-800 font-sans space-y-3 prose prose-stone max-w-none">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                )}

                {/* Action Badge if specific action */}
                {msg.actionType && msg.actionType !== 'chat' && !isUser && (
                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center gap-1.5 text-[10px] text-stone-600 font-medium">
                    <Sparkles className="h-3 w-3 text-amber-600" />
                    <span>AI {msg.actionType.toUpperCase()}</span>
                    {msg.modelUsed && <span className="opacity-60">• {msg.modelUsed}</span>}
                  </div>
                )}
              </div>

              {/* User Avatar on right */}
              {isUser && (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-200 text-stone-700 border border-stone-300 mt-1 text-xs font-semibold">
                  {(user.displayName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          );
        })}

        {/* Typing / Contemplative Indicator */}
        {isAiGenerating && (
          <div className="flex gap-3.5 justify-start">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 border border-amber-200 mt-1">
              <Sparkles className="h-4 w-4 animate-spin text-amber-700" />
            </div>
            <div className="rounded-2xl rounded-tl-xs bg-white border border-stone-200/80 p-4 shadow-xs text-stone-600 text-xs flex items-center gap-3">
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-bounce"></div>
              </div>
              <span className="italic">
                Aura is {generatingAction || 'contemplating your reflection'}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Zone (Collapsible with Down/Up Arrow for Full Screen View) */}
      {isComposerCollapsed ? (
        <div 
          onClick={() => {
            setIsComposerCollapsed(false);
            setTimeout(() => textareaRef.current?.focus(), 150);
          }}
          className="shrink-0 border-t border-stone-200/90 bg-white/95 backdrop-blur-xs py-2.5 px-4 sm:px-6 shadow-md transition-all animate-in slide-in-from-bottom duration-200 cursor-pointer hover:bg-stone-50/90"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium">Full screen reflection view active</span>
              <span className="text-stone-400 hidden sm:inline">•</span>
              <span className="text-stone-500 hidden sm:inline">Press the up arrow to open the writing composer</span>
            </div>

            {/* UP ARROW BUTTON TO EXPAND COMPOSER */}
            <button
              id="expand-composer-up-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsComposerCollapsed(false);
                setTimeout(() => textareaRef.current?.focus(), 150);
              }}
              className="flex items-center gap-2 rounded-full bg-stone-900 text-stone-50 px-4 py-1.5 text-xs font-semibold shadow-sm hover:bg-stone-800 active:scale-95 transition cursor-pointer group"
              title="Press Up Arrow to open reflection input"
            >
              <ChevronUp className="h-4 w-4 text-amber-300 group-hover:-translate-y-0.5 transition-transform" />
              <span>Write Reflection</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 border-t border-stone-200/80 bg-white p-4 sm:p-5 relative transition-all">
          <div className="max-w-4xl mx-auto">
            {/* Quick mood chips bar with Down Arrow button */}
            <div className="flex items-center justify-between pb-2 text-xs text-stone-600 gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                <span className="text-[11px] font-medium text-stone-600 mr-1">Mood:</span>
                {MOODS.slice(0, 5).map((m) => (
                  <button
                    key={m.value}
                    onClick={() => handleMoodSelect(m.value)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] transition cursor-pointer ${
                      currentMood === m.value
                        ? 'bg-stone-900 text-stone-50 font-medium'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="text-[11px] text-stone-600 hidden md:block">
                  Press <kbd className="px-1 py-0.5 rounded bg-stone-100 border text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-stone-100 border text-[10px]">Shift+Enter</kbd> for newline
                </div>

                {/* DOWN ARROW BUTTON TO COLLAPSE TO FULL SCREEN */}
                <button
                  id="collapse-composer-down-btn"
                  onClick={() => setIsComposerCollapsed(true)}
                  className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1 text-xs font-medium transition active:scale-95 shadow-2xs cursor-pointer group"
                  title="Collapse input box so full screen will be visible (Down Arrow)"
                >
                  <span className="text-[11px] font-medium">Full Screen</span>
                  <ChevronDown className="h-4 w-4 text-stone-600 group-hover:translate-y-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Textarea Container */}
            <div className="relative rounded-2xl border border-stone-300 bg-stone-50/50 p-2 focus-within:border-stone-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-stone-200 transition shadow-inner">
              <textarea
                id="journal-input-textarea"
                ref={textareaRef}
                rows={3}
                value={inputContent}
                onChange={(e) => {
                  setInputContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="What feels important today? Share your thoughts, events, or questions..."
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 px-2">
                <span className="text-[11px] text-stone-600">
                  {inputContent.trim().length} characters
                </span>

                <div className="flex items-center gap-2">
                  <button
                    id="journal-send-btn"
                    onClick={() => handleSendMessage()}
                    disabled={!inputContent.trim() || isAiGenerating}
                    className="flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 shadow-sm transition hover:bg-stone-800 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <span>Reflect</span>
                    <Send className="h-3.5 w-3.5 text-amber-300" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <FileText className="h-5 w-5 text-amber-800" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    Session Reflection Summary
                  </h3>
                  <p className="text-xs text-stone-500">
                    Synthesized from your journal entries
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-sm text-stone-800 space-y-4 prose prose-stone max-w-none leading-relaxed">
              <Markdown>{currentSummary || 'No summary generated yet.'}</Markdown>
            </div>

            <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                onClick={() => {
                  if (currentSummary) {
                    navigator.clipboard.writeText(currentSummary);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Summary</span>
              </button>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Feature 3: Location Tagging Modal */}
      <LocationTagModal
        isOpen={showLocationModal}
        currentLocation={currentLocation}
        onClose={() => setShowLocationModal(false)}
        onSaveLocation={handleSaveLocation}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { JournalSession, SentimentAnalysis, UserProfile, JournalMessage } from '../types';
import {
  Sparkles,
  TrendingUp,
  Brain,
  Compass,
  Heart,
  Activity,
  Smile,
  Zap,
  Calendar,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  BarChart2,
  CheckCircle2,
  TrendingDown,
  Sun,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { analyzeSentiment } from '../lib/api';
import { updateSessionSentiment, getSessionMessages } from '../lib/firebase';

interface SentimentAnalyticsViewProps {
  user: UserProfile;
  sessions: JournalSession[];
  onOpenSession: (sessionId: string) => void;
  onNewJournal: () => void;
}

export const SentimentAnalyticsView: React.FC<SentimentAnalyticsViewProps> = ({
  user,
  sessions,
  onOpenSession,
  onNewJournal,
}) => {
  const [analyzingSessionId, setAnalyzingSessionId] = useState<string | null>(null);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter sessions that have sentiment analysis
  const sessionsWithSentiment = useMemo(() => {
    return sessions.filter((s) => !!s.sentiment);
  }, [sessions]);

  // Unanalyzed sessions
  const unanalyzedSessions = useMemo(() => {
    return sessions.filter((s) => !s.sentiment);
  }, [sessions]);

  // Sort chronological for trajectory chart (oldest to newest)
  const chronologicalSentimentSessions = useMemo(() => {
    return [...sessionsWithSentiment].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [sessionsWithSentiment]);

  // Calculate aggregated stats
  const averagePolarity = useMemo(() => {
    if (sessionsWithSentiment.length === 0) return 0;
    const sum = sessionsWithSentiment.reduce((acc, s) => acc + (s.sentiment?.overallScore || 0), 0);
    return sum / sessionsWithSentiment.length;
  }, [sessionsWithSentiment]);

  // Aggregate emotions across entries
  const emotionAggregates = useMemo(() => {
    const map: Record<string, number> = {};
    sessionsWithSentiment.forEach((s) => {
      s.sentiment?.emotionBreakdown?.forEach((eb) => {
        map[eb.emotion] = (map[eb.emotion] || 0) + eb.percentage;
      });
    });
    return Object.entries(map)
      .map(([emotion, total]) => ({
        emotion,
        average: Math.round(total / (sessionsWithSentiment.length || 1)),
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 6);
  }, [sessionsWithSentiment]);

  // Mood frequency count
  const moodBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; totalScore: number }> = {};
    sessions.forEach((s) => {
      const mood = s.mood || 'reflective';
      if (!counts[mood]) counts[mood] = { count: 0, totalScore: 0 };
      counts[mood].count += 1;
      if (s.sentiment?.overallScore !== undefined) {
        counts[mood].totalScore += s.sentiment.overallScore;
      }
    });

    return Object.entries(counts).map(([mood, data]) => ({
      mood,
      count: data.count,
      percentage: Math.round((data.count / (sessions.length || 1)) * 100),
      avgScore: data.count > 0 ? (data.totalScore / data.count).toFixed(2) : '0.00',
    }));
  }, [sessions]);

  // Energy levels composition
  const energyLevels = useMemo(() => {
    const levels: Record<string, number> = { Calm: 0, Moderate: 0, High: 0, Low: 0 };
    let total = 0;
    sessionsWithSentiment.forEach((s) => {
      const el = s.sentiment?.energyLevel || 'Calm';
      levels[el] = (levels[el] || 0) + 1;
      total += 1;
    });

    return {
      Calm: total > 0 ? Math.round((levels.Calm / total) * 100) : 0,
      Moderate: total > 0 ? Math.round((levels.Moderate / total) * 100) : 0,
      High: total > 0 ? Math.round((levels.High / total) * 100) : 0,
      Low: total > 0 ? Math.round((levels.Low / total) * 100) : 0,
    };
  }, [sessionsWithSentiment]);

  // Score descriptor helper
  const getScoreDescriptor = (score: number) => {
    if (score >= 0.6) return { label: 'Vibrantly Uplifted & Optimistic', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (score >= 0.2) return { label: 'Gentle Warmth & Constructive Growth', color: 'text-teal-700 bg-teal-50 border-teal-200' };
    if (score >= -0.2) return { label: 'Equanimous & Contemplative', color: 'text-amber-800 bg-amber-50 border-amber-200' };
    if (score >= -0.6) return { label: 'Tender Vulnerability & Processing', color: 'text-orange-800 bg-orange-50 border-orange-200' };
    return { label: 'Deep Stress or Overwhelm', color: 'text-rose-800 bg-rose-50 border-rose-200' };
  };

  const overallDesc = getScoreDescriptor(averagePolarity);

  // Trigger sentiment analysis on an individual session
  const handleAnalyzeSession = async (session: JournalSession) => {
    if (!user.uid) return;
    setAnalyzingSessionId(session.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Gather full reflection context from Firestore
      let textToAnalyze = `${session.title}. ${session.preview || ''}`;
      try {
        const msgs = await getSessionMessages(user.uid, session.id);
        const userText = msgs.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n');
        if (userText) textToAnalyze = `${session.title}\n\n${userText}`;
      } catch (err) {
        console.warn('Could not read messages for sentiment, using preview:', err);
      }

      const res = await analyzeSentiment(textToAnalyze, session.mood || 'reflective');
      await updateSessionSentiment(user.uid, session.id, res.sentiment);
      setSuccessMessage(`Sentiment telemetry analyzed for "${session.title}"!`);
    } catch (err: any) {
      console.error('Sentiment analysis error:', err);
      setErrorMessage(err?.message || 'Could not complete sentiment analysis.');
    } finally {
      setAnalyzingSessionId(null);
    }
  };

  // Batch analyze all unscored entries
  const handleBatchAnalyzeAll = async () => {
    if (!user.uid || unanalyzedSessions.length === 0) return;

    setBatchAnalyzing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setBatchProgress({ current: 0, total: unanalyzedSessions.length });

    let completed = 0;
    for (const session of unanalyzedSessions) {
      try {
        let textToAnalyze = `${session.title}. ${session.preview || ''}`;
        try {
          const msgs = await getSessionMessages(user.uid, session.id);
          const userText = msgs.filter((m) => m.role === 'user').map((m) => m.content).join('\n\n');
          if (userText) textToAnalyze = `${session.title}\n\n${userText}`;
        } catch (e) {
          // fallback
        }

        const res = await analyzeSentiment(textToAnalyze, session.mood || 'reflective');
        await updateSessionSentiment(user.uid, session.id, res.sentiment);
        completed += 1;
        setBatchProgress({ current: completed, total: unanalyzedSessions.length });
      } catch (err: any) {
        console.warn(`Failed to analyze session ${session.id}:`, err);
      }
    }

    setBatchAnalyzing(false);
    setBatchProgress(null);
    setSuccessMessage(`Successfully synthesized emotional telemetry for ${completed} journal entries!`);
  };

  // Trajectory chart calculation
  const chartPoints = useMemo(() => {
    if (chronologicalSentimentSessions.length === 0) return [];
    const count = chronologicalSentimentSessions.length;
    const width = 800;
    const height = 180;
    const paddingX = 40;
    const paddingY = 30;

    return chronologicalSentimentSessions.map((sess, idx) => {
      const score = sess.sentiment?.overallScore || 0; // -1.0 to 1.0
      const x = count === 1 ? width / 2 : paddingX + (idx / (count - 1)) * (width - 2 * paddingX);
      // Map score (-1 to 1) to y (height - paddingY to paddingY)
      const normalizedScore = (score + 1) / 2; // 0 to 1
      const y = height - paddingY - normalizedScore * (height - 2 * paddingY);
      return {
        session: sess,
        x,
        y,
        score,
        date: new Date(sess.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      };
    });
  }, [chronologicalSentimentSessions]);

  const svgPath = useMemo(() => {
    if (chartPoints.length === 0) return '';
    if (chartPoints.length === 1) return `M ${chartPoints[0].x} ${chartPoints[0].y}`;
    return chartPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');
  }, [chartPoints]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Header Banner */}
      <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-800">
              <Sparkles className="h-4 w-4" />
              <span>MindPulse Sentiment & Emotional Intelligence</span>
            </div>
            <h1 className="mt-1 font-serif text-2xl font-bold text-stone-900 sm:text-3xl">
              Sentiment Pulse & Emotional Arc
            </h1>
            <p className="mt-1.5 text-sm text-stone-600 leading-relaxed">
              Track your emotional valence, tone trajectory, and cognitive patterns synthesized across all your private Firestore reflections with Gemini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {unanalyzedSessions.length > 0 && (
              <button
                id="batch-analyze-btn"
                onClick={handleBatchAnalyzeAll}
                disabled={batchAnalyzing}
                className="flex items-center gap-2 rounded-2xl bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-teal-800 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Synthesize sentiment for all unscored reflections"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${batchAnalyzing ? 'animate-spin' : ''}`} />
                <span>
                  {batchAnalyzing
                    ? `Analyzing (${batchProgress?.current || 0}/${batchProgress?.total || 0})...`
                    : `Analyze Remaining (${unanalyzedSessions.length})`}
                </span>
              </button>
            )}

            <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Private & Owner-Bound</span>
            </div>
          </div>
        </div>

        {/* Polarity Needle & Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-stone-100">
          {/* Average Polarity Meter */}
          <div className="rounded-2xl bg-stone-50/80 p-4 border border-stone-200/70">
            <span className="text-xs font-medium text-stone-500 block">Overall Emotional Polarity</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-stone-900">
                {averagePolarity >= 0 ? `+${averagePolarity.toFixed(2)}` : averagePolarity.toFixed(2)}
              </span>
              <span className="text-xs text-stone-500">(-1.0 to +1.0)</span>
            </div>
            <div className="mt-2.5 w-full bg-stone-200 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-teal-600 h-full transition-all duration-700 rounded-full"
                style={{ width: `${Math.max(5, Math.min(95, ((averagePolarity + 1) / 2) * 100))}%` }}
              />
            </div>
            <p className="mt-2.5 text-[11px] font-medium text-stone-700">
              <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] ${overallDesc.color}`}>
                {overallDesc.label}
              </span>
            </p>
          </div>

          {/* Analyzed entries ratio */}
          <div className="rounded-2xl bg-stone-50/80 p-4 border border-stone-200/70">
            <span className="text-xs font-medium text-stone-500 block">Analyzed Reflections</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-stone-900">
                {sessionsWithSentiment.length}
              </span>
              <span className="text-xs text-stone-500">of {sessions.length} journals</span>
            </div>
            <p className="mt-2 text-xs text-stone-600 leading-relaxed">
              {sessions.length === 0
                ? 'No journal entries yet.'
                : `${Math.round((sessionsWithSentiment.length / (sessions.length || 1)) * 100)}% of your journal archive has emotional telemetry.`}
            </p>
          </div>

          {/* Prevailing Energy & Mood */}
          <div className="rounded-2xl bg-teal-50/60 p-4 border border-teal-200/60">
            <span className="text-xs font-medium text-teal-900 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-teal-700" />
              <span>Prevailing State</span>
            </span>
            <p className="font-serif text-2xl font-bold text-stone-900 mt-2">
              {emotionAggregates[0]?.emotion || 'Contemplative'}
            </p>
            <p className="mt-1 text-xs text-stone-600">
              Primary emotional frequency detected across your written sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="rounded-2xl border border-teal-200 bg-teal-50/90 p-4 text-xs font-medium text-teal-900 flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs font-semibold text-teal-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-semibold text-rose-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Visual Chart: Emotional Trajectory Arc Over Time */}
      <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-700" />
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Emotional Trajectory Timeline
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Valence curve tracking emotional elevation from earliest to latest reflections.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Optimistic (+1.0)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-stone-400" />
              <span>Equanimous (0.0)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Challenged (-1.0)</span>
            </span>
          </div>
        </div>

        {chronologicalSentimentSessions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center bg-stone-50/50">
            <BarChart2 className="h-8 w-8 text-stone-300 mx-auto stroke-1" />
            <p className="text-xs text-stone-500 mt-2">
              No analyzed journal sessions available to graph.
            </p>
            {unanalyzedSessions.length > 0 ? (
              <button
                onClick={handleBatchAnalyzeAll}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Analyze All Journals Now</span>
              </button>
            ) : (
              <button
                onClick={onNewJournal}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Write First Entry</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox="0 0 800 180"
              className="w-full h-44 sm:h-52 overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Neutral baseline (y = 90) */}
              <line
                x1="20"
                y1="90"
                x2="780"
                y2="90"
                stroke="#e7e5e4"
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />

              {/* Zero valence label */}
              <text x="25" y="86" fill="#a8a29e" fontSize="10" fontFamily="sans-serif">
                Balanced (0.0)
              </text>

              {/* Area Gradient fill */}
              <defs>
                <linearGradient id="valenceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Connecting Line */}
              {chartPoints.length > 1 && (
                <path
                  d={svgPath}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Nodes */}
              {chartPoints.map((pt, idx) => {
                const isPositive = pt.score >= 0;
                const nodeColor = pt.score >= 0.4 ? '#10b981' : pt.score >= 0 ? '#14b8a6' : pt.score >= -0.3 ? '#f59e0b' : '#f43f5e';
                return (
                  <g key={pt.session.id} className="cursor-pointer group" onClick={() => onOpenSession(pt.session.id)}>
                    {/* Pulsing ring on hover */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="9"
                      fill={nodeColor}
                      fillOpacity="0.2"
                      className="group-hover:scale-125 transition-transform"
                    />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4.5"
                      fill={nodeColor}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Date label underneath */}
                    <text
                      x={pt.x}
                      y="165"
                      textAnchor="middle"
                      fill="#78716c"
                      fontSize="9.5"
                      fontWeight="500"
                    >
                      {pt.date}
                    </text>

                    {/* Tooltip on hover */}
                    <title>
                      {`${pt.session.title}\nScore: ${pt.score >= 0 ? '+' : ''}${pt.score.toFixed(2)}\nEmotion: ${pt.session.sentiment?.primaryEmotion || 'Reflective'}`}
                    </title>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Mood Summary Cards & Energy Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood Distribution Cards */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
              <Smile className="h-4 w-4 text-amber-700" />
              <span>Mood Composition & Frequency</span>
            </h3>
            <span className="text-xs text-stone-500 font-medium">
              {sessions.length} total reflections
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {moodBreakdown.map((item) => (
              <div
                key={item.mood}
                className="rounded-2xl border border-stone-200/70 bg-stone-50/70 p-3.5 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold capitalize text-stone-900">
                    {item.mood}
                  </span>
                  <span className="text-[11px] font-bold text-teal-800">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Avg Valence: <span className="font-semibold text-stone-700">{item.avgScore}</span>
                </p>
                <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-teal-600 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Energy Levels Breakdown */}
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-teal-700" />
            <span>Energy Telemetry</span>
          </h3>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                <span>Calm / Serene</span>
                <span className="text-teal-700">{energyLevels.Calm}%</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-teal-600 rounded-full" style={{ width: `${energyLevels.Calm}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                <span>Moderate Energy</span>
                <span className="text-amber-700">{energyLevels.Moderate}%</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600 rounded-full" style={{ width: `${energyLevels.Moderate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                <span>High Vibrancy</span>
                <span className="text-emerald-700">{energyLevels.High}%</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${energyLevels.High}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-stone-800 mb-1">
                <span>Low / Depleted</span>
                <span className="text-rose-700">{energyLevels.Low}%</span>
              </div>
              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full" style={{ width: `${energyLevels.Low}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Emotion Breakdown Bars */}
      {emotionAggregates.length > 0 && (
        <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs">
          <h3 className="font-serif text-lg font-bold text-stone-900 flex items-center gap-2">
            <Heart className="h-4 w-4 text-rose-600" />
            <span>Harmonic Emotional Composition</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Aggregated relative percentage of emotional states detected across all analyzed journal entries:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-5">
            {emotionAggregates.map((item) => (
              <div key={item.emotion} className="rounded-2xl bg-stone-50 p-3.5 border border-stone-200/60 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-stone-800">
                  <span>{item.emotion}</span>
                  <span className="text-teal-800">{item.average}%</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-700 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, item.average * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Entries Sentiment Records Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-stone-900">
            Journal Telemetry Feed
          </h3>
          <span className="text-xs text-stone-500">
            Showing {sessions.length} entries
          </span>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white/60 p-8 text-center">
            <p className="text-xs text-stone-500">No journal sessions recorded yet.</p>
            <button
              onClick={onNewJournal}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Create First Entry</span>
            </button>
          </div>
        ) : (
          sessions.map((sess) => {
            const sent = sess.sentiment;
            const isAnalyzing = analyzingSessionId === sess.id;
            return (
              <div
                key={sess.id}
                className="rounded-2xl border border-stone-200/80 bg-white p-4.5 hover:border-stone-300 transition shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium text-stone-900 text-sm">{sess.title}</h4>
                      {sent ? (
                        <span className="text-[10px] rounded-md px-2 py-0.5 bg-teal-100 text-teal-900 font-semibold">
                          Valence: {sent.overallScore >= 0 ? `+${sent.overallScore.toFixed(2)}` : sent.overallScore.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[10px] rounded-md px-2 py-0.5 bg-stone-100 text-stone-600 font-medium">
                          Unanalyzed
                        </span>
                      )}
                      <span className="text-[10px] text-stone-400 capitalize">
                        Mood: {sess.mood || 'Reflective'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-1">{sess.preview || 'Contemplative reflection entry...'}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!sent ? (
                      <button
                        onClick={() => handleAnalyzeSession(sess)}
                        disabled={isAnalyzing}
                        className="flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 disabled:opacity-50 cursor-pointer"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-teal-700" />
                        <span>{isAnalyzing ? 'Analyzing...' : 'Analyze Tone'}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAnalyzeSession(sess)}
                        disabled={isAnalyzing}
                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                        title="Re-run sentiment analysis"
                      >
                        <RotateCcw className={`h-3.5 w-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      </button>
                    )}

                    <button
                      onClick={() => onOpenSession(sess.id)}
                      className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 rounded-lg px-2.5 py-1.5 hover:bg-stone-100 cursor-pointer"
                    >
                      <span>Open</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* If sentiment exists for this session, display deep cognitive insight */}
                {sent && (
                  <div className="mt-3.5 pt-3.5 border-t border-stone-100 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-stone-50 rounded-xl p-2.5">
                      <span className="font-semibold text-stone-700 block text-[10px] uppercase tracking-wide">
                        Primary Tone & Energy
                      </span>
                      <p className="text-stone-900 font-medium mt-0.5">
                        {sent.primaryEmotion} • {sent.energyLevel} Energy
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {sent.emotionBreakdown.map((eb) => (
                          <span key={eb.emotion} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                            {eb.emotion}: {eb.percentage}%
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-stone-50 rounded-xl p-2.5">
                      <span className="font-semibold text-stone-700 block text-[10px] uppercase tracking-wide flex items-center gap-1">
                        <Brain className="h-3 w-3 text-teal-700" />
                        <span>Cognitive Insight</span>
                      </span>
                      <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">
                        {sent.cognitiveInsight}
                      </p>
                    </div>

                    <div className="bg-teal-50/70 rounded-xl p-2.5 border border-teal-200/50">
                      <span className="font-semibold text-teal-900 block text-[10px] uppercase tracking-wide flex items-center gap-1">
                        <Compass className="h-3 w-3 text-teal-700" />
                        <span>Growth Opportunity</span>
                      </span>
                      <p className="text-stone-700 text-xs mt-0.5 leading-relaxed">
                        {sent.growthOpportunity}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

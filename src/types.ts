export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export type JournalMood =
  | 'calm'
  | 'reflective'
  | 'grateful'
  | 'anxious'
  | 'overwhelmed'
  | 'inspired'
  | 'tired'
  | 'hopeful';

export interface JournalMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  actionType?: 'chat' | 'reflect' | 'brainstorm' | 'summary' | 'prompt' | 'sentiment' | 'tasks';
  modelUsed?: string;
}

export interface SessionSummary {
  mainTopic?: string;
  keyThoughts?: string[];
  importantConcerns?: string[];
  positiveMoments?: string[];
  nextSteps?: string[];
  rawText: string;
  generatedAt: number;
}

export interface EmotionShare {
  emotion: string;
  percentage: number;
  color?: string;
}

export interface SentimentAnalysis {
  overallScore: number; // -1.0 to 1.0
  primaryEmotion: string;
  emotionBreakdown: EmotionShare[];
  energyLevel: 'Calm' | 'Low' | 'Moderate' | 'High';
  keyDrivers: string[];
  cognitiveInsight: string;
  growthOpportunity: string;
  analyzedAt: number;
}

export interface ActionTask {
  id: string;
  userId: string;
  sessionId?: string;
  sessionTitle?: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  category: 'Personal' | 'Career' | 'Wellness' | 'Learning' | 'General';
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: number;
  completedAt?: number;
  context?: string;
  suggestedTimeframe?: string;
}

export interface LocationTag {
  placeName: string;
  neighborhood?: string;
  city?: string;
  country?: string;
  fuzzedLat?: number;
  fuzzedLng?: number;
  isFuzzed: boolean;
  taggedAt: number;
}

export interface JournalSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mood?: JournalMood;
  messageCount: number;
  preview?: string;
  summary?: SessionSummary | string;
  tags?: string[];
  location?: LocationTag;
  sentiment?: SentimentAnalysis;
}

export type ActiveView =
  | 'dashboard'
  | 'new-journal'
  | 'journal-detail'
  | 'history'
  | 'tasks'
  | 'analytics'
  | 'security';

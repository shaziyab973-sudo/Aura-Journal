import { JournalMessage } from '../types';

export interface ChatResponse {
  reply: string;
  modelUsed: string;
  timestamp: number;
}

export interface ActionResponse {
  action: string;
  result: string;
  modelUsed: string;
  timestamp: number;
}

/**
 * Sends conversation messages to the server-side Gemini proxy
 */
export async function sendChatMessage(
  messages: JournalMessage[],
  currentEntry: string,
  mood: string = 'reflective'
): Promise<ChatResponse> {
  const response = await fetch('/api/gemini/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      currentEntry,
      mood,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status}): Failed to generate AI reflection.`);
  }

  return response.json();
}

/**
 * Triggers dedicated AI reflection actions: summarize, reflect, brainstorm, prompt
 */
export async function executeAiAction(
  action: 'summarize' | 'reflect' | 'brainstorm' | 'prompt',
  entriesText: string,
  mood: string = 'reflective',
  topic: string = ''
): Promise<ActionResponse> {
  const response = await fetch('/api/gemini/action', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      entriesText,
      mood,
      topic,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status}): Failed to execute ${action}.`);
  }

  return response.json();
}

/**
 * Feature 1: AI Sentiment Analytics
 * Evaluates reflection tone, emotional breakdown, score, and key drivers
 */
export async function analyzeSentiment(
  text: string,
  mood: string = 'reflective'
): Promise<{ sentiment: import('../types').SentimentAnalysis; modelUsed: string }> {
  const response = await fetch('/api/gemini/sentiment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      mood,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status}): Failed to analyze sentiment.`);
  }

  return response.json();
}

/**
 * Feature 2: Action Item Extractor
 * Automatically identifies and structures actionable next steps from journal text
 */
export async function extractActionTasks(
  text: string,
  sessionTitle: string = 'Journal Reflection'
): Promise<{
  tasks: Array<{
    title: string;
    priority: 'low' | 'medium' | 'high';
    category: 'Personal' | 'Career' | 'Wellness' | 'Learning' | 'General';
    context?: string;
    suggestedTimeframe?: string;
  }>;
  modelUsed: string;
}> {
  const response = await fetch('/api/gemini/extract-tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      sessionTitle,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status}): Failed to extract action items.`);
  }

  return response.json();
}

/**
 * Feature 3: Location-Aware Tagging via Server-Side Proxy
 * Applies coordinate fuzzing and sanitization to protect user privacy
 */
export async function reverseGeocodeLocation(
  lat: number,
  lng: number
): Promise<import('../types').LocationTag> {
  const response = await fetch('/api/location/reverse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lat, lng }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status}): Failed to get location.`);
  }

  return response.json();
}

export async function searchLocations(
  query: string
): Promise<{ places: import('../types').LocationTag[] }> {
  const response = await fetch('/api/location/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error (${response.status}): Failed to search locations.`);
  }

  return response.json();
}

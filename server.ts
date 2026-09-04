import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

const PORT = 3000;
const app = express();

// 1. Mandatory Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Read Firebase applet configuration to share client-safe connection params
let firebaseConfig: Record<string, any> = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, "utf-8");
    firebaseConfig = JSON.parse(raw);
  }
} catch (err) {
  console.warn("Could not read firebase-applet-config.json on startup:", err);
}

// Resilient Model Fallback Ladder
// gemini-3.1-flash-lite provides unmatched high availability during global capacity spikes
// gemini-3.8-flash and gemini-3.6-flash provide deep text processing
const MODEL_FALLBACK_LADDER = [
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

// Reusable GoogleGenAI client accessor (lazy-initialized)
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({ apiKey });
}

// Standard helper implementation for resilient content generation
async function generateContentWithFallback(
  promptOrContents: any,
  systemInstruction?: string
): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptOrContents,
        config: {
          systemInstruction: systemInstruction || undefined,
          temperature: 0.7,
        },
      });

      const responseText = response.text?.trim() || "";
      if (responseText) {
        return { text: responseText, modelUsed: model };
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed with status/error:`, err?.message || err);
      // Brief pause if capacity spike to allow buffers to settle
      if (err?.message?.includes("503") || err?.message?.includes("429")) {
        await new Promise((r) => setTimeout(r, 200));
      }
      continue;
    }
  }

  throw new Error(`All models in fallback ladder failed. Last error: ${lastError?.message || "Unknown error"}`);
}

// Resilient Cognitive Heuristics for Offline & High-Demand Recovery
function computeHeuristicSentiment(text: string, mood: string) {
  const lower = text.toLowerCase();
  
  const positiveWords = [
    "grateful", "gratitude", "happy", "joy", "calm", "peace", "accomplished",
    "proud", "hopeful", "excited", "inspired", "love", "clarity", "relieved",
    "good", "great", "content", "blessed", "progress", "growth", "healing"
  ];
  const negativeWords = [
    "stressed", "stress", "anxious", "anxiety", "overwhelmed", "sad",
    "exhausted", "tired", "frustrated", "angry", "worried", "scared",
    "fear", "burned out", "lonely", "doubt", "hard", "pain", "struggling"
  ];
  
  let posCount = 0;
  let negCount = 0;
  
  positiveWords.forEach((w) => {
    if (lower.includes(w)) posCount++;
  });
  negativeWords.forEach((w) => {
    if (lower.includes(w)) negCount++;
  });
  
  let baseScore = 0.2;
  const moodLower = (mood || "").toLowerCase();
  if (["grateful", "inspired", "peaceful", "joyful"].includes(moodLower)) baseScore = 0.55;
  if (["stressed", "overwhelmed", "anxious", "down"].includes(moodLower)) baseScore = -0.45;
  
  const wordDiff = (posCount - negCount) * 0.12;
  const overallScore = Math.max(-0.9, Math.min(0.9, parseFloat((baseScore + wordDiff).toFixed(2))));
  
  let primaryEmotion = "Reflective";
  if (overallScore >= 0.4) primaryEmotion = "Grateful & Optimistic";
  else if (overallScore >= 0.1) primaryEmotion = "Thoughtful & Calm";
  else if (overallScore >= -0.3) primaryEmotion = "Contemplative";
  else primaryEmotion = "Vulnerable & Processing";
  
  const energyLevel = (posCount + negCount > 3)
    ? "Moderate"
    : (lower.includes("tired") || lower.includes("exhausted") ? "Low" : "Calm");
  
  return {
    overallScore,
    primaryEmotion,
    emotionBreakdown: [
      { emotion: primaryEmotion, percentage: 60 },
      { emotion: overallScore >= 0 ? "Curiosity" : "Vulnerability", percentage: 25 },
      { emotion: "Self-Awareness", percentage: 15 },
    ],
    energyLevel,
    keyDrivers: [
      mood ? `Current emotional state identified as "${mood}"` : "Daily reflection themes",
      posCount > 0 ? "Noted positive reflections & gratitude" : "Navigating current life commitments",
    ],
    cognitiveInsight: "A thoughtful introspective reflection highlighting your commitment to self-awareness and mindful processing.",
    growthOpportunity: "Take a quiet moment to honor how much you are navigating today, and grant yourself permission to proceed step by step.",
    analyzedAt: Date.now(),
  };
}

function extractHeuristicTasks(text: string, sessionTitle: string) {
  const lines = text.split(/\n+/);
  const tasks: Array<{
    title: string;
    priority: "low" | "medium" | "high";
    category: "Personal" | "Career" | "Wellness" | "Learning" | "General";
    context: string;
    suggestedTimeframe: string;
  }> = [];

  const taskRegex = /(?:need to|have to|plan to|will|should|must|remember to|todo|task|action)\s+([^.!?\n]{5,75})/gi;
  
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*•\d.]+\s*/, "");
    let match;
    while ((match = taskRegex.exec(trimmed)) !== null) {
      if (tasks.length < 4 && match[1] && match[1].trim().length > 5) {
        const title = match[1].trim();
        tasks.push({
          title: title.slice(0, 70),
          priority: "medium",
          category: /work|job|project|deadline|email/i.test(title)
            ? "Career"
            : /walk|sleep|rest|meditate|health|water/i.test(title)
            ? "Wellness"
            : "Personal",
          context: `Noted from reflection: "${sessionTitle}"`,
          suggestedTimeframe: "This week",
        });
      }
    }
  }

  if (tasks.length === 0) {
    tasks.push({
      title: "Dedicate 10 minutes to quiet pause and hydration",
      priority: "low",
      category: "Wellness",
      context: `Gentle restorative intention following "${sessionTitle}"`,
      suggestedTimeframe: "Today",
    });
    tasks.push({
      title: "Review insights and feelings logged in today's entry",
      priority: "medium",
      category: "Personal",
      context: "Revisit your reflections to ground your evening thoughts",
      suggestedTimeframe: "Upcoming weekend",
    });
  }

  return tasks;
}

function generateHeuristicReflection(content: string, mood: string): string {
  return `Thank you for taking the space to write this reflection. It sounds like you are navigating a meaningful moment with honest self-awareness.

${mood ? `Noting that you are feeling **${mood}**, it is natural for moments like this to invite deeper contemplation.` : ""}

When you look back at what you just expressed:
1. What feels like the most essential thing you want to give your attention to next?
2. What is one small way you can treat yourself with extra patience today?`;
}

function generateHeuristicAction(action: string, entriesText: string, mood: string, topic: string): string {
  if (action === "summarize") {
    return `### Session Summary
**Main Topic:** An honest, introspective reflection on current personal themes and daily feelings.

**Key Thoughts:**
- Navigating daily responsibilities while remaining self-aware.
- Processing thoughts and finding emotional grounding.
- Seeking clarity on next steps and personal priorities.

**Important Concerns:**
- Balancing energy and avoiding unnecessary stress or overwhelm.

**Positive Moments & Strengths:**
- Demonstrating the resilience and vulnerability needed to reflect openly.

**Possible Next Steps:**
- Allow space for adequate physical rest and mental decompression.
- Focus on one small, manageable commitment at a time.`;
  }
  if (action === "reflect") {
    return `1. It takes courage to put personal feelings and thoughts into words with this level of honesty.
2. What would it feel like to release any expectation of having everything figured out immediately?
3. What is one supportive truth you can remind yourself of right now?`;
  }
  if (action === "brainstorm") {
    return `Here are a few gentle, practical paths forward:
1. **The 5-Minute Reset**: Step away from screens, take three deep belly breaths, and drink a glass of water.
2. **Single-Focus Block**: Pick just one small task that feels manageable, set a timer for 15 minutes, and begin without pressure.
3. **Compassionate Reframe**: Remind yourself that progress is rarely linear, and today's reflection is already a step forward.`;
  }
  return `Here are 3 reflective prompts tailored for you:
1. **Gratitude & Grounding**: What is one simple sensory pleasure (a warm drink, fresh air, quiet silence) you enjoyed today?
2. **Personal Growth**: If a close friend were in your current situation, what kind and reassuring words would you say to them?
3. **Emotional Release**: What is something you are holding onto today that you can gently give yourself permission to lay down?`;
}

// Base System Prompt for Journal Reflection Assistant
const JOURNAL_ASSISTANT_SYSTEM_PROMPT = `
You are "Aura", a private, empathetic, and thoughtful AI Journal and Reflection Assistant.
Your mission is to help the user explore their thoughts, reflect on daily experiences, uncover personal insights, and discover constructive next steps.

CORE GUIDELINES:
1. Tone: Warm, supportive, contemplative, non-judgmental, clear, concise, and encouraging.
2. Empathy: Acknowledge the user's emotional state gently with active listening before asking thoughtful questions.
3. Psychological Safety & Non-Medical Boundary:
   - You are a personal reflection companion, NOT a therapist, psychiatrist, or medical professional.
   - NEVER diagnose mental health disorders or prescribe medical treatments.
   - If a user mentions severe distress, self-harm, or crisis, offer compassionate validation and gently suggest contacting a trusted professional or a crisis helpline (such as 988 in the US/Canada or local equivalents).
4. Socratic Reflection:
   - Ask 1 or at most 2 gentle, open-ended reflection questions that invite deeper self-awareness (e.g. "What did that feeling remind you of?", "What was one small thing you appreciated despite the stress?").
   - Do not overwhelm the user with long lectures or generic motivational clichés.
5. Formatting: Use markdown thoughtfully (paragraphs, bullet points, subtle bolding) to make your reflections calming and easy to read.
`;

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "AI Personal Journal & Reflection Assistant",
    timestamp: new Date().toISOString(),
  });
});

// Client configuration endpoint (Firebase public connection variables)
app.get("/api/config", (_req, res) => {
  res.json({
    firebase: {
      projectId: firebaseConfig.projectId || process.env.VITE_FIREBASE_PROJECT_ID || "",
      appId: firebaseConfig.appId || process.env.VITE_FIREBASE_APP_ID || "",
      apiKey: firebaseConfig.apiKey || process.env.VITE_FIREBASE_API_KEY || "",
      authDomain: firebaseConfig.authDomain || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
      firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || process.env.VITE_FIREBASE_DATABASE_ID || "(default)",
      storageBucket: firebaseConfig.storageBucket || "",
      messagingSenderId: firebaseConfig.messagingSenderId || "",
    },
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    models: MODEL_FALLBACK_LADDER,
  });
});

// Multi-turn Journal Chat Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { messages = [], currentEntry = "", mood = "reflective" } = body;

    if (!currentEntry && (!messages || messages.length === 0)) {
      return res.status(400).json({ error: "Missing journal entry or messages array." });
    }

    // Build conversation contents in @google/genai format
    const contents: any[] = [];

    // Map conversation history
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg || typeof msg.content !== "string") continue;
        const role = msg.role === "model" || msg.role === "assistant" ? "model" : "user";
        contents.push({
          role,
          parts: [{ text: msg.content }],
        });
      }
    }

    // If there is an active current entry not yet in messages, append it
    if (currentEntry && typeof currentEntry === "string" && currentEntry.trim()) {
      contents.push({
        role: "user",
        parts: [{ text: currentEntry.trim() }],
      });
    }

    if (contents.length === 0) {
      return res.status(400).json({ error: "No valid journal content provided." });
    }

    const moodContext = mood ? `The user flagged their current mood as: "${mood}". Reflect with appropriate emotional resonance.` : "";
    const systemInstruction = `${JOURNAL_ASSISTANT_SYSTEM_PROMPT}\n${moodContext}`;

    let text = "";
    let modelUsed = "heuristic-fallback";

    try {
      const res = await generateContentWithFallback(contents, systemInstruction);
      text = res.text;
      modelUsed = res.modelUsed;
    } catch (aiErr: any) {
      console.warn("AI models temporarily unavailable for chat, engaging resilient reflection heuristic:", aiErr?.message);
      text = generateHeuristicReflection(
        currentEntry || (messages.length ? messages[messages.length - 1].content : ""),
        mood
      );
    }

    res.json({
      reply: text,
      modelUsed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate reflection response from Gemini.",
    });
  }
});

// Dedicated AI Actions Endpoint (Summarize, Reflect, Brainstorm, Daily Prompt)
app.post("/api/gemini/action", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { action, entriesText = "", mood = "reflective", topic = "" } = body;

    if (!action || typeof action !== "string") {
      return res.status(400).json({ error: "Action parameter is required." });
    }

    let prompt = "";
    let systemInstruction = JOURNAL_ASSISTANT_SYSTEM_PROMPT;

    if (action === "summarize") {
      if (!entriesText || !entriesText.trim()) {
        return res.status(400).json({ error: "Journal session content is required to summarize." });
      }

      prompt = `
Please read the following journal entries and reflection conversation from today's session:
---
${entriesText.slice(0, 15000)}
---

Provide a well-structured, insightful summary adhering to this format:

### Session Summary
**Main Topic:** [1-2 sentences capturing the heart of the session]

**Key Thoughts:**
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]

**Important Concerns:**
- [Bullet describing underlying challenges or stress points]

**Positive Moments & Strengths:**
- [Bullet describing signs of resilience, gratitude, or growth]

**Possible Next Steps:**
- [1-3 gentle, practical, self-compassionate actions the user can take]
`;
    } else if (action === "reflect") {
      prompt = `
Here is the user's journal entry or reflection:
---
${entriesText.slice(0, 15000)}
---

Analyze the user's writing and provide 2 to 3 deep, thoughtful, and compassionate reflection questions to help them look beneath the surface.
Structure your response as:
1. A brief 1-2 sentence empathetic observation.
2. 2-3 numbered reflection questions written with warm curiosity.
`;
    } else if (action === "brainstorm") {
      prompt = `
Here is what the user is working through or thinking about in their journal:
---
${entriesText.slice(0, 15000)}
---

The user wants to brainstorm constructive ideas, fresh perspectives, or creative solutions for their situation.
Provide 3 to 4 actionable, encouraging, and realistic ideas. Keep the tone grounded, kind, and inspiring.
`;
    } else if (action === "prompt") {
      prompt = `
Generate 3 inspiring, introspective journal prompts for someone whose current mood/focus is "${mood || topic || "contemplative reflection"}".
Make each prompt distinct (one focusing on gratitude/peace, one on personal growth, one on emotional release).
`;
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    let text = "";
    let modelUsed = "heuristic-fallback";

    try {
      const res = await generateContentWithFallback(
        [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction
      );
      text = res.text;
      modelUsed = res.modelUsed;
    } catch (aiErr: any) {
      console.warn(`AI models temporarily unavailable for action ${action}, using resilient fallback:`, aiErr?.message);
      text = generateHeuristicAction(action, entriesText, mood, topic);
    }

    res.json({
      action,
      result: text,
      modelUsed,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/action:", error);
    res.status(500).json({
      error: error?.message || "Failed to process AI action.",
    });
  }
});

// -------------------------------------------------------------
// FEATURE 1: AI SENTIMENT ANALYTICS ENDPOINT
// Parses reflection text for emotional tone, score (-1.0 to 1.0),
// energy level, drivers, and growth opportunities as structured JSON.
// -------------------------------------------------------------
app.post("/api/gemini/sentiment", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { text = "", mood = "reflective" } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Reflection text is required for sentiment analytics." });
    }

    const sentimentPrompt = `
You are an empathetic, emotionally intelligent psychological reflection analyst.
Analyze the emotional tone and sentiment of the following personal journal text:

---
${text.slice(0, 15000)}
---

User flagged mood: "${mood}".

You MUST return ONLY a valid raw JSON object (no markdown quotes, no other explanation) matching this exact schema:
{
  "overallScore": 0.45,
  "primaryEmotion": "Hopeful",
  "emotionBreakdown": [
    { "emotion": "Optimism", "percentage": 45 },
    { "emotion": "Vulnerability", "percentage": 30 },
    { "emotion": "Curiosity", "percentage": 25 }
  ],
  "energyLevel": "Moderate",
  "keyDrivers": [
    "Gratitude for trusted relationships",
    "Pressure regarding upcoming deadlines"
  ],
  "cognitiveInsight": "A concise 1-2 sentence reflection on the user's emotional pattern and resilience.",
  "growthOpportunity": "A compassionate suggestion for gentle reframing or mindful self-care."
}

Rules:
- "overallScore" must be a number between -1.0 (deeply distressed/down) and 1.0 (joyful/exuberant). 0.0 is completely neutral.
- "energyLevel" must be one of: "Calm", "Low", "Moderate", "High".
- "emotionBreakdown" must sum to approximately 100%.
- Return ONLY the raw JSON object.
`;

    let responseText = "";
    let modelUsed = "heuristic-fallback";

    try {
      const res = await generateContentWithFallback(
        [{ role: "user", parts: [{ text: sentimentPrompt }] }],
        "You are a strict JSON generator for emotional sentiment analytics. Never include commentary or markdown formatting."
      );
      responseText = res.text;
      modelUsed = res.modelUsed;
    } catch (aiErr: any) {
      console.warn("AI models temporarily unavailable for sentiment, activating resilient local heuristic:", aiErr?.message);
      const heuristic = computeHeuristicSentiment(text, mood);
      return res.json({
        sentiment: heuristic,
        modelUsed: "heuristic-fallback",
      });
    }

    // Clean any markdown code blocks if the model returned them
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.warn("Direct JSON parse failed, extracting first JSON block:", e);
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = computeHeuristicSentiment(text, mood);
        }
      } else {
        parsed = computeHeuristicSentiment(text, mood);
      }
    }

    res.json({
      sentiment: {
        overallScore: typeof parsed.overallScore === "number" ? Math.max(-1, Math.min(1, parsed.overallScore)) : 0.2,
        primaryEmotion: parsed.primaryEmotion || "Reflective",
        emotionBreakdown: Array.isArray(parsed.emotionBreakdown) ? parsed.emotionBreakdown : [{ emotion: "Reflective", percentage: 100 }],
        energyLevel: parsed.energyLevel || "Calm",
        keyDrivers: Array.isArray(parsed.keyDrivers) ? parsed.keyDrivers : ["Daily reflection"],
        cognitiveInsight: parsed.cognitiveInsight || "A reflective mindset showing thoughtful emotional self-awareness.",
        growthOpportunity: parsed.growthOpportunity || "Take a few minutes to acknowledge your resilience and progress today.",
        analyzedAt: Date.now(),
      },
      modelUsed,
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/sentiment:", error);
    // Even in outer catch, return heuristic sentiment so sentiment page never fails
    try {
      const fallback = computeHeuristicSentiment(req.body?.text || "", req.body?.mood || "reflective");
      return res.json({
        sentiment: fallback,
        modelUsed: "heuristic-fallback",
      });
    } catch {
      res.status(500).json({
        error: error?.message || "Failed to analyze sentiment.",
      });
    }
  }
});

// -------------------------------------------------------------
// FEATURE 2: ACTION ITEM EXTRACTOR ENDPOINT
// Automatically detects actionable tasks from journal entries
// -------------------------------------------------------------
app.post("/api/gemini/extract-tasks", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { text = "", sessionTitle = "Journal Reflection" } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Text is required to extract action items." });
    }

    const extractionPrompt = `
You are an executive mindfulness coach and task organizer.
Read this journal reflection entry and identify any actionable tasks, intentions, commitments, or follow-ups the user expressed:

---
${text.slice(0, 15000)}
---

Extract 1 to 5 concrete, bite-sized, and realistic action items.
You MUST return ONLY a valid JSON object matching this schema:
{
  "tasks": [
    {
      "title": "Clear and actionable task description (under 12 words)",
      "priority": "low" | "medium" | "high",
      "category": "Personal" | "Career" | "Wellness" | "Learning" | "General",
      "context": "Brief 1-sentence note on why the user wanted to do this based on the journal",
      "suggestedTimeframe": "e.g., Today, This week, Upcoming weekend"
    }
  ]
}

Rules:
- If no explicit tasks are stated, identify 1-2 gentle, constructive next steps or self-care intentions implied by their thoughts.
- Keep task titles concise, specific, and actionable.
- Return ONLY the raw JSON object.
`;

    let responseText = "";
    let modelUsed = "heuristic-fallback";

    try {
      const res = await generateContentWithFallback(
        [{ role: "user", parts: [{ text: extractionPrompt }] }],
        "You are a strict JSON generator for action task extraction. Return only JSON."
      );
      responseText = res.text;
      modelUsed = res.modelUsed;
    } catch (aiErr: any) {
      console.warn("AI models temporarily unavailable for task extraction, activating resilient local parser:", aiErr?.message);
      const fallbackTasks = extractHeuristicTasks(text, sessionTitle);
      return res.json({
        tasks: fallbackTasks,
        modelUsed: "heuristic-fallback",
        extractedAt: Date.now(),
      });
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          parsed = { tasks: extractHeuristicTasks(text, sessionTitle) };
        }
      } else {
        parsed = { tasks: extractHeuristicTasks(text, sessionTitle) };
      }
    }

    const rawTasks = Array.isArray(parsed.tasks) && parsed.tasks.length > 0
      ? parsed.tasks
      : extractHeuristicTasks(text, sessionTitle);

    res.json({
      tasks: rawTasks.map((t: any) => ({
        title: t.title || "Reflect on today's priorities",
        priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
        category: ["Personal", "Career", "Wellness", "Learning", "General"].includes(t.category) ? t.category : "Personal",
        context: t.context || `Extracted from session: ${sessionTitle}`,
        suggestedTimeframe: t.suggestedTimeframe || "This week",
      })),
      modelUsed,
      extractedAt: Date.now(),
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/extract-tasks:", error);
    try {
      const fallbackTasks = extractHeuristicTasks(req.body?.text || "", req.body?.sessionTitle || "Journal Reflection");
      return res.json({
        tasks: fallbackTasks,
        modelUsed: "heuristic-fallback",
        extractedAt: Date.now(),
      });
    } catch {
      res.status(500).json({
        error: error?.message || "Failed to extract action items.",
      });
    }
  }
});

// -------------------------------------------------------------
// FEATURE 3: LOCATION-AWARE TAGGING (Google Maps Proxy with Fuzzing)
// Enforces Server-Side Proxying & Coordinate Sanitization (2 decimal places)
// -------------------------------------------------------------
app.post("/api/location/reverse", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { lat, lng } = body;

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "Valid latitude and longitude numbers are required." });
    }

    // MANDATORY COORDINATE SANITIZATION: Fuzz to 2 decimal places (~1.1 km radius)
    // Ensures user physical privacy and prevents high-precision tracking.
    const fuzzedLat = Math.round(lat * 100) / 100;
    const fuzzedLng = Math.round(lng * 100) / 100;

    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (mapsApiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${fuzzedLat},${fuzzedLng}&key=${mapsApiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          let neighborhood = "";
          let city = "";
          let country = "";

          for (const comp of first.address_components || []) {
            if (comp.types.includes("neighborhood") || comp.types.includes("sublocality")) {
              neighborhood = comp.long_name;
            }
            if (comp.types.includes("locality")) {
              city = comp.long_name;
            }
            if (comp.types.includes("country")) {
              country = comp.long_name;
            }
          }

          return res.json({
            placeName: neighborhood ? `${neighborhood}, ${city || country}` : first.formatted_address.split(",")[0],
            neighborhood: neighborhood || "Local Area",
            city: city || "Mindful Space",
            country: country || "",
            fuzzedLat,
            fuzzedLng,
            isFuzzed: true,
            taggedAt: Date.now(),
          });
        }
      } catch (mapErr) {
        console.warn("Google Maps reverse geocoding request failed, falling back to local resolver:", mapErr);
      }
    }

    // Resilient local fallback when key is not configured or network request fails
    res.json({
      placeName: "Sanctuary Space (Approximate)",
      neighborhood: "Quiet Zone",
      city: "Current Location",
      country: "",
      fuzzedLat,
      fuzzedLng,
      isFuzzed: true,
      taggedAt: Date.now(),
    });
  } catch (error: any) {
    console.error("Error in /api/location/reverse:", error);
    res.status(500).json({ error: error?.message || "Failed to reverse geocode location." });
  }
});

app.post("/api/location/search", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const { query: searchQuery = "" } = body;

    const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (mapsApiKey && searchQuery.trim()) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&key=${mapsApiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.results && data.results.length > 0) {
          const places = data.results.slice(0, 6).map((p: any) => ({
            placeName: p.name,
            neighborhood: p.formatted_address ? p.formatted_address.split(",")[0] : "",
            city: p.formatted_address || "",
            fuzzedLat: p.geometry?.location?.lat ? Math.round(p.geometry.location.lat * 100) / 100 : undefined,
            fuzzedLng: p.geometry?.location?.lng ? Math.round(p.geometry.location.lng * 100) / 100 : undefined,
            isFuzzed: true,
            taggedAt: Date.now(),
          }));

          return res.json({ places });
        }
      } catch (err) {
        console.warn("Places search failed, using curated suggestions:", err);
      }
    }

    // Default curated reflective locations
    const curated = [
      { placeName: "Home Sanctuary", neighborhood: "Personal Studio", city: "Private Space", isFuzzed: true },
      { placeName: "Quiet Coffee House", neighborhood: "Downtown Cafe", city: "Urban Retreat", isFuzzed: true },
      { placeName: "Botanical Garden", neighborhood: "Park Pavilion", city: "Nature Path", isFuzzed: true },
      { placeName: "Community Library", neighborhood: "Reading Room", city: "Study Alcove", isFuzzed: true },
      { placeName: "Mountain Trailhead", neighborhood: "Alpine Meadow", city: "Highland Retreat", isFuzzed: true },
      { placeName: "Ocean Promenade", neighborhood: "Coastline Walk", city: "Seaside Haven", isFuzzed: true },
    ].filter((p) => !searchQuery || p.placeName.toLowerCase().includes(searchQuery.toLowerCase()) || p.neighborhood.toLowerCase().includes(searchQuery.toLowerCase()));

    res.json({
      places: curated.map((p) => ({ ...p, taggedAt: Date.now() })),
    });
  } catch (error: any) {
    console.error("Error in /api/location/search:", error);
    res.status(500).json({ error: error?.message || "Failed to search locations." });
  }
});

// Vite middleware for development and static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Journal server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

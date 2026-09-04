# Aura Journal: AI Reflection Companion

A production-ready, privacy-centric full-stack web application that acts as a private, AI-powered personal growth and reflection companion. Authenticated users write journal reflections, converse through multi-turn dialogues with Google Gemini, extract actionable tasks into a dedicated workspace, monitor emotional sentiment and cognitive polarity arcs, and safely tag geographic context with 2-decimal coordinate fuzzing—all stored securely in Cloud Firestore with strict user isolation.

---

## System Architecture & Threat Model Countermeasures

```
[Browser Client] (React 19 + Tailwind CSS)
      │
      ├─► [Firebase Auth (Google Sign-In)] ──► Federated Identity (Zero Passwords Stored)
      │
      ├─► [Cloud Firestore] ─────────────────► Owner-Bound Rules (/users/{userId}/...)
      │                                       Strict User Data Isolation (request.auth.uid == userId)
      │                                       - /sessions/{sessionId}/messages/{messageId}
      │                                       - /tasks/{taskId}
      ▼
[Cloud Run Server] (Express + Node.js)
      │
      ├─► [Google Cloud Secret Manager] ─────► GEMINI_API_KEY & GOOGLE_MAPS_API_KEY (Zero Client-Side Leakage)
      │
      ├─► [Gemini Flash Model Ladder] ───────► Resilient Fallback Engine:
      │                                       1. gemini-2.5-flash
      │                                       2. gemini-3.6-flash
      │                                       3. gemini-2.5-flash-lite
      │                                       4. gemini-flash-latest
      │                                       5. gemini-2.5-pro
      │
      ├─► [Feature 1: Sentiment Engine] ─────► /api/gemini/sentiment (Score -1.0 to +1.0, Energy, Insights)
      │
      ├─► [Feature 2: Action Item Extractor] ► /api/gemini/extract-tasks (Task decomposition & priority)
      │
      └─► [Feature 3: Location Proxy] ──────► /api/location/reverse & /search (Coordinate fuzzing ~1.1km)
```

---

## 1. Prerequisites & Environment Setup

Ensure you have the Google Cloud CLI (`gcloud`) and Node.js (v20+) installed.

### Enable Required Google Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

---

## 2. Secret Management Setup (Google Cloud Secret Manager)

To prevent API key leakage into client-side browser bundles, store `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY` securely in Secret Manager:

```bash
# 1. Create and populate the Gemini API key secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. (Optional) Create and populate the Google Maps API key secret
gcloud secrets create GOOGLE_MAPS_API_KEY --replication-policy="automatic"
echo -n "YOUR_GOOGLE_MAPS_API_KEY" | gcloud secrets versions add GOOGLE_MAPS_API_KEY --data-file=-

# 3. Grant your Cloud Run compute service account permission to read the secrets
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration & Firestore Rules

Deploy the strict owner-bound rules in `firestore.rules` to guarantee complete cross-user data isolation. User A cannot read, query, update, or delete User B's entries or tasks:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Top-level user container enforcing strict isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Journal reflection sessions
      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        // Nested conversation turns & multi-turn dialogs
        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      // Action items & tasks collection
      match /tasks/{taskId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Any nested resources under the authenticated user
      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Explicit zero-trust rejection for all unauthenticated or unmatched access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy the rules using the Firebase CLI:

```bash
firebase deploy --only firestore:rules
```

---

## 4. Local Development

1. Clone or extract the project repository.
2. Ensure `.env.example` variables are configured or provided via Secret Manager.
3. Install dependencies:

```bash
npm install
```

4. Run the local unified dev server (Express backend + Vite middleware on Port 3000):

```bash
npm run dev
```

Visit `http://localhost:3000` to interact with the application.

---

## 5. Cloud Run Production Deployment

Deploy the containerized full-stack application directly to Google Cloud Run:

```bash
# Build and deploy to Cloud Run with Secret Manager binding
gcloud run deploy mindpulse-ai \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest
```

### Mandatory Verification Labeling

Register the service for automated challenge verification:

```bash
gcloud run services update mindpulse-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Stability & Testing Walkthroughs

The following test cases can be turned into automated end-to-end testing scripts:

### Test Suite 1: Unauthenticated Landing & Google Sign-In
- **Case 1.1 (Landing Visibility):** Open the application without authentication. Verify the hero section, tagline *"Reflect. Understand. Grow."*, features grid (including Sentiment Pulse, Tasks Studio, and Location Tagging), and privacy section render properly.
- **Case 1.2 (Interactive Simulation):** Verify the live demonstration card displays the conversational sample between User and Gemini with appropriate styling.
- **Case 1.3 (Google Sign-In Trigger):** Click the "Sign in with Google" button. Verify the Google federated identity popup opens and signs the user in.
- **Case 1.4 (Redirect Upon Auth):** Verify that successful authentication immediately transitions the view to the Private User Dashboard.

### Test Suite 2: Journal Creation & Multi-Turn Gemini Conversation
- **Case 2.1 (Session Initialization):** Click "+ Start Today's Journal". Verify a new session document with a unique ID is created in Firestore under `/users/{userId}/sessions/{sessionId}`.
- **Case 2.2 (Free-Form Entry):** Type a journal reflection into the auto-expanding textarea (e.g., *"I had a productive morning finishing our roadmap, but feel anxious about the timeline."*) and press Enter or click "Reflect".
- **Case 2.3 (Persistence Verification):** Verify that the user message is written to `/users/{userId}/sessions/{sessionId}/messages` before/during the Gemini request.
- **Case 2.4 (Contemplative Indicator):** Verify the calming typing indicator appears while Gemini processes the reflection.
- **Case 2.5 (Gemini Response & Context Continuity):** Verify Gemini replies in an empathetic, supportive, and non-medical tone. Send a follow-up message (e.g., *"How should I break down this anxiety?"*) and verify Gemini retains context from the prior turns.
- **Case 2.6 (Title Editing):** Click the session title, rename it, and verify the updated title is saved in Firestore.

### Test Suite 3: Dedicated AI Actions
- **Case 3.1 (Session Summarize):** Click the "Summarize" button. Verify the modal opens displaying structured sections: Main Topic, Key Thoughts, Important Concerns, Positive Moments, and Possible Next Steps. Verify the summary is saved in the session document.
- **Case 3.2 (Deep Reflection Questions):** Click the "Reflect" button. Verify Gemini generates 2-3 deep, compassionate reflection questions tailored to the writing.
- **Case 3.3 (Brainstorming Ideas):** Click the "Brainstorm" button. Verify Gemini provides practical, constructive perspectives.
- **Case 3.4 (Mood Selection):** Change the session mood (e.g., from *Reflective* to *Calm* or *Overwhelmed*). Verify the updated mood pill updates in real-time.

### Test Suite 4: Feature 1 - AI Sentiment Analytics & Emotional Arc
- **Case 4.1 (Tone Analysis Trigger):** In an active journal session, click the "Analyze Tone" button in the header toolbar.
- **Case 4.2 (Backend Synthesis):** Verify the backend evaluates the entry via `/api/gemini/sentiment`, generating an overall score (-1.0 to 1.0), primary emotion, energy level, and cognitive distortion insights.
- **Case 4.3 (Persistence & UI Display):** Verify the telemetry badge appears in the sub-bar and the sentiment object is saved to the Firestore session document.
- **Case 4.4 (Dedicated Analytics Dashboard):** Navigate to "Sentiment Pulse" via sidebar or navbar. Verify the average polarity metric, energy score, emotional distribution bar charts, and historical sentiment timeline render correctly.

### Test Suite 5: Feature 2 - Action Item Extractor & Tasks Studio
- **Case 5.1 (Extraction Trigger):** In a journal session containing goals or to-dos (e.g., *"Need to schedule 1:1 with team, review slide deck, and meditate for 10 minutes"*), click "Extract Tasks".
- **Case 5.2 (Auto-Detection & Persistence):** Verify Gemini identifies discrete action items, categorizes their priority (high/medium/low), and automatically writes each item to the user's isolated `/users/{userId}/tasks` Firestore collection.
- **Case 5.3 (Tasks Studio Workspace):** Navigate to "Tasks Studio". Verify all extracted tasks appear with priority badges and source session tags.
- **Case 5.4 (Task Interactions):** Click the checkbox to toggle a task's completion status. Add a custom manual task. Delete a task. Verify all mutations persist in Firestore immediately.

### Test Suite 6: Feature 3 - Location-Aware Tagging & Privacy Fuzzing
- **Case 6.1 (Location Modal Open):** Click "Pin Location" in the journal session toolbar.
- **Case 6.2 (Browser Geolocation with Fuzzing):** Click "Use Current Location". Verify the browser requests geolocation permission, and upon receipt, the backend fuzzes coordinates to 2 decimal places (~1.1km radius), preserving user privacy.
- **Case 6.3 (Place Search):** Search for a city, cafe, or neighborhood in the search input. Select a result and verify the place name and fuzzed coordinates are displayed.
- **Case 6.4 (Tag Persistence):** Click "Confirm & Pin Location". Verify the location tag is saved in the session metadata, visible in the sub-bar and on dashboard session cards.

### Test Suite 7: History, Search & Deletion
- **Case 7.1 (History Listing):** Navigate to "My Journal History". Verify all past journal cards display title, date, message count, mood, and location/sentiment badges.
- **Case 7.2 (Search Query):** Type a search query into the search input. Verify sessions filter accurately in real time.
- **Case 7.3 (Mood Filtering):** Select a specific mood from the dropdown. Verify only sessions matching that mood are shown.
- **Case 7.4 (Session Deletion):** Click the delete trash icon on a session card. Verify a confirmation modal appears warning of permanent removal. Confirm deletion and verify both the session and its subcollection messages are deleted from Firestore.

### Test Suite 8: Security & Privacy Rules Verification
- **Case 8.1 (User Isolation):** Open the Privacy & Security modal (`/security`). Verify your authenticated Firebase UID is displayed alongside the deployed Firestore Security Rules.
- **Case 8.2 (Data Export):** Click "Export JSON". Verify a clean JSON backup file containing all user sessions, reflections, and tasks downloads to the local machine.
- **Case 8.3 (Sign Out):** Click the "Sign out" button in the navbar. Verify the user session terminates, local state clears, and the user is redirected to the Landing Page.

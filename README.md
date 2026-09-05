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
      │                                       1. gemini-3.1-flash-lite (Ultra-High Availability)
      │                                       2. gemini-3.8-flash
      │                                       3. gemini-3.6-flash
      │                                       4. gemini-flash-latest
      │                                       5. gemini-3.7-flash
      │                                       6. Zero-Downtime Deterministic Heuristic Engine
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

## 4. How to Run from GitHub

### Step 1: Export Project to GitHub
You can export this project directly to GitHub from Google AI Studio:
1. In the upper-right corner of the **Google AI Studio** workspace, click the **Settings / Menu** icon (or the **Export** button).
2. Select **Export to GitHub** (or select **Download ZIP**, extract the folder, and run `git init`, `git add .`, `git commit -m "Initial commit"` and push to your new GitHub repository).
3. Connect your GitHub account and choose a repository name (e.g., `aura-journal`).

### Step 2: Clone and Configure Locally
Clone your repository to your development machine:

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/aura-journal.git
cd aura-journal

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
```

Open `.env` and fill in your free Gemini API key:
```env
GEMINI_API_KEY="your_gemini_api_key_from_google_ai_studio"
# Optional: only if using Google Maps place search
GOOGLE_MAPS_API_KEY=""
```

> **Note on Firebase Config**: The repository already includes `firebase-applet-config.json` containing the client configuration for authentication and Firestore persistence. No manual file changes are needed.

### Step 3: Run the Application
Launch the local development server:

```bash
npm run dev
```

Open **`http://localhost:3000`** in your browser to interact with Aura Journal locally.

### Step 4: Validate Production Build
To test the self-contained production bundle locally before deploying:

```bash
# Compile client assets and backend bundle
npm run build

# Start the compiled production server
npm start
```

---

## 5. Free Deployment to Google Cloud Run (Get Your Live URL)

You can run this application completely within the **Google Cloud Free Tier** without incurring monthly infrastructure costs.

### Free Tier Cost Protection Breakdown
* **Cloud Run**: Includes **2 million requests/month**, 360,000 GB-seconds of memory, and 180,000 vCPU-seconds **100% FREE** every month.
* **Cloud Firestore**: Includes **1 GiB of stored data**, 50,000 document reads/day, 20,000 writes/day, and 20,000 deletes/day **FREE**.
* **Google Cloud Secret Manager**: Includes **6 active secret versions** permanently **FREE**.
* **Gemini API**: Free tier access with generous rate limits via Google AI Studio.
* **Firebase Authentication**: Unlimited Google Sign-In federated identity authentication **FREE**.

---

### Option A: Instant 1-Click Live URL via Google AI Studio (No CLI Required)
If you are working inside Google AI Studio, you already have a live URL:
1. Look at the top bar of Google AI Studio and click **Share** or **Deploy to Cloud Run**.
2. AI Studio automatically builds and publishes the containerized service and displays your shareable live URL link:
   - **Preview URL**: `https://ais-pre-wlz3atldjw7hs5oq4zizz2-261364555080.asia-east1.run.app`
3. You can copy and share this link directly with anyone.

---

### Option B: Deploy from GitHub / Local Terminal (Zero-Cost Free Tier Settings)

Follow these steps to deploy directly from your local terminal or cloned GitHub repository to get a dedicated custom live URL link:

#### 1. Log in and Set Your Project
```bash
# Authenticate with Google Cloud
gcloud auth login

# Set your active GCP project ID
gcloud config set project YOUR_PROJECT_ID
```

#### 2. Enable Free Tier Compatible APIs
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

#### 3. Store Secrets in Secret Manager (Free Tier: Up to 6 Secrets)
```bash
# Store Gemini API Key
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_ACTUAL_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run compute service account access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### 4. Deploy to Cloud Run with Scale-to-Zero Cost Controls
Use the following command to deploy. The flags `--min-instances=0`, `--max-instances=2`, `--memory=512Mi`, and `--cpu=1` ensure the app automatically scales down to zero instances when idle, incurring **$0 in server costs**:

```bash
gcloud run deploy aura-journal \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 3000 \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --cpu 1 \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest
```

When deployment finishes (usually 1–2 minutes), the output will print your permanent live HTTPS link:
```
Service URL: https://aura-journal-xxxxxx-uc.a.run.app
```

#### 5. Register Challenge Verification Label
Apply the required campaign tracking label to verify the deployment:

```bash
gcloud run services update aura-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

### Option C: Continuous Deployment from GitHub (Auto-Deploy on Git Push)

To have your live URL update automatically whenever you push code changes to GitHub:
1. In the Google Cloud Console, open **Cloud Run** → click **Deploy Container** (or click your existing `aura-journal` service).
2. Select **Continuously deploy from a repository**.
3. Authorize your GitHub account and select your `aura-journal` repository and branch (e.g. `main`).
4. Select **Build Type: Google Cloud Buildpacks** (no Dockerfile required).
5. Under **Security & Variables**, bind `GEMINI_API_KEY` from Secret Manager.
6. Click **Save**. Every `git push` to your GitHub repo will now automatically build and update your live URL.

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

import React, { useState } from 'react';
import { UserProfile, JournalSession } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Download, 
  FileJson, 
  Server, 
  CheckCircle2, 
  X,
  Code,
  EyeOff
} from 'lucide-react';

interface PrivacySettingsModalProps {
  user: UserProfile;
  sessions: JournalSession[];
  onClose: () => void;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  user,
  sessions,
  onClose,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleExportData = () => {
    const exportObject = {
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
      exportedAt: new Date().toISOString(),
      sessionsCount: sessions.length,
      sessions,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `aurajournal-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-stone-900">
                Privacy, Security & Data Isolation
              </h3>
              <p className="text-xs text-stone-500">
                Verified Cloud Firestore security & identity isolation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Identity Details */}
        <div className="space-y-6 text-xs text-stone-700">
          <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-stone-500">
              Your Authenticated Identity
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-medium text-stone-800">Firebase User ID (UID):</span>
              <code className="bg-stone-200/80 px-2 py-0.5 rounded text-[11px] font-mono select-all text-stone-900">
                {user.uid}
              </code>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-medium text-stone-800">Email:</span>
              <span className="text-stone-600">{user.email || 'Not provided'}</span>
            </div>
          </div>

          {/* Security Guarantees */}
          <div className="space-y-3">
            <h4 className="font-serif text-sm font-bold text-stone-900">
              Core Security Standards Implemented
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-stone-200 p-3 bg-white">
                <div className="flex items-center gap-2 text-stone-900 font-semibold mb-1">
                  <Lock className="h-4 w-4 text-emerald-600" />
                  <span>Owner-Bound Firestore Rules</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Only the user matching <code className="text-emerald-700 font-mono">request.auth.uid</code> can read, query, create, or delete records inside <code className="text-stone-700 font-mono">/users/&#123;userId&#125;</code>.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 p-3 bg-white">
                <div className="flex items-center gap-2 text-stone-900 font-semibold mb-1">
                  <EyeOff className="h-4 w-4 text-amber-600" />
                  <span>Zero Client-Side Secrets</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  The Gemini API key is never bundled in frontend JavaScript. All requests go through server-side endpoints with model fallback ladder.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 p-3 bg-white">
                <div className="flex items-center gap-2 text-stone-900 font-semibold mb-1">
                  <KeyRound className="h-4 w-4 text-sky-600" />
                  <span>No Passwords Stored</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Authentication is handled entirely by Google Sign-In via Firebase Auth. No custom passwords are created or stored.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200 p-3 bg-white">
                <div className="flex items-center gap-2 text-stone-900 font-semibold mb-1">
                  <Server className="h-4 w-4 text-indigo-600" />
                  <span>Non-Medical Boundary</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                  Gemini operates as an empathetic reflection companion with strict boundaries against clinical diagnosis or medical claims.
                </p>
              </div>
            </div>
          </div>

          {/* Firestore Security Rules Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase tracking-wider text-[10px] text-stone-500">
                Deployed Firestore Security Rules
              </span>
              <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3" /> Active & Deployed
              </span>
            </div>

            <pre className="rounded-xl bg-stone-900 p-3.5 text-[11px] text-stone-200 font-mono overflow-x-auto leading-relaxed border border-stone-800">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;

        match /messages/{messageId} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
  }
}`}
            </pre>
          </div>

          {/* Backup / Export Section */}
          <div className="rounded-2xl border border-amber-200/70 bg-amber-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-serif text-sm font-bold text-amber-950">
                Export Your Private Data
              </p>
              <p className="text-[11px] text-stone-600 mt-0.5">
                Download a complete JSON export of all your journal sessions and reflections.
              </p>
            </div>

            <button
              id="export-data-btn"
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition active:scale-95 shrink-0 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-amber-300" />
              <span>{downloadSuccess ? 'Downloaded!' : 'Export JSON'}</span>
            </button>
          </div>
        </div>

        {/* Footer Close */}
        <div className="mt-8 flex justify-end border-t border-stone-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-5 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

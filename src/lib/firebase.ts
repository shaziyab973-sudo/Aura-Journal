import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import { JournalSession, JournalMessage, UserProfile } from '../types';

// Default static configuration from generated environment
export const firebaseStaticConfig = {
  projectId: "gen-lang-client-0448843619",
  appId: "1:137468153830:web:c136ecc47c1ccf6ea89027",
  apiKey: "AIzaSyDnYkSd80UFnlGSQqdJ6L2C2l6ZgmkjeOo",
  authDomain: "gen-lang-client-0448843619.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-aipersonaljourna-75dd0712-a57a-4165-b45e-6a22e4e37939",
  storageBucket: "gen-lang-client-0448843619.firebasestorage.app",
  messagingSenderId: "137468153830",
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp({
    apiKey: firebaseStaticConfig.apiKey,
    authDomain: firebaseStaticConfig.authDomain,
    projectId: firebaseStaticConfig.projectId,
    storageBucket: firebaseStaticConfig.storageBucket,
    messagingSenderId: firebaseStaticConfig.messagingSenderId,
    appId: firebaseStaticConfig.appId,
  });
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore targeting the designated custom database ID with force long-polling
// to prevent 10s connection hangs in container/proxy environments
const designatedDbId = firebaseStaticConfig.firestoreDatabaseId && firebaseStaticConfig.firestoreDatabaseId !== '(default)'
  ? firebaseStaticConfig.firestoreDatabaseId
  : undefined;

let firestoreInstance: Firestore;
try {
  firestoreInstance = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  }, designatedDbId);
} catch (e) {
  firestoreInstance = designatedDbId ? getFirestore(app, designatedDbId) : getFirestore(app);
}

export const db: Firestore = firestoreInstance;

// Zero-Crash Payload Hygiene: Strip all `undefined` values before Firestore writes
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = sanitizeForFirestore(value);
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as Partial<T>;
}

// Authentication Helpers
export async function loginWithGoogle(): Promise<UserProfile | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const u = result.user;
    return {
      uid: u.uid,
      email: u.email,
      displayName: u.displayName || 'Friend',
      photoURL: u.photoURL,
    };
  } catch (error: any) {
    console.warn('Popup sign in failed, trying redirect mode:', error);
    if (error?.code === 'auth/popup-blocked' || error?.code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

export async function checkRedirectAuth(): Promise<UserProfile | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const u = result.user;
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || 'Friend',
        photoURL: u.photoURL,
      };
    }
    return null;
  } catch (err) {
    console.warn('Redirect auth check notice:', err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Reflective Friend',
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

// -------------------------------------------------------------
// FIRESTORE SERVICES WITH STRICT USER ISOLATION
// Paths: /users/{userId}/sessions/{sessionId}
//        /users/{userId}/sessions/{sessionId}/messages/{messageId}
// -------------------------------------------------------------

export async function createSession(
  userId: string,
  sessionData: Omit<JournalSession, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'messageCount'>
): Promise<JournalSession> {
  if (!userId) throw new Error('User ID is required to create a session.');

  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const sessionDoc = doc(sessionsRef);
  const now = Date.now();

  const newSession: JournalSession = {
    id: sessionDoc.id,
    userId,
    title: sessionData.title?.trim() || `Reflection on ${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    createdAt: now,
    updatedAt: now,
    mood: sessionData.mood || 'reflective',
    messageCount: 0,
    preview: sessionData.preview || 'Beginning new journal session...',
    tags: sessionData.tags || ['General'],
  };

  const cleanPayload = sanitizeForFirestore(newSession);
  await setDoc(sessionDoc, cleanPayload);
  return newSession;
}

export async function updateSession(
  userId: string,
  sessionId: string,
  updates: Partial<JournalSession>
): Promise<void> {
  if (!userId || !sessionId) return;
  const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
  const payload = sanitizeForFirestore({
    ...updates,
    updatedAt: Date.now(),
  });
  await updateDoc(sessionDocRef, payload);
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  if (!userId || !sessionId) return;
  // First delete all messages in subcollection
  const messagesRef = collection(db, 'users', userId, 'sessions', sessionId, 'messages');
  const messagesSnapshot = await getDocs(messagesRef);
  const deletePromises = messagesSnapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);

  // Then delete the session document
  const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
  await deleteDoc(sessionDocRef);
}

export function subscribeToSessions(
  userId: string,
  onUpdate: (sessions: JournalSession[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const sessionsRef = collection(db, 'users', userId, 'sessions');
  const q = query(sessionsRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: JournalSession[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(list);
    },
    (error) => {
      console.error('Error fetching sessions:', error);
      if (onError) onError(error);
    }
  );
}

export async function getSessionById(userId: string, sessionId: string): Promise<JournalSession | null> {
  if (!userId || !sessionId) return null;
  const docRef = doc(db, 'users', userId, 'sessions', sessionId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) };
}

// -------------------------------------------------------------
// MESSAGE SERVICES
// -------------------------------------------------------------

export function subscribeToMessages(
  userId: string,
  sessionId: string,
  onUpdate: (messages: JournalMessage[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId || !sessionId) {
    onUpdate([]);
    return () => {};
  }

  const messagesRef = collection(db, 'users', userId, 'sessions', sessionId, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: JournalMessage[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(list);
    },
    (error) => {
      console.error('Error fetching messages:', error);
      if (onError) onError(error);
    }
  );
}

export async function getSessionMessages(
  userId: string,
  sessionId: string
): Promise<JournalMessage[]> {
  if (!userId || !sessionId) return [];
  try {
    const messagesRef = collection(db, 'users', userId, 'sessions', sessionId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const snapshot = await getDocs(q);
    const list: JournalMessage[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...(docSnap.data() as any) });
    });
    return list;
  } catch (err) {
    console.warn('Error reading session messages from Firestore:', err);
    return [];
  }
}

export async function addMessage(
  userId: string,
  sessionId: string,
  message: Omit<JournalMessage, 'id' | 'sessionId' | 'timestamp'>
): Promise<JournalMessage> {
  if (!userId || !sessionId) throw new Error('Missing user or session ID');

  const messagesRef = collection(db, 'users', userId, 'sessions', sessionId, 'messages');
  const msgDoc = doc(messagesRef);
  const now = Date.now();

  const newMsg: JournalMessage = {
    id: msgDoc.id,
    sessionId,
    role: message.role,
    content: message.content,
    timestamp: now,
    actionType: message.actionType || 'chat',
    modelUsed: message.modelUsed,
  };

  const payload = sanitizeForFirestore(newMsg);
  await setDoc(msgDoc, payload);

  // Update parent session metadata (messageCount, updatedAt, preview)
  try {
    const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionDocRef);
    if (sessionSnap.exists()) {
      const currentCount = sessionSnap.data()?.messageCount || 0;
      await updateDoc(sessionDocRef, {
        messageCount: currentCount + 1,
        updatedAt: now,
        preview: message.role === 'user' ? message.content.slice(0, 140) : (sessionSnap.data()?.preview || ''),
      });
    }
  } catch (err) {
    console.warn('Could not update session preview/count:', err);
  }

  return newMsg;
}

// -------------------------------------------------------------
// FEATURE 2: ACTION ITEM EXTRACTOR TASK SERVICES (Strict User Isolation)
// Path: /users/{userId}/tasks/{taskId}
// -------------------------------------------------------------

export async function createTask(
  userId: string,
  task: Omit<import('../types').ActionTask, 'id' | 'userId' | 'createdAt'>
): Promise<import('../types').ActionTask> {
  if (!userId) throw new Error('User ID is required to create a task.');

  const tasksRef = collection(db, 'users', userId, 'tasks');
  const taskDoc = doc(tasksRef);
  const now = Date.now();

  const newTask: import('../types').ActionTask = {
    id: taskDoc.id,
    userId,
    sessionId: task.sessionId,
    sessionTitle: task.sessionTitle,
    title: task.title.trim(),
    priority: task.priority || 'medium',
    category: task.category || 'Personal',
    status: task.status || 'pending',
    createdAt: now,
    context: task.context,
    suggestedTimeframe: task.suggestedTimeframe,
  };

  const payload = sanitizeForFirestore(newTask);
  await setDoc(taskDoc, payload);
  return newTask;
}

export async function batchCreateTasks(
  userId: string,
  tasks: Array<Omit<import('../types').ActionTask, 'id' | 'userId' | 'createdAt'>>
): Promise<import('../types').ActionTask[]> {
  if (!userId || !tasks.length) return [];
  const created: import('../types').ActionTask[] = [];
  for (const task of tasks) {
    const res = await createTask(userId, task);
    created.push(res);
  }
  return created;
}

export async function updateTask(
  userId: string,
  taskId: string,
  updates: Partial<import('../types').ActionTask>
): Promise<void> {
  if (!userId || !taskId) return;
  const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
  const payload = sanitizeForFirestore({
    ...updates,
    ...(updates.status === 'completed' ? { completedAt: Date.now() } : {}),
  });
  await updateDoc(taskDocRef, payload);
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  if (!userId || !taskId) return;
  const taskDocRef = doc(db, 'users', userId, 'tasks', taskId);
  await deleteDoc(taskDocRef);
}

export function subscribeToTasks(
  userId: string,
  onUpdate: (tasks: import('../types').ActionTask[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const tasksRef = collection(db, 'users', userId, 'tasks');
  const q = query(tasksRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: import('../types').ActionTask[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      onUpdate(list);
    },
    (error) => {
      console.error('Error fetching tasks:', error);
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// FEATURE 1 & 3: SESSION EXTENSIONS (Sentiment & Location)
// -------------------------------------------------------------

export async function updateSessionLocation(
  userId: string,
  sessionId: string,
  location: import('../types').LocationTag
): Promise<void> {
  if (!userId || !sessionId) return;
  const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
  const payload = sanitizeForFirestore({
    location,
    updatedAt: Date.now(),
  });
  await updateDoc(sessionDocRef, payload);
}

export async function updateSessionSentiment(
  userId: string,
  sessionId: string,
  sentiment: import('../types').SentimentAnalysis
): Promise<void> {
  if (!userId || !sessionId) return;
  const sessionDocRef = doc(db, 'users', userId, 'sessions', sessionId);
  const payload = sanitizeForFirestore({
    sentiment,
    updatedAt: Date.now(),
  });
  await updateDoc(sessionDocRef, payload);
}

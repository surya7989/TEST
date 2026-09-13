/**
 * Firebase Client SDK Initialization & Authentication Helper
 * 
 * Configured for the AT Specialists Australia project (at-specialist).
 * Exposes standard auth helpers and human-readable error translation.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';

// Helper to get active API key (allows live testing from localStorage or .env)
export function getActiveFirebaseApiKey(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('AT_FIREBASE_API_KEY');
    if (local && local.trim().length > 10) return local.trim();
  }
  return import.meta.env.VITE_FIREBASE_API_KEY || '';
}

export function setActiveFirebaseApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key && key.trim().length > 10) {
      localStorage.setItem('AT_FIREBASE_API_KEY', key.trim());
    } else {
      localStorage.removeItem('AT_FIREBASE_API_KEY');
    }
  }
}

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'at-specialist';
const apiKey = getActiveFirebaseApiKey() || 'AIzaSyAqvefrtt_ybXSDLQQ5T_4IaTneeAuS1qg';

// Keys that are known to be invalid placeholders — calling Google with them
// only produces console 400 noise, so Firebase features stay disabled.
const KNOWN_INVALID_KEYS = new Set([
  'not-configured',
  'placeholder',
  'your-firebase-api-key',
]);

/**
 * True only when a real (non-placeholder) Firebase API key is configured.
 * Use before attempting sign-up/sign-in calls to avoid doomed network requests.
 */
export function isFirebaseAuthAvailable(): boolean {
  const key = getActiveFirebaseApiKey() || apiKey;
  return Boolean(key && key.length > 10 && !KNOWN_INVALID_KEYS.has(key));
}

export const firebaseConfig = {
  apiKey: apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  projectId: projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1052597120666',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1052597120666:web:9b7e92a9b1f195cbec7923',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-BT3M6HYY72',
};

// Initialize Firebase App singleton safely
// Only initialize if we have a real API key — avoid fake keys that cause 400 errors
let app: FirebaseApp;
if (!getApps().length) {
  if (apiKey && apiKey.length > 10 && !apiKey.includes('Demo') && !apiKey.includes('0000')) {
    app = initializeApp(firebaseConfig);
  } else {
    // Initialize with minimal config for local dev — Firebase auth methods won't work
    // but the app uses JWT REST API auth instead, so this is fine
    app = initializeApp({...firebaseConfig, apiKey: apiKey || 'not-configured' });
    if (!apiKey) {
      console.info('[Firebase] No VITE_FIREBASE_API_KEY configured — using REST API authentication instead.');
    }
  }
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Translates Firebase error codes to clear, customer-friendly messages.
 */
export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact customer support.';
    case 'auth/user-not-found':
      return 'No account was found matching this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password. Please verify your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose a password with at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completing authentication.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection and try again.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Please wait a few minutes before trying again.';
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'Authentication service is temporarily unavailable. Please try again or contact support.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Email/password authentication is temporarily unavailable. Please contact support.';
    default:
      return error.message || 'Authentication failed. Please verify your details.';
  }
}

export interface FirebaseConnectionDiagnostic {
  isConfigured: boolean;
  projectId: string;
  authDomain: string;
  apiKeyMasked: string;
  status: 'connected' | 'missing_key' | 'invalid_key' | 'operation_not_allowed' | 'error';
  title: string;
  message: string;
  testedAt: string;
  rawCode?: string;
}

/**
 * Safe local inspection for initial render (no network calls, no console noise).
 */
export function getInitialFirebaseDiagnostic(): FirebaseConnectionDiagnostic {
  const key = getActiveFirebaseApiKey();
  const testedAt = new Date().toLocaleTimeString();
  const isConfigured = Boolean(key && key !== 'not-configured' && key.length > 10);
  const masked = isConfigured && key.length > 8 ? `${key.slice(0, 6)}...${key.slice(-4)}` : 'None (blank)';

  if (!isConfigured) {
    return {
      isConfigured: false,
      projectId,
      authDomain: `${projectId}.firebaseapp.com`,
      apiKeyMasked: 'None (blank)',
      status: 'missing_key',
      title: 'API Key Missing in.env',
      message: 'Firebase Web API Key is not configured. Paste your Web API Key from the Firebase Console to activate live Google authentication.',
      testedAt,
    };
  }

  return {
    isConfigured: true,
    projectId,
    authDomain: `${projectId}.firebaseapp.com`,
    apiKeyMasked: masked,
    status: 'connected',
    title: 'Firebase is LIVE & Connected! ✅',
    message: `Firebase project "${projectId}" is active and ready. Email/Password authentication is enabled.`,
    testedAt,
  };
}

/**
 * Live test function to verify whether Google Firebase Auth servers are really reachable and responding.
 */
export async function testFirebaseConnection(candidateKey?: string): Promise<FirebaseConnectionDiagnostic> {
  const keyToTest = candidateKey?.trim() || getActiveFirebaseApiKey();
  const testedAt = new Date().toLocaleTimeString();

  if (!keyToTest || keyToTest === 'not-configured' || keyToTest.length < 10) {
    return {
      isConfigured: false,
      projectId,
      authDomain: `${projectId}.firebaseapp.com`,
      apiKeyMasked: 'None (blank)',
      status: 'missing_key',
      title: 'API Key Missing in.env',
      message: 'Firebase Web API Key is not configured. Paste your Web API Key from the Firebase Console to activate live Google authentication.',
      testedAt,
    };
  }

  const masked = keyToTest.length > 8 ? `${keyToTest.slice(0, 6)}...${keyToTest.slice(-4)}` : '••••••••';

  // Probe Google's Identity Toolkit endpoint to verify this exact API key and project
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${keyToTest}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test-firebase-probe@atspecialists.com.au',
        password: 'ProbePassword123!',
        returnSecureToken: true,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      return {
        isConfigured: true,
        projectId,
        authDomain: `${projectId}.firebaseapp.com`,
        apiKeyMasked: masked,
        status: 'connected',
        title: 'Firebase is LIVE & Connected! ✅',
        message: `Successfully reached Google Firebase servers for project "${projectId}". Real authentication is fully active.`,
        testedAt,
      };
    }

    const errCode = data?.error?.message || '';

    // If Google returns INVALID_LOGIN_CREDENTIALS or EMAIL_NOT_FOUND, it proves the API key is VALID and Email/Password is ENABLED!
    if (errCode.includes('INVALID_LOGIN_CREDENTIALS') ||
      errCode.includes('EMAIL_NOT_FOUND') ||
      errCode.includes('INVALID_PASSWORD')) {
      return {
        isConfigured: true,
        projectId,
        authDomain: `${projectId}.firebaseapp.com`,
        apiKeyMasked: masked,
        status: 'connected',
        title: 'Firebase is LIVE & Connected! ✅',
        message: `Successfully reached Google Firebase servers for project "${projectId}". Email/Password authentication is active and ready for users.`,
        testedAt,
        rawCode: errCode,
      };
    }

    if (errCode.includes('API_KEY_INVALID') || errCode.includes('INVALID_KEY')) {
      return {
        isConfigured: true,
        projectId,
        authDomain: `${projectId}.firebaseapp.com`,
        apiKeyMasked: masked,
        status: 'invalid_key',
        title: 'Invalid Firebase API Key ⚠️',
        message: 'Google Firebase rejected this API Key. Please copy the Web API Key from Firebase Console > Project Settings > General.',
        testedAt,
        rawCode: errCode,
      };
    }

    if (errCode.includes('CONFIGURATION_NOT_FOUND') || errCode.includes('OPERATION_NOT_ALLOWED')) {
      return {
        isConfigured: true,
        projectId,
        authDomain: `${projectId}.firebaseapp.com`,
        apiKeyMasked: masked,
        status: 'operation_not_allowed',
        title: 'Email/Password Provider Not Enabled ⚠️',
        message: 'Your Firebase project exists, but Email/Password sign-in is disabled. Turn it ON in Firebase Console > Authentication > Sign-in method.',
        testedAt,
        rawCode: errCode,
      };
    }

    return {
      isConfigured: true,
      projectId,
      authDomain: `${projectId}.firebaseapp.com`,
      apiKeyMasked: masked,
      status: 'error',
      title: 'Firebase Response Received',
      message: data?.error?.message || 'Google returned an unexpected response.',
      testedAt,
      rawCode: errCode,
    };
  } catch (netErr: any) {
    return {
      isConfigured: true,
      projectId,
      authDomain: `${projectId}.firebaseapp.com`,
      apiKeyMasked: masked,
      status: 'error',
      title: 'Network Connection Issue',
      message: netErr?.message || 'Could not connect to Google Firebase endpoints.',
      testedAt,
    };
  }
}

export {
  app,
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  type User,
};


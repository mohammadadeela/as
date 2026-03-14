import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
} from "firebase/auth";

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (!apiKey) throw new Error("Firebase API key not configured");

  if (getApps().length > 0) {
    _app = getApps()[0];
  } else {
    _app = initializeApp({ apiKey, authDomain, projectId, appId });
  }
  return _app;
}

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  _auth = getAuth(getFirebaseApp());
  return _auth;
}

export async function signInWithGoogle(): Promise<{ idToken: string; email: string; displayName: string | null }> {
  const result = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  const idToken = await result.user.getIdToken();
  return { idToken, email: result.user.email!, displayName: result.user.displayName };
}

export async function signInWithFacebook(): Promise<{ idToken: string; email: string; displayName: string | null }> {
  const result = await signInWithPopup(getFirebaseAuth(), new FacebookAuthProvider());
  const idToken = await result.user.getIdToken();
  return { idToken, email: result.user.email!, displayName: result.user.displayName };
}

export async function signOutFirebase(): Promise<void> {
  if (_auth) await firebaseSignOut(_auth);
}

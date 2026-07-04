import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Transaction, Expense } from './types';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with custom database ID if provided
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
const auth = getAuth(app);

export { app, db, auth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserLedgerData {
  transactions: Transaction[];
  expenses: Expense[];
  shopName: string;
  updatedAt: number; // timestamp
}

/**
 * Syncs the local ledger data to Firebase Firestore
 */
export async function uploadLedgerToCloud(
  email: string,
  transactions: Transaction[],
  expenses: Expense[],
  shopName: string
): Promise<void> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for syncing');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const path = `users/${cleanEmail}`;
  const userDocRef = doc(db, 'users', cleanEmail);
  
  const payload: UserLedgerData = {
    transactions,
    expenses,
    shopName,
    updatedAt: Date.now(),
  };
  
  try {
    await setDoc(userDocRef, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Downloads the user's ledger data from Firebase Firestore
 */
export async function downloadLedgerFromCloud(email: string): Promise<UserLedgerData | null> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for downloading');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const path = `users/${cleanEmail}`;
  const userDocRef = doc(db, 'users', cleanEmail);
  
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserLedgerData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Sign in with Google Popup
 */
export async function signInWithGoogle(): Promise<string> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;
    if (!email) {
      throw new Error('No email found in Google account.');
    }
    localStorage.setItem('hisab_khata_sync_email', email);
    return email;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Log out from Google Auth
 */
export async function logOutFromGoogle(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

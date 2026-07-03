import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
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

export { app, db };

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
  const userDocRef = doc(db, 'users', cleanEmail);
  
  const payload: UserLedgerData = {
    transactions,
    expenses,
    shopName,
    updatedAt: Date.now(),
  };
  
  await setDoc(userDocRef, payload, { merge: true });
}

/**
 * Downloads the user's ledger data from Firebase Firestore
 */
export async function downloadLedgerFromCloud(email: string): Promise<UserLedgerData | null> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for downloading');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const userDocRef = doc(db, 'users', cleanEmail);
  const docSnap = await getDoc(userDocRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as UserLedgerData;
  }
  
  return null;
}

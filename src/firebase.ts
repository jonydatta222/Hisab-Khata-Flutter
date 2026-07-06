import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, getDoc, getDocFromCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { Transaction, Expense } from './types';
import CryptoJS from 'crypto-js';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

// Initialize Firestore with persistent offline cache and long polling for reliable sandboxed connections
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
  experimentalForceLongPolling: true,
}, (firebaseConfig as any).firestoreDatabaseId || '(default)');
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
 * Syncs the local ledger data to Firebase Firestore (Encrypted with a 6-digit PIN)
 */
export async function uploadLedgerToCloud(
  email: string,
  transactions: Transaction[],
  expenses: Expense[],
  shopName: string,
  passcode: string
): Promise<void> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for syncing');
  }
  if (!passcode || passcode.length !== 6) {
    throw new Error('6-digit PIN is required');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const path = `users/${cleanEmail}`;
  const userDocRef = doc(db, 'users', cleanEmail);
  
  // Encrypt the transaction data using the passcode as the secret key
  const rawDataToEncrypt = JSON.stringify({
    transactions,
    expenses,
    shopName
  });
  
  const encryptedData = CryptoJS.AES.encrypt(rawDataToEncrypt, passcode).toString();
  const passcodeHash = CryptoJS.SHA256(passcode).toString();
  
  const payload = {
    encryptedData,
    passcodeHash,
    updatedAt: Date.now(),
  };
  
  try {
    await setDoc(userDocRef, payload, { merge: true });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (errMsg.includes('offline') || errMsg.includes('network') || errMsg.includes('Failed to')) {
      console.warn('Firestore is offline. Write is queued locally:', errMsg);
      return;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Downloads the user's ledger data from Firebase Firestore and decrypts it with the 6-digit PIN
 */
export async function downloadLedgerFromCloud(email: string, passcode: string): Promise<UserLedgerData | null> {
  if (!email || !email.trim()) {
    throw new Error('Email is required for downloading');
  }
  if (!passcode || passcode.length !== 6) {
    throw new Error('6-digit PIN is required');
  }
  
  const cleanEmail = email.trim().toLowerCase();
  const path = `users/${cleanEmail}`;
  const userDocRef = doc(db, 'users', cleanEmail);
  
  const clientHash = CryptoJS.SHA256(passcode).toString();
  
  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const serverData = docSnap.data();
      
      // Verification
      if (serverData.passcodeHash && serverData.passcodeHash !== clientHash) {
        throw new Error('WRONG_PIN');
      }
      
      if (serverData.encryptedData) {
        try {
          const bytes = CryptoJS.AES.decrypt(serverData.encryptedData, passcode);
          const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
          if (!decryptedText) {
            throw new Error('WRONG_PIN');
          }
          const parsedData = JSON.parse(decryptedText);
          return {
            transactions: parsedData.transactions || [],
            expenses: parsedData.expenses || [],
            shopName: parsedData.shopName || '',
            updatedAt: serverData.updatedAt || Date.now(),
          };
        } catch (decryptError) {
          throw new Error('WRONG_PIN');
        }
      } else {
        // Fallback for unencrypted legacy data (if any existed before encryption was introduced)
        return {
          transactions: serverData.transactions || [],
          expenses: serverData.expenses || [],
          shopName: serverData.shopName || '',
          updatedAt: serverData.updatedAt || Date.now(),
        };
      }
    }
    return null;
  } catch (error: any) {
    if (error.message === 'WRONG_PIN') {
      throw error;
    }
    const errMsg = error?.message || String(error);
    if (errMsg.includes('offline') || errMsg.includes('network') || errMsg.includes('Failed to get document')) {
      console.warn('Firestore is offline. Attempting to retrieve from cache...', errMsg);
      try {
        const cachedSnap = await getDocFromCache(userDocRef);
        if (cachedSnap.exists()) {
          const serverData = cachedSnap.data();
          if (serverData.passcodeHash && serverData.passcodeHash !== clientHash) {
            throw new Error('WRONG_PIN');
          }
          
          if (serverData.encryptedData) {
            const bytes = CryptoJS.AES.decrypt(serverData.encryptedData, passcode);
            const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
            if (!decryptedText) {
              throw new Error('WRONG_PIN');
            }
            const parsedData = JSON.parse(decryptedText);
            return {
              transactions: parsedData.transactions || [],
              expenses: parsedData.expenses || [],
              shopName: parsedData.shopName || '',
              updatedAt: serverData.updatedAt || Date.now(),
            };
          }
          
          return {
            transactions: serverData.transactions || [],
            expenses: serverData.expenses || [],
            shopName: serverData.shopName || '',
            updatedAt: serverData.updatedAt || Date.now(),
          };
        }
      } catch (cacheError: any) {
        if (cacheError.message === 'WRONG_PIN') {
          throw cacheError;
        }
        console.warn('Failed to retrieve from offline cache:', cacheError);
      }
      return null;
    }
    handleFirestoreError(error, OperationType.GET, path);
    return null;
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
 * Sign in with Google Popup specifically requesting Google Drive permissions
 */
export async function signInWithGoogleForDrive(): Promise<{ email: string; accessToken: string }> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const email = result.user.email;
    const accessToken = credential?.accessToken;
    if (!email) {
      throw new Error('No email found in Google account.');
    }
    if (!accessToken) {
      throw new Error('Failed to get access token for Google Drive.');
    }
    return { email, accessToken };
  } catch (error) {
    console.error('Google Drive Sign-In Error:', error);
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

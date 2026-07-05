import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator as CalcIcon,
  Cloud,
  CloudOff,
  Globe,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  AlertCircle,
  Coins,
  History,
  Trash2,
  FileDown,
  FileUp,
  RotateCcw,
  PlusCircle,
  Clock,
  Sparkles,
  Info,
  LogOut,
  ChevronDown,
  Check,
  X,
  Home,
  Settings as SettingsIcon,
  Database,
  User
} from 'lucide-react';

import { Transaction, Expense, CustomerDue, DailySummary } from './types';
import {
  toBanglaNumber,
  formatDate,
  formatTimeStr,
  getTodayDateString,
  formatCurrency,
  generateId
} from './utils';

import { 
  uploadLedgerToCloud, 
  downloadLedgerFromCloud, 
  auth, 
  signInWithGoogle, 
  signInWithGoogleForDrive,
  logOutFromGoogle 
} from './firebase';

import { 
  findBackupFile, 
  createBackupFile, 
  updateBackupFile, 
  downloadBackupFile, 
  DriveBackupData 
} from './utils/driveBackup';

import Calculator from './components/Calculator';
import StatCard from './components/StatCard';
import TransactionList from './components/TransactionList';
import DueList from './components/DueList';
import ExpenseList from './components/ExpenseList';

export default function App() {
  // --- States ---
  const [isBangla, setIsBangla] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Database state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const localTxs = localStorage.getItem('hisab_khata_transactions');
    if (localTxs) {
      try {
        return JSON.parse(localTxs);
      } catch (e) {
        console.error('Failed to parse transactions', e);
      }
    }
    return [];
  });
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const localExpenses = localStorage.getItem('hisab_khata_expenses');
    if (localExpenses) {
      try {
        return JSON.parse(localExpenses);
      } catch (e) {
        console.error('Failed to parse expenses', e);
      }
    }
    return [];
  });
  
  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'dues' | 'expenses'>('dues');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDueListModalOpen, setIsDueListModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [depositingCustomerName, setDepositingCustomerName] = useState<string | null>(null);
  const [modalDepositValue, setModalDepositValue] = useState('');
  const [modalDepositError, setModalDepositError] = useState('');
  const [isSyncActive, setIsSyncActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  
  // Form states (Sale)
  const [productName, setProductName] = useState('');
  const [amount, setAmount] = useState('');
  const [isCashTransaction, setIsCashTransaction] = useState(true);
  const [customerName, setCustomerName] = useState('');
  
  // Form states (Expense)
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  // Info notification toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User details (from environment & local storage)
  const [userEmail, setUserEmail] = useState(() => {
    return localStorage.getItem('hisab_khata_sync_email') || '';
  });
  const [shopName, setShopName] = useState(() => {
    return localStorage.getItem('hisab_khata_shop_name') || '';
  });

  // Google Drive Backup States
  const [driveEmail, setDriveEmail] = useState<string>(() => {
    return localStorage.getItem('hisab_khata_drive_email') || '';
  });
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);
  const [isDriveAutoBackupActive, setIsDriveAutoBackupActive] = useState<boolean>(() => {
    return localStorage.getItem('hisab_khata_drive_auto_backup') === 'true';
  });
  const [isDriveSyncing, setIsDriveSyncing] = useState(false);
  const [driveSyncMessage, setDriveSyncMessage] = useState('');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [currentNavTab, setCurrentNavTab] = useState<'home' | 'monthly' | 'history' | 'settings'>('home');
  const [showAllHistoryTxs, setShowAllHistoryTxs] = useState(false);
  const [showAllTopProducts, setShowAllTopProducts] = useState(false);
  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null);
  const [isOthersModalOpen, setIsOthersModalOpen] = useState(false);

  // Collapse history transaction list when date or navigation tab changes
  useEffect(() => {
    setShowAllHistoryTxs(false);
    setShowAllTopProducts(false);
  }, [selectedDate, currentNavTab]);

  // Delete past date confirmation states
  const [isDeleteDateModalOpen, setIsDeleteDateModalOpen] = useState(false);
  const [deleteDateTarget, setDeleteDateTarget] = useState('');
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Input references for auto-focusing and fluid mobile workflow
  const productInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);

  const handleCustomerSelect = (cust: string) => {
    setCustomerName(cust);
  };

  const handleRefresh = async () => {
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'তথ্য লোড ও রিফ্রেশ করা হচ্ছে...' : 'Refreshing and reloading info...');
    
    // Reset date to today's date
    setSelectedDate(getTodayDateString());
    
    try {
      // 1. Reload local state from localStorage to ensure correct local sync state
      const localTxsStr = localStorage.getItem('hisab_khata_transactions');
      const localExpensesStr = localStorage.getItem('hisab_khata_expenses');
      const localShopName = localStorage.getItem('hisab_khata_shop_name') || '';
      
      const freshLocalTxs = localTxsStr ? JSON.parse(localTxsStr) : transactions;
      const freshLocalExs = localExpensesStr ? JSON.parse(localExpensesStr) : expenses;
      
      setTransactions(freshLocalTxs);
      setExpenses(freshLocalExs);
      setShopName(localShopName);
      
      // 2. If sync is active, perform cloud download
      if (isSyncActive && userEmail && userEmail.trim()) {
        const cloudData = await downloadLedgerFromCloud(userEmail);
        if (cloudData) {
          const localUpdated = localStorage.getItem('hisab_khata_last_updated');
          const localUpdateTime = localUpdated ? parseInt(localUpdated, 10) : 0;
          const cloudUpdateTime = cloudData.updatedAt || 0;
          
          if (cloudUpdateTime >= localUpdateTime) {
            // Cloud is newer or equal, so download and apply
            setTransactions(cloudData.transactions || []);
            setExpenses(cloudData.expenses || []);
            if (cloudData.shopName !== undefined) {
              setShopName(cloudData.shopName);
              localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
            }
            localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
            localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
            localStorage.setItem('hisab_khata_last_updated', String(cloudUpdateTime));
            showToast(isBangla ? 'ক্লাউড থেকে নতুন তথ্য সফলভাবে রিফ্রেশ হয়েছে!' : 'Data refreshed and synced from cloud!');
          } else {
            // Local is newer, so push fresh local data to cloud
            await uploadLedgerToCloud(userEmail, freshLocalTxs, freshLocalExs, localShopName);
            localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
            showToast(isBangla ? 'সর্বশেষ লোকাল ডাটা ক্লাউডে সিঙ্ক করা হয়েছে!' : 'Local data synced to cloud!');
          }
        } else {
          // Cloud doc doesn't exist yet, push fresh local data
          await uploadLedgerToCloud(userEmail, freshLocalTxs, freshLocalExs, localShopName);
          localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
          showToast(isBangla ? 'সফলভাবে রিফ্রেশ সম্পন্ন হয়েছে!' : 'Refresh completed successfully!');
        }
      } else {
        // Just brief delay to make it feel super polished and premium
        await new Promise((resolve) => setTimeout(resolve, 800));
        showToast(isBangla ? 'সফলভাবে তথ্য রিফ্রেশ করা হয়েছে!' : 'Data reloaded successfully!');
      }
    } catch (e) {
      console.error('Refresh failed', e);
      showToast(isBangla ? 'রিফ্রেশ করতে সমস্যা হয়েছে!' : 'Refresh failed!');
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  // --- Real-Time Date & Time updates ---
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // key '0' as '12'
      
      const timeString = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      setCurrentTime(timeString);
      
      // Formatting current active calendar date
      const todayString = getTodayDateString();
      setCurrentDateFormatted(formatDate(todayString, isBangla));
    };

    updateTime();
    const interval = setInterval(updateTime, 15000); // 15 seconds interval to avoid performance lag on low-end phones
    return () => clearInterval(interval);
  }, [isBangla]);

  // --- Track internet connection status ---
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- Load initial data from localStorage ---
  useEffect(() => {
    const localLang = localStorage.getItem('hisab_khata_lang');
    const localSync = localStorage.getItem('hisab_khata_sync');

    if (localLang) {
      setIsBangla(localLang === 'bn');
    }
    if (localSync) {
      setIsSyncActive(localSync === 'true');
    }
  }, []);

  // --- Listen for Firebase Auth changes ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        setUserEmail(user.email);
        localStorage.setItem('hisab_khata_sync_email', user.email);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Auto Sync on App Load ---
  useEffect(() => {
    const runAutoSync = async () => {
      if (isSyncActive && userEmail && userEmail.trim()) {
        try {
          const cloudData = await downloadLedgerFromCloud(userEmail);
          if (cloudData) {
            const localUpdated = localStorage.getItem('hisab_khata_last_updated');
            const localUpdateTime = localUpdated ? parseInt(localUpdated, 10) : 0;
            const cloudUpdateTime = cloudData.updatedAt || 0;
            
            if (cloudUpdateTime > localUpdateTime) {
              setTransactions(cloudData.transactions || []);
              setExpenses(cloudData.expenses || []);
              if (cloudData.shopName) {
                setShopName(cloudData.shopName);
                localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
              }
              localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
              localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
              localStorage.setItem('hisab_khata_last_updated', String(cloudUpdateTime));
              showToast(isBangla ? 'ক্লাউড থেকে নতুন ডাটা আপডেট করা হয়েছে!' : 'Newer data synced from cloud!');
            } else if (localUpdateTime > cloudUpdateTime) {
              await uploadLedgerToCloud(userEmail, transactions, expenses, shopName);
              localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
            }
          } else {
            await uploadLedgerToCloud(userEmail, transactions, expenses, shopName);
            localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
          }
        } catch (e) {
          console.error('Auto sync on load failed', e);
        }
      }
    };

    const timer = setTimeout(() => {
      runAutoSync();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isSyncActive, userEmail]);

  // --- Save to localStorage & trigger Real Sync ---
  const saveTransactionsToStorage = (txList: Transaction[]) => {
    setTransactions(txList);
    localStorage.setItem('hisab_khata_transactions', JSON.stringify(txList));
    const now = Date.now();
    localStorage.setItem('hisab_khata_last_updated', String(now));
    if (isSyncActive) {
      triggerCloudSync(txList, expenses, shopName, userEmail);
    }
    if (isDriveAutoBackupActive && driveAccessToken) {
      triggerDriveBackup(txList, expenses, shopName, true);
    }
  };

  const saveExpensesToStorage = (expList: Expense[]) => {
    setExpenses(expList);
    localStorage.setItem('hisab_khata_expenses', JSON.stringify(expList));
    const now = Date.now();
    localStorage.setItem('hisab_khata_last_updated', String(now));
    if (isSyncActive) {
      triggerCloudSync(transactions, expList, shopName, userEmail);
    }
    if (isDriveAutoBackupActive && driveAccessToken) {
      triggerDriveBackup(transactions, expList, shopName, true);
    }
  };

  // --- Delete and Rename Customer Dues ---
  const handleDeleteCustomerDues = (customerName: string) => {
    const updated = transactions.filter(tx => tx.customer !== customerName);
    saveTransactionsToStorage(updated);
    showToast(isBangla ? 'গ্রাহকের সকল হিসাব ডিলিট করা হয়েছে!' : 'Customer dues deleted successfully!');
  };

  const handleRenameCustomerDues = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName.trim()) return;
    const updated = transactions.map(tx => {
      if (tx.customer === oldName) {
        return { ...tx, customer: newName.trim() };
      }
      return tx;
    });
    saveTransactionsToStorage(updated);
    showToast(isBangla ? 'গ্রাহকের নাম পরিবর্তন করা হয়েছে!' : 'Customer renamed successfully!');
  };

  // --- Delete entire day's records ---
  const handleDeleteDateRecords = (dateToDelete: string) => {
    setDeleteDateTarget(dateToDelete);
    setIsDeleteDateModalOpen(true);
  };

  // --- Back Button Navigation with popstate history ---
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (currentNavTab !== 'home') {
        setCurrentNavTab('home');
        // Restore history entry so that next back press can exit
        window.history.pushState({ tab: 'home' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Set initial home state
    if (!window.history.state) {
      window.history.replaceState({ tab: 'home' }, '');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentNavTab]);

  const handleNavTabChange = (tab: 'home' | 'monthly' | 'history' | 'settings') => {
    setCurrentNavTab(tab);
    if (tab !== 'home') {
      window.history.pushState({ tab }, '');
    }
  };

  // --- Real Firebase Cloud Sync ---
  const triggerCloudSync = async (
    currentTxs: Transaction[] = transactions,
    currentExs: Expense[] = expenses,
    currentShopName: string = shopName,
    currentEmail: string = userEmail
  ) => {
    if (!isSyncActive || !currentEmail || !currentEmail.trim()) return;
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'ফায়ারবেস ক্লাউডে ডেটা সিঙ্ক হচ্ছে...' : 'Syncing data with Firebase Cloud...');
    
    try {
      const now = Date.now();
      await uploadLedgerToCloud(currentEmail, currentTxs, currentExs, currentShopName);
      localStorage.setItem('hisab_khata_last_updated', String(now));
      setIsSyncing(false);
      setSyncMessage('');
      showToast(
        isBangla 
          ? 'ক্লাউড সিঙ্ক সফলভাবে সম্পন্ন হয়েছে!' 
          : 'Cloud sync completed successfully!'
      );
    } catch (e) {
      console.error('Cloud Sync failed', e);
      setIsSyncing(false);
      setSyncMessage('');
      showToast(
        isBangla
          ? 'ক্লাউড সিঙ্ক ব্যর্থ হয়েছে!'
          : 'Cloud sync failed!'
      );
    }
  };

  const toggleSyncState = async (targetEmail?: string) => {
    const emailToUse = targetEmail || userEmail;
    if (!emailToUse || !emailToUse.trim()) {
      showToast(isBangla ? 'অনুগ্রহ করে ইমেইল আইডি দিন।' : 'Please provide an email ID.');
      return;
    }

    if (!isSyncActive) {
      setIsSyncing(true);
      setSyncMessage(isBangla ? 'ফায়ারবেস ক্লাউডে সংযোগ করা হচ্ছে...' : 'Connecting to Firebase Cloud...');
      try {
        const cloudData = await downloadLedgerFromCloud(emailToUse);
        setIsSyncActive(true);
        localStorage.setItem('hisab_khata_sync', 'true');
        localStorage.setItem('hisab_khata_sync_email', emailToUse);
        setUserEmail(emailToUse);
        
        if (cloudData) {
          const localUpdated = localStorage.getItem('hisab_khata_last_updated');
          const localUpdateTime = localUpdated ? parseInt(localUpdated, 10) : 0;
          const cloudUpdateTime = cloudData.updatedAt || 0;
          
          if (cloudUpdateTime > localUpdateTime) {
            setTransactions(cloudData.transactions || []);
            setExpenses(cloudData.expenses || []);
            if (cloudData.shopName) {
              setShopName(cloudData.shopName);
              localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
            }
            localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
            localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
            localStorage.setItem('hisab_khata_last_updated', String(cloudUpdateTime));
            
            showToast(
              isBangla 
                ? 'ক্লাউড থেকে সর্বশেষ ডাটা সফলভাবে ডাউনলোড করা হয়েছে!' 
                : 'Latest data successfully downloaded from cloud!'
            );
          } else {
            await uploadLedgerToCloud(emailToUse, transactions, expenses, shopName);
            localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
            showToast(
              isBangla 
                ? 'ক্লাউডে স্থানীয় ডাটা সফলভাবে আপলোড করা হয়েছে!' 
                : 'Local data successfully uploaded to cloud!'
            );
          }
        } else {
          await uploadLedgerToCloud(emailToUse, transactions, expenses, shopName);
          localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
          showToast(
            isBangla 
              ? `ফায়ারবেস সিঙ্ক চালু হয়েছে (${emailToUse})` 
              : `Firebase Sync Enabled (${emailToUse})`
          );
        }
      } catch (e) {
        console.error('Failed to enable sync', e);
        showToast(isBangla ? 'ফায়ারবেস সিঙ্ক চালু করতে ব্যর্থ হয়েছে!' : 'Failed to enable Firebase sync!');
      } finally {
        setIsSyncing(false);
        setSyncMessage('');
      }
    } else {
      setIsSyncActive(false);
      localStorage.setItem('hisab_khata_sync', 'false');
      showToast(
        isBangla 
          ? 'ফায়ারবেস সিঙ্ক নিষ্ক্রিয় করা হয়েছে।' 
          : 'Firebase Sync Disabled.'
      );
    }
  };

  const handleToggleSync = () => {
    setIsSyncModalOpen(true);
  };

  const handleGoogleLogin = async () => {
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'গুগল অ্যাকাউন্ট কানেক্ট করা হচ্ছে...' : 'Connecting Google Account...');
    try {
      const email = await signInWithGoogle();
      showToast(isBangla ? `গুগল অ্যাকাউন্ট সংযুক্ত হয়েছে: ${email}` : `Connected Google account: ${email}`);
      setShowAuthHelp(false);
      // Automatically toggle sync if not active
      if (!isSyncActive) {
        await toggleSyncState(email);
      }
    } catch (error) {
      console.error('Google Sign-In Error Captured:', error);
      setShowAuthHelp(true);
      showToast(
        isBangla 
          ? 'ব্রাউজারজনিত কারণে গুগল সাইন-ইন অফলাইন! সহজ বিকল্প উপায়টি নিচে দেখুন।' 
          : 'Google sign-in restricted by browser. See alternative sync solution below!'
      );
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  const handleGoogleLogout = async () => {
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'লগআউট করা হচ্ছে...' : 'Signing out...');
    try {
      await logOutFromGoogle();
      setUserEmail('');
      localStorage.removeItem('hisab_khata_sync_email');
      if (isSyncActive) {
        setIsSyncActive(false);
        localStorage.setItem('hisab_khata_sync', 'false');
      }
      showToast(isBangla ? 'সফলভাবে লগআউট করা হয়েছে' : 'Successfully signed out');
    } catch (error) {
      console.error(error);
      showToast(isBangla ? 'লগআউট ব্যর্থ হয়েছে!' : 'Sign-out failed!');
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  // --- Google Drive Backup Actions ---
  const triggerDriveBackup = async (
    currentTxs: Transaction[] = transactions,
    currentExs: Expense[] = expenses,
    currentShopName: string = shopName,
    silent: boolean = false
  ) => {
    if (!driveAccessToken) {
      if (!silent) {
        showToast(isBangla ? 'গুগল ড্রাইভ সংযুক্ত নয়! দয়া করে ড্রাইভ কানেক্ট করুন।' : 'Google Drive not connected! Please connect Drive.');
      }
      return;
    }

    setIsDriveSyncing(true);
    setDriveSyncMessage(isBangla ? 'গুগল ড্রাইভে ব্যাকআপ নেওয়া হচ্ছে...' : 'Backing up to Google Drive...');

    try {
      const backupData: DriveBackupData = {
        transactions: currentTxs,
        expenses: currentExs,
        shopName: currentShopName,
        updatedAt: Date.now(),
        exportDate: new Date().toISOString(),
        creator: driveEmail,
      };

      const existingFileId = await findBackupFile(driveAccessToken);

      if (existingFileId) {
        await updateBackupFile(driveAccessToken, existingFileId, backupData);
      } else {
        await createBackupFile(driveAccessToken, backupData);
      }

      if (!silent) {
        showToast(isBangla ? 'গুগল ড্রাইভে ব্যাকআপ সফলভাবে সংরক্ষিত হয়েছে!' : 'Backup successfully saved to Google Drive!');
      }
    } catch (error: any) {
      console.error('Google Drive backup failed:', error);
      if (error.message === 'UNAUTHORIZED') {
        setDriveAccessToken(null);
        showToast(isBangla ? 'গুগল ড্রাইভ সেশন শেষ হয়েছে, দয়া করে পুনরায় কানেক্ট করুন।' : 'Google Drive session expired, please reconnect.');
      } else {
        if (!silent) {
          showToast(isBangla ? 'গুগল ড্রাইভে ব্যাকআপ রাখতে ব্যর্থ হয়েছে!' : 'Failed to backup to Google Drive!');
        }
      }
    } finally {
      setIsDriveSyncing(false);
      setDriveSyncMessage('');
    }
  };

  const triggerDriveRestore = async () => {
    if (!driveAccessToken) {
      showToast(isBangla ? 'গুগল ড্রাইভ সংযুক্ত নয়! দয়া করে ড্রাইভ কানেক্ট করুন।' : 'Google Drive not connected! Please connect Drive.');
      return;
    }

    const doubleCheck = window.confirm(
      isBangla 
        ? '⚠️ আপনি কি ড্রাইভ থেকে ব্যাকআপ রিস্টোর করতে চান? এটি আপনার বর্তমান ডিভাইসের সকল তথ্য মুছে ড্রাইভের ব্যাকআপ দিয়ে পরিবর্তন করবে।'
        : '⚠️ Are you sure you want to restore from Google Drive? This will overwrite all your current device data with the backup.'
    );
    if (!doubleCheck) return;

    setIsDriveSyncing(true);
    setDriveSyncMessage(isBangla ? 'গুগল ড্রাইভ থেকে ব্যাকআপ খোঁজা হচ্ছে...' : 'Searching for backup in Google Drive...');

    try {
      const fileId = await findBackupFile(driveAccessToken);
      if (!fileId) {
        showToast(isBangla ? 'ড্রাইভে কোনো ব্যাকআপ ফাইল পাওয়া যায়নি!' : 'No backup file found in your Google Drive!');
        return;
      }

      setDriveSyncMessage(isBangla ? 'ব্যাকআপ ডাউনলোড ও রিস্টোর করা হচ্ছে...' : 'Downloading and restoring backup...');
      const backupData = await downloadBackupFile(driveAccessToken, fileId);

      if (Array.isArray(backupData.transactions) && Array.isArray(backupData.expenses)) {
        setTransactions(backupData.transactions);
        setExpenses(backupData.expenses);
        if (backupData.shopName !== undefined) {
          setShopName(backupData.shopName);
          localStorage.setItem('hisab_khata_shop_name', backupData.shopName);
        }
        localStorage.setItem('hisab_khata_transactions', JSON.stringify(backupData.transactions));
        localStorage.setItem('hisab_khata_expenses', JSON.stringify(backupData.expenses));
        localStorage.setItem('hisab_khata_last_updated', String(backupData.updatedAt || Date.now()));

        showToast(isBangla ? 'গুগল ড্রাইভ থেকে সফলভাবে তথ্য রিস্টোর হয়েছে!' : 'Successfully restored data from Google Drive!');

        if (isSyncActive) {
          triggerCloudSync(backupData.transactions, backupData.expenses, backupData.shopName, userEmail);
        }
      } else {
        showToast(isBangla ? 'ভুল ব্যাকআপ ফরম্যাট!' : 'Invalid backup file format!');
      }
    } catch (error: any) {
      console.error('Google Drive restore failed:', error);
      if (error.message === 'UNAUTHORIZED') {
        setDriveAccessToken(null);
        showToast(isBangla ? 'গুগল ড্রাইভ সেশন শেষ হয়েছে, দয়া করে পুনরায় কানেক্ট করুন।' : 'Google Drive session expired, please reconnect.');
      } else {
        showToast(isBangla ? 'রিস্টোর করতে সমস্যা হয়েছে!' : 'Failed to restore from Google Drive!');
      }
    } finally {
      setIsDriveSyncing(false);
      setDriveSyncMessage('');
    }
  };

  const handleDriveConnect = async () => {
    setIsDriveSyncing(true);
    setDriveSyncMessage(isBangla ? 'গুগল ড্রাইভ কানেক্ট করা হচ্ছে...' : 'Connecting Google Drive...');
    try {
      const result = await signInWithGoogleForDrive();
      setDriveEmail(result.email);
      setDriveAccessToken(result.accessToken);
      localStorage.setItem('hisab_khata_drive_email', result.email);
      showToast(isBangla ? `গুগল ড্রাইভ সংযুক্ত হয়েছে: ${result.email}` : `Connected Google Drive: ${result.email}`);
    } catch (error) {
      console.error('Drive connect error:', error);
      showToast(isBangla ? 'গুগল ড্রাইভ সংযোগ ব্যর্থ হয়েছে!' : 'Google Drive connection failed!');
    } finally {
      setIsDriveSyncing(false);
      setDriveSyncMessage('');
    }
  };

  const handleDriveDisconnect = async () => {
    setDriveEmail('');
    setDriveAccessToken(null);
    localStorage.removeItem('hisab_khata_drive_email');
    setIsDriveAutoBackupActive(false);
    localStorage.setItem('hisab_khata_drive_auto_backup', 'false');
    showToast(isBangla ? 'গুগল ড্রাইভ সংযোগ বিচ্ছিন্ন করা হয়েছে' : 'Google Drive disconnected');
  };

  // Language Toggler
  const toggleLanguage = () => {
    const nextLang = !isBangla;
    setIsBangla(nextLang);
    localStorage.setItem('hisab_khata_lang', nextLang ? 'bn' : 'en');
  };

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // --- Calculations for Current Selected Date ---
  
  // Filter transactions and expenses for the selected date
  const todayTransactions = transactions.filter((tx) => tx.date === selectedDate);
  const todayExpenses = expenses.filter((ex) => ex.date === selectedDate);

  // Dynamic calculations
  const todaySales = todayTransactions.reduce((sum, tx) => {
    // Only regular sales count as total sales (exclude due payment collections as they are already accounted for in sales of the day credit was given, or treated as cash flow).
    // Wait, the user's Flutter app says: 
    // totalSales += amount; 
    // when adding a transaction, and when depositing due: cashDeposit += amount; totalSales += amount;
    // To match this literal Flutter app behavior perfectly, we will count all today's ledger entry amounts in total sales!
    return sum + tx.amount;
  }, 0);

  const todayCashDeposit = todayTransactions.reduce((sum, tx) => {
    return sum + (tx.isCash ? tx.amount : 0);
  }, 0);

  const todayDueTaken = todayTransactions.reduce((sum, tx) => {
    return sum + (!tx.isCash ? tx.amount : 0);
  }, 0);

  const todayExpenseTotal = todayExpenses.reduce((sum, ex) => sum + ex.amount, 0);

  // --- Global Customer Due Calculation across all time ---
  // Calculates live customer due lists dynamically from all recorded transactions.
  const getCustomerDues = (): CustomerDue[] => {
    const duesMap: Record<string, { amount: number; lastDate: string; lastTime: string }> = {};
    
    // Sort transactions chronologically to build correct cumulative balances
    const sortedTxs = [...transactions].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
    
    sortedTxs.forEach((tx) => {
      if (!tx.product || !tx.product.trim()) return;
      const name = tx.customer.trim();
      if (!name) return;
      
      if (!tx.isCash) {
        // Due taken (increases balance)
        if (!duesMap[name]) {
          duesMap[name] = { amount: 0, lastDate: '', lastTime: '' };
        }
        duesMap[name].amount += tx.amount;
        duesMap[name].lastDate = tx.date;
        duesMap[name].lastTime = tx.time;
      } else if (tx.product.startsWith('বাকির টাকা জমা') || tx.product.startsWith('বাকি টাকা জমা') || tx.product.includes('Due Deposit')) {
        // Due deposit payment (reduces balance)
        if (!duesMap[name]) {
          duesMap[name] = { amount: 0, lastDate: '', lastTime: '' };
        }
        duesMap[name].amount -= tx.amount;
        duesMap[name].lastDate = tx.date;
        duesMap[name].lastTime = tx.time;
      }
    });

    return Object.keys(duesMap)
      .map((name) => ({
        name,
        amount: duesMap[name].amount,
        lastDate: duesMap[name].lastDate,
        lastTime: duesMap[name].lastTime,
      }))
      .filter((cd) => cd.amount > 0);
  };

  const customerDues = getCustomerDues();
  const globalTotalDue = customerDues.reduce((sum, cd) => sum + cd.amount, 0);

  // --- All-time Product Sales Helper for Donut Chart ---
  const getAllTimeProductSales = () => {
    const productSalesMap: Record<string, { name: string; count: number; amount: number }> = {};
    let totalAllTimeSalesAmount = 0;

    transactions.forEach(tx => {
      const prodLower = tx.product.toLowerCase().trim();
      // Exclude due deposits (which are not product sales)
      if (
        prodLower.startsWith('বাকি টাকা জমা') || 
        prodLower.startsWith('বাকির টাকা জমা') || 
        prodLower.includes('due deposit')
      ) {
        return;
      }

      // Split by '+' sign and trim each part
      const parts = tx.product.split('+').map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) return;

      const splitAmount = tx.amount / parts.length;

      parts.forEach(part => {
        const key = part.toLowerCase();
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            name: part,
            count: 0,
            amount: 0
          };
        }
        productSalesMap[key].count += 1;
        productSalesMap[key].amount += splitAmount;
        totalAllTimeSalesAmount += splitAmount;
      });
    });

    const items = Object.values(productSalesMap).sort((a, b) => b.amount - a.amount);
    return { items, totalAmount: totalAllTimeSalesAmount };
  };

  const allTimeSales = getAllTimeProductSales();
  
  // Group everything after top 6 into 'Others' (অন্যান্য)
  const getChartData = () => {
    const chartDataList: { name: string; amount: number; count: number; percentage: number; color: string }[] = [];
    if (allTimeSales.totalAmount > 0 && allTimeSales.items.length > 0) {
      const topCount = 6;
      const topItems = allTimeSales.items.slice(0, topCount);
      const otherItems = allTimeSales.items.slice(topCount);
      
      // Diverse, beautiful colors with only the first being Red
      const colors = ['#EF4444', '#10B981', '#4F46E5', '#F59E0B', '#8B5CF6', '#06B6D4'];
      
      topItems.forEach((item, idx) => {
        chartDataList.push({
          name: item.name,
          amount: item.amount,
          count: item.count,
          percentage: (item.amount / allTimeSales.totalAmount) * 100,
          color: colors[idx % colors.length]
        });
      });
      
      if (otherItems.length > 0) {
        const otherAmount = otherItems.reduce((sum, item) => sum + item.amount, 0);
        const otherCount = otherItems.reduce((sum, item) => sum + item.count, 0);
        chartDataList.push({
          name: isBangla ? 'অন্যান্য' : 'Others',
          amount: otherAmount,
          count: otherCount,
          percentage: (otherAmount / allTimeSales.totalAmount) * 100,
          color: '#64748B' // Gray for others
        });
      }
    }
    return chartDataList;
  };

  const chartData = getChartData();
  
  // Pre-calculate accumulated offsets for correct SVG rendering of donut slices
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159
  const accumulatedOffsetArray: number[] = [];
  let runningOffset = 0;
  chartData.forEach(data => {
    accumulatedOffsetArray.push(runningOffset);
    runningOffset += (data.percentage / 100) * circumference;
  });

  const filteredModalDues = customerDues.filter((cd) =>
    cd.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  // Find previous customer names for quick selection
  const previousCustomers = Array.from(
    new Set(
      transactions
        .map((tx) => tx.customer?.trim())
        .filter((name): name is string => typeof name === 'string' && name.length > 0)
    )
  ).slice(0, 8) as string[];

  // Get monthly stats
  const getMonthlyStats = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const monthlyExs = expenses.filter(ex => {
      const d = new Date(ex.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const sales = monthlyTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const cash = monthlyTxs.reduce((sum, tx) => sum + (tx.isCash ? tx.amount : 0), 0);
    const due = monthlyTxs.reduce((sum, tx) => sum + (!tx.isCash ? tx.amount : 0), 0);
    const expense = monthlyExs.reduce((sum, ex) => sum + ex.amount, 0);
    
    return { sales, cash, due, expense };
  };

  // Get top selling products of the month
  const getTopSellingProducts = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlySalesTxs = transactions.filter(tx => {
      const d = new Date(tx.date);
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (!isCurrentMonth) return false;
      
      const prodLower = tx.product.toLowerCase().trim();
      // Exclude due deposits (which are not product sales)
      if (
        prodLower.startsWith('বাকি টাকা জমা') || 
        prodLower.startsWith('বাকির টাকা জমা') || 
        prodLower.includes('due deposit') ||
        prodLower.includes('বাকি টাকা জমা')
      ) {
        return false;
      }
      return true;
    });

    const productSalesMap: Record<string, { name: string; count: number; amount: number }> = {};

    monthlySalesTxs.forEach(tx => {
      // Split by '+' sign and trim each part
      const parts = tx.product.split('+').map(p => p.trim()).filter(Boolean);
      if (parts.length === 0) return;

      const splitAmount = tx.amount / parts.length;

      parts.forEach(part => {
        const key = part.toLowerCase(); // Use lowercase as map key to aggregate matches
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            name: part, // Keep original casing
            count: 0,
            amount: 0
          };
        }
        productSalesMap[key].count += 1;
        productSalesMap[key].amount += splitAmount;
      });
    });

    // Convert to array and sort by total times sold/count (descending), tie-break with amount
    return Object.values(productSalesMap).sort((a, b) => b.count - a.count || b.amount - a.amount);
  };

  // Get all transaction details for a top-selling product
  const getTransactionsForProduct = (prodName: string) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const prodLower = prodName.toLowerCase().trim();
    
    return transactions.filter(tx => {
      const d = new Date(tx.date);
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (!isCurrentMonth) return false;
      
      const parts = tx.product.split('+').map(p => p.trim().toLowerCase()).filter(Boolean);
      return parts.includes(prodLower);
    });
  };

  // --- Core Actions ---

  // Add a sale/transaction
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !amount) return;
    const price = parseFloat(amount);
    if (isNaN(price) || price <= 0) return;
    if (!isCashTransaction && !customerName.trim()) return;

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const newTx: Transaction = {
      id: generateId(),
      date: selectedDate,
      time: timeFormatted,
      product: productName.trim(),
      amount: price,
      isCash: isCashTransaction,
      customer: isCashTransaction ? '' : customerName.trim()
    };

    const updated = [newTx, ...transactions];
    saveTransactionsToStorage(updated);

    // Reset Form
    setProductName('');
    setAmount('');
    setIsCashTransaction(true);
    setCustomerName('');

    showToast(isBangla ? 'বিক্রি সফলভাবে হিসাবভুক্ত হয়েছে!' : 'Sale added to ledger!');
  };

  // Add an expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount) return;
    const cost = parseFloat(expenseAmount);
    if (isNaN(cost) || cost <= 0) return;

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const newEx: Expense = {
      id: generateId(),
      date: selectedDate,
      time: timeFormatted,
      description: expenseDesc.trim(),
      amount: cost
    };

    const updated = [newEx, ...expenses];
    saveExpensesToStorage(updated);

    // Reset Form & Close Modal
    setExpenseDesc('');
    setExpenseAmount('');
    setIsExpenseModalOpen(false);

    showToast(isBangla ? 'আজকের খরচ হিসাবভুক্ত হয়েছে!' : 'Expense saved successfully!');
  };

  // Delete expense
  const handleDeleteExpense = (id: string) => {
    const confirmation = window.confirm(
      isBangla
        ? 'আপনি কি নিশ্চিতভাবে এই খরচের হিসাবটি মুছে ফেলতে চান?'
        : 'Are you sure you want to delete this expense?'
    );
    if (!confirmation) return;

    const updated = expenses.filter((ex) => ex.id !== id);
    saveExpensesToStorage(updated);
    showToast(isBangla ? 'খরচের হিসাবটি মুছে ফেলা হয়েছে' : 'Expense entry deleted');
  };

  // Update expense
  const handleUpdateExpense = (updatedEx: Expense) => {
    const updated = expenses.map((ex) => (ex.id === updatedEx.id ? updatedEx : ex));
    saveExpensesToStorage(updated);
    showToast(isBangla ? 'খরচের হিসাবটি আপডেট করা হয়েছে' : 'Expense entry updated');
  };

  // Handle Due Deposit (বাকির টাকা জমা)
  const handleDueDeposit = (custName: string, depositAmt: number) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const newTx: Transaction = {
      id: generateId(),
      date: selectedDate,
      time: timeFormatted,
      product: isBangla ? `বাকি টাকা জমা (${custName})` : `Due Deposit (${custName})`,
      amount: depositAmt,
      isCash: true,
      customer: custName // Save customer name so getCustomerDues can match it
    };

    const updated = [newTx, ...transactions];
    saveTransactionsToStorage(updated);
    
    showToast(
      isBangla 
        ? `${custName}-এর কাছ থেকে ${formatCurrency(depositAmt, true)} জমা নেওয়া হয়েছে` 
        : `Deposited ${formatCurrency(depositAmt, false)} from ${custName}`
    );
  };

  // Delete transaction with safety rollback
  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((tx) => tx.id !== id);
    saveTransactionsToStorage(updated);
    showToast(isBangla ? 'হিসাবটি সফলভাবে মোছা হয়েছে' : 'Ledger entry deleted');
  };

  // Update a transaction (Edit inline)
  const handleUpdateTransaction = (updatedTx: Transaction) => {
    const updated = transactions.map((tx) => (tx.id === updatedTx.id ? updatedTx : tx));
    saveTransactionsToStorage(updated);
    showToast(isBangla ? 'হিসাবটি সফলভাবে আপডেট করা হয়েছে' : 'Ledger entry updated');
  };

  // --- Navigation & Calendar Helpers ---
  const navigateDay = (direction: 'prev' | 'next') => {
    const d = new Date(selectedDate);
    if (direction === 'prev') {
      d.setDate(d.getDate() - 1);
    } else {
      d.setDate(d.getDate() + 1);
    }
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Popular pre-fill products
  const popularBanglaProducts = ['চাল', 'ডাল', 'সয়াবিন তেল', 'ডিম', 'চিনি', 'আটা', 'সাবান', 'দুধ', 'জেনারেল বিক্রি'];
  const popularEnglishProducts = ['Rice', 'Lentils', 'Soybean Oil', 'Eggs', 'Sugar', 'Flour', 'Soap', 'Milk', 'General Sale'];
  const popularProducts = isBangla ? popularBanglaProducts : popularEnglishProducts;

  // --- Export and Import backup files (JSON) ---
  const handleExportBackup = () => {
    const backupData = {
      transactions,
      expenses,
      exportDate: new Date().toISOString(),
      creator: userEmail
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hisab_khata_backup_${selectedDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(isBangla ? 'ব্যাকআপ ফাইলটি ডাউনলোড হয়েছে!' : 'Backup downloaded successfully!');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed.transactions) && Array.isArray(parsed.expenses)) {
          setTransactions(parsed.transactions);
          setExpenses(parsed.expenses);
          localStorage.setItem('hisab_khata_transactions', JSON.stringify(parsed.transactions));
          localStorage.setItem('hisab_khata_expenses', JSON.stringify(parsed.expenses));
          showToast(isBangla ? 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!' : 'Backup restored successfully!');
          triggerCloudSync();
        } else {
          alert(isBangla ? 'ভুল ফরম্যাট! সঠিক ব্যাকআপ ফাইল নির্বাচন করুন।' : 'Invalid backup format!');
        }
      } catch (err) {
        alert(isBangla ? 'ফাইল পড়তে ত্রুটি হয়েছে!' : 'Error parsing backup file!');
      }
    };
    reader.readAsText(file);
  };

  // Hard Reset Database option
  const handleHardReset = () => {
    const doubleCheck = window.confirm(
      isBangla 
        ? '⚠️ আপনি কি নিশ্চিতভাবে সমস্ত ডেটা মুছে ফেলে খাতা সম্পূর্ণ খালি করতে চান? এই কাজ আর ফেরত নেওয়া যাবে না।' 
        : '⚠️ ARE YOU SURE you want to clear all ledger data? This action cannot be undone!'
    );
    if (!doubleCheck) return;

    setTransactions([]);
    setExpenses([]);
    localStorage.removeItem('hisab_khata_transactions');
    localStorage.removeItem('hisab_khata_expenses');
    showToast(isBangla ? 'সমস্ত হিসাব মুছে খাতা খালি করা হয়েছে।' : 'All ledger data cleared.');
    triggerCloudSync();
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 antialiased font-sans flex flex-col pb-24 relative overflow-x-hidden">
      
      {/* --- Fixed Top Area (Progress Bar + Header) --- */}
      <div className="fixed top-0 left-0 right-0 z-40 flex flex-col shadow-xs border-b border-slate-100">
        {/* 🚀 Top Simulated Cloud Sync Active Progress Bar */}
        <AnimatePresence>
          {(isSyncing || isDriveSyncing) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`${isDriveSyncing ? 'bg-indigo-600' : 'bg-teal-600'} text-white text-xs py-2 px-4 flex items-center justify-between shadow-inner relative overflow-hidden z-50`}
              id="sync-progressbar"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span className="font-medium">{syncMessage || driveSyncMessage}</span>
              </div>
              {/* Infinite loading line */}
              <div className={`absolute bottom-0 left-0 h-[2px] ${isDriveSyncing ? 'bg-indigo-300' : 'bg-emerald-300'} animate-[loading_1.5s_infinite_linear]`} style={{ width: '40%' }}></div>
            </motion.div>
          )}
        </AnimatePresence>
   
        {/* --- App Header & Action Bar --- */}
        <header className="bg-white py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-3">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2">
              <img
                src="/src/assets/logo.jpg"
                alt="হিসাব খাতা"
                className="h-10 w-10 rounded-xl object-cover shadow-sm border border-slate-200/60 shrink-0 transition-transform duration-250 active:scale-95"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 font-sans leading-none">
                    {isBangla ? 'হিসাব খাতা' : 'Hisab Khata'}
                  </h1>
                  {isOnline ? (
                    <span className="text-[8px] sm:text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded-md uppercase leading-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {isBangla ? 'অনলাইন' : 'Online'}
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200/50 px-1.5 py-0.5 rounded-md uppercase leading-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                      {isBangla ? 'অফলাইন' : 'Offline'}
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 truncate mt-1 max-w-[150px] sm:max-w-[250px]" id="shop-name-title">
                  <span className="text-teal-600 font-mono font-bold mr-1.5 md:hidden inline-block">{currentTime} •</span>
                  {shopName || (isBangla ? 'মেসার্স জনি ট্রেডার্স' : 'M/S Jony Traders')}
                </span>
              </div>
            </div>
   
            {/* Header Action Tools */}
            <div className="flex items-center gap-2 shrink-0">
              
              {/* Real-time Date & Clock above buttons */}
              <div className="hidden md:flex items-center gap-2 text-[10px] text-slate-600 font-mono bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg select-none">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-slate-700">
                  {currentDateFormatted} • {currentTime}
                </span>
              </div>
   
              {/* Action Buttons row */}
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
   
                {/* Manual Refresh Action */}
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isSyncing}
                  className="p-1 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200 text-emerald-700 rounded-md shadow-3xs transition-all flex items-center justify-center cursor-pointer h-8 w-8 active:scale-95 shrink-0 disabled:opacity-50"
                  title={isBangla ? 'তথ্য রিফ্রেশ করুন' : 'Refresh Ledger'}
                  id="manual-refresh-btn"
                >
                  <RotateCcw className={`h-4 w-4 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
   
                {/* Quick Calculator Action */}
                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="p-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md shadow-3xs transition-all flex items-center justify-center cursor-pointer h-8 w-8 active:scale-95 shrink-0"
                  title={isBangla ? 'ক্যালকুলেটর চালু করুন' : 'Open Calculator'}
                  id="calc-trigger-btn"
                >
                  <CalcIcon className="h-4 w-4 text-slate-600" />
                </button>
     
                {/* Google Cloud Sync Controller */}
                <button
                  type="button"
                  onClick={handleToggleSync}
                  className={`flex items-center justify-center border transition-all cursor-pointer h-8 shadow-3xs active:scale-95 shrink-0 rounded-md ${
                    isSyncActive
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  } w-8 sm:w-auto sm:px-2.5 sm:gap-1.5`}
                  id="google-sync-toggle"
                  title={isSyncActive ? (isBangla ? 'ক্লাউড সিঙ্ক চালু' : 'Cloud Sync Active') : (isBangla ? 'ক্লাউড সিঙ্ক বন্ধ' : 'Cloud Sync Inactive')}
                >
                  {isSyncActive ? (
                    <>
                      <Cloud className="h-4 w-4 animate-pulse text-emerald-600" />
                      <span className="hidden sm:inline text-[11px] font-black">{isBangla ? 'সিঙ্ক চালু' : 'Sync On'}</span>
                    </>
                  ) : (
                    <>
                      <CloudOff className="h-4 w-4 text-rose-500" />
                      <span className="hidden sm:inline text-[11px] font-black">{isBangla ? 'সিঙ্ক বন্ধ' : 'Sync Off'}</span>
                    </>
                  )}
                </button>
   
                {/* Language Selection Toggle */}
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="bg-white hover:bg-slate-50 border border-slate-200 rounded-md text-[11px] font-black text-slate-700 h-8 shadow-3xs transition-all flex items-center justify-center cursor-pointer active:scale-95 shrink-0 w-8 sm:w-auto sm:px-2 sm:gap-1"
                  id="lang-toggler"
                  title={isBangla ? 'ভাষা পরিবর্তন করুন' : 'Change Language'}
                >
                  <Globe className="h-4 w-4 text-indigo-500 sm:block hidden" />
                  <span className="text-[10px] sm:text-[11px] font-black text-indigo-600 sm:text-slate-700">{isBangla ? 'EN' : 'বাং'}</span>
                </button>
              </div>
   
            </div>
          </div>
        </header>
      </div>


      {/* --- Main Contents Container --- */}
      <main className="max-w-7xl mx-auto w-full px-4 py-4 pt-[84px] flex-1 flex flex-col gap-4">

        <AnimatePresence mode="wait">
        {/* --- 1. HOME TAB VIEW --- */}
        {currentNavTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="space-y-4"
          >
            
            {/* STATS CARDS GRID - INSIDE HOME TAB */}
            <div className="max-w-xl mx-auto w-full px-1 sm:px-0">
              <section className="grid grid-cols-2 gap-3" id="stats-dashboard-grid">
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'মোট বিক্রি' : 'Total Sales'}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-emerald-600 block mt-1">
                    {formatCurrency(todaySales, isBangla)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'নগদ জমা' : 'Cash Deposit'}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-blue-600 block mt-1">
                    {formatCurrency(todayCashDeposit, isBangla)}
                  </span>
                </div>

                <div 
                  onClick={() => setIsDueListModalOpen(true)}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'আজকের বাকি' : "Today's Due"}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-amber-600 block mt-1">
                    {formatCurrency(todayDueTaken, isBangla)}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'আজকের খরচ' : "Today's Expense"}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-rose-600 block mt-1">
                    {formatCurrency(todayExpenseTotal, isBangla)}
                  </span>
                </div>

              </section>
            </div>
            
            {/* CENTERED & COMPACT SINGLE-COLUMN WORKSPACE */}
            <div className="max-w-xl mx-auto w-full space-y-4">
              
              {/* 1. Add Transaction Form Card */}
              <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <span className="text-[12px] font-black uppercase text-slate-500 tracking-wider">
                    {isBangla ? 'বেচাকেনা খতিয়ান ভুক্তি' : 'Transaction Entry'}
                  </span>
                  {/* Small & simple Expense Button */}
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-black rounded-lg border border-rose-200/40 transition-colors flex items-center gap-1 cursor-pointer"
                    id="small-expense-btn"
                  >
                    <PlusCircle className="h-3 w-3" />
                    <span>{isBangla ? 'খরচ যোগ করুন' : 'Add Expense'}</span>
                  </button>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-3.5">
                  
                  {/* Inputs Grid */}
                  <div className="grid grid-cols-12 gap-3">
                    {/* Product Name */}
                    <div className="col-span-7">
                      <label className="block text-xs font-black text-slate-600 mb-1 flex items-center gap-1">
                        <span>🛍️</span>
                        <span>{isBangla ? 'পণ্যের নাম' : 'Product Name'}</span>
                      </label>
                      <input
                        ref={productInputRef}
                        type="text"
                        required
                        placeholder={isBangla ? 'পণ্যের নাম লিখুন' : 'Enter product name'}
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full text-base px-3 py-2.5 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-teal-50/20 transition-all font-semibold text-slate-900 h-12"
                        id="product-input"
                      />
                    </div>

                    {/* Price */}
                    <div className="col-span-5">
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-black text-slate-600 flex items-center gap-1">
                          <span>৳</span>
                          <span>{isBangla ? 'দাম (৳)' : 'Price (৳)'}</span>
                        </label>
                      </div>
                      <input
                        ref={amountInputRef}
                        type="number"
                        inputMode="decimal"
                        required
                        placeholder="৳ ০.০০"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full text-base px-3 py-2.5 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-teal-50/20 transition-all font-sans font-black text-slate-900 h-12"
                        id="amount-input"
                      />
                    </div>
                  </div>

                  {/* Payment Type Selection (Mini capsule toggle) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-50">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500">
                        {isBangla ? 'পেমেন্ট ধরন:' : 'Payment:'}
                      </span>
                      <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCashTransaction(true);
                            setCustomerName('');
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                            isCashTransaction
                              ? 'bg-emerald-600 text-white shadow-3xs'
                              : 'text-slate-500 hover:text-slate-600'
                          }`}
                          id="type-cash-btn"
                        >
                          <span>{isBangla ? 'নগদ' : 'Cash'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCashTransaction(false);
                            // Auto focus customer input
                            setTimeout(() => {
                              customerInputRef.current?.focus();
                            }, 100);
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                            !isCashTransaction
                              ? 'bg-[#E91E63] text-white shadow-3xs'
                              : 'text-slate-500 hover:text-slate-600'
                          }`}
                          id="type-due-btn"
                        >
                          <span>{isBangla ? 'বাকি' : 'Due'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Conditional Customer Name Input inline when space is narrow */}
                    {!isCashTransaction && (
                      <div className="flex-1 flex items-center gap-2">
                        <label className="shrink-0 text-xs font-black text-slate-600 flex items-center gap-1">
                          <span>👤</span>
                          <span>{isBangla ? 'কাস্টমার:' : "Customer:"}</span>
                        </label>
                        <input
                          ref={customerInputRef}
                          type="text"
                          required={!isCashTransaction}
                          placeholder={isBangla ? 'যেমন: রহিম' : 'e.g. Rahim'}
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/20 transition-all font-semibold h-9"
                          id="customer-input"
                        />
                      </div>
                    )}
                  </div>

                  {/* Existing Customers Quick-Select Suggestion tags */}
                  {!isCashTransaction && previousCustomers.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5 max-w-full">
                      <span className="shrink-0 text-[8px] font-bold text-slate-400 self-center mr-1">
                        {isBangla ? 'কাস্টমার চয়ন:' : 'Quick Select:'}
                      </span>
                      {previousCustomers.map((cust) => (
                        <button
                          key={cust}
                          type="button"
                          onClick={() => handleCustomerSelect(cust)}
                          className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded-md border transition-all cursor-pointer active:scale-95 ${
                            customerName === cust
                              ? 'bg-amber-600 border-amber-600 text-white'
                              : 'bg-amber-50 hover:bg-amber-100 border-amber-200/50 text-amber-800'
                          }`}
                        >
                          {cust}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Submit save button */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#009688] hover:bg-[#00897B] text-white font-black text-sm rounded-xl shadow-sm shadow-teal-700/5 hover:shadow transition-all active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer h-12"
                    id="submit-transaction-btn"
                  >
                    <Check className="h-4 w-4 stroke-[3.5]" />
                    <span>{isBangla ? 'হিসাব সেভ করুন' : 'Save Transaction'}</span>
                  </button>

                </form>
              </div>

                {/* 2. Today's Sales List */}
                <TransactionList
                  transactions={todayTransactions}
                  isBangla={isBangla}
                  onDelete={handleDeleteTransaction}
                  onUpdate={handleUpdateTransaction}
                />

              </div>

              {/* Tab Selector Capsule */}
              <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 flex items-center gap-1.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('dues')}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === 'dues'
                      ? 'bg-white text-rose-800 shadow-sm border border-slate-200/40'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {isBangla ? 'বাকি খাতা (Dues)' : 'Dues'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expenses')}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all text-center cursor-pointer ${
                    activeTab === 'expenses'
                      ? 'bg-white text-amber-800 shadow-sm border border-slate-200/40'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {isBangla ? 'খরচ (Expenses)' : 'Expenses'}
                </button>
              </div>

              {/* Active List Panel Content */}
              <div className="relative">
                {activeTab === 'dues' && (
                  <DueList
                    dueList={customerDues}
                    isBangla={isBangla}
                    onDeposit={handleDueDeposit}
                    onDelete={handleDeleteCustomerDues}
                    onRename={handleRenameCustomerDues}
                  />
                )}

                {activeTab === 'expenses' && (
                  <ExpenseList
                    expenses={todayExpenses}
                    isBangla={isBangla}
                    onDelete={handleDeleteExpense}
                    onUpdate={handleUpdateExpense}
                    todayExpenseTotal={todayExpenseTotal}
                  />
                )}
              </div>
          </motion.div>
        )}

        {/* --- 2. MONTHLY REPORT TAB VIEW --- */}
        {currentNavTab === 'monthly' && (
          <motion.div
            key="monthly"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="max-w-4xl mx-auto w-full px-4 py-4 space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'মাসিক মোট বিক্রি' : 'Monthly Sales'}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-emerald-600 block mt-1">
                  {formatCurrency(getMonthlyStats().sales, isBangla)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'মাসিক নগদ জমা' : 'Monthly Cash'}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-blue-600 block mt-1">
                  {formatCurrency(getMonthlyStats().cash, isBangla)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'মাসিক মোট বাকি' : 'Monthly Due'}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-amber-600 block mt-1">
                  {formatCurrency(getMonthlyStats().due, isBangla)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'মাসিক মোট খরচ' : 'Monthly Expenses'}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-rose-600 block mt-1">
                  {formatCurrency(getMonthlyStats().expense, isBangla)}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                <span>{isBangla ? 'বেচাকেনা বনাম খরচের দিনভিত্তিক তুলনা' : 'Daily Sales vs Expenses Comparison'}</span>
              </h3>

              <div className="pt-2">
                {transactions.length === 0 && expenses.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-medium">
                    {isBangla ? 'চার্ট দেখানোর মতো প্রয়োজনীয় হিসাব নেই' : 'No data available to display chart'}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {Array.from(new Set([...transactions.map(t => t.date), ...expenses.map(e => e.date)]))
                      .sort((a, b) => b.localeCompare(a))
                      .slice(0, 5)
                      .map(dateStr => {
                        const daySales = transactions.filter(t => t.date === dateStr).reduce((s, t) => s + t.amount, 0);
                        const dayExpenses = expenses.filter(e => e.date === dateStr).reduce((s, e) => s + e.amount, 0);
                        const maxVal = Math.max(daySales, dayExpenses, 100);
                        
                        const salesPercent = (daySales / maxVal) * 100;
                        const expensePercent = (dayExpenses / maxVal) * 100;

                        return (
                          <div key={dateStr} className="space-y-1">
                            <span className="text-[11px] font-extrabold text-slate-600 block font-mono">
                              {formatDate(dateStr, isBangla)}
                            </span>
                            
                            <div className="space-y-1.5">
                              {daySales > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-slate-400 w-12 text-right">{isBangla ? 'বিক্রি' : 'Sale'}</span>
                                  <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${salesPercent}%` }}
                                      className="bg-emerald-500 h-full rounded-full"
                                    />
                                  </div>
                                  <span className="text-[10px] font-black text-emerald-600 font-sans w-16">{formatCurrency(daySales, isBangla)}</span>
                                </div>
                              )}

                              {dayExpenses > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-bold text-slate-400 w-12 text-right">{isBangla ? 'খরচ' : 'Exp'}</span>
                                  <div className="flex-1 bg-slate-100 h-3 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${expensePercent}%` }}
                                      className="bg-rose-500 h-full rounded-full"
                                    />
                                  </div>
                                  <span className="text-[10px] font-black text-rose-600 font-sans w-16">{formatCurrency(dayExpenses, isBangla)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* সর্বাধিক বিক্রীত পণ্যসমূহ (Top Selling Products) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-teal-600" />
                <span>{isBangla ? 'সর্বাধিক বিক্রীত পণ্যসমূহ (এই মাস)' : 'Top Selling Products (This Month)'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 -mt-2 leading-relaxed">
                {isBangla 
                  ? 'পণ্যের নাম এবং প্লাস (+) চিহ্নযুক্ত মিশ্র পণ্যের হিসাবসহ মোট বিক্রয় ও বিক্রির সংখ্যা।' 
                  : 'Breakdown of sales, including splits from combined (+) product listings.'}
              </p>

              <div className="pt-1">
                {getTopSellingProducts().length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                    {isBangla ? 'চলতি মাসে কোনো পণ্য বিক্রি হয়নি।' : 'No products sold this month.'}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {(showAllTopProducts ? getTopSellingProducts() : getTopSellingProducts().slice(0, 8)).map((item, index) => {
                      const allProducts = getTopSellingProducts();
                      const maxVal = allProducts.length > 0 ? allProducts[0].count : 1;
                      const percent = (item.count / maxVal) * 100;

                      return (
                        <div 
                          key={item.name} 
                          onClick={() => setSelectedProductForDetail(item.name)}
                          className="space-y-1 cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl -mx-2 transition-all active:scale-[0.99] border border-transparent hover:border-slate-150"
                          title={isBangla ? 'বিস্তারিত ও ডিলিট অপশন দেখতে ক্লিক করুন' : 'Click to view details and delete options'}
                        >
                          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[10px] text-teal-700 font-black border border-teal-100/50 font-mono">
                                {isBangla ? toBanglaNumber(index + 1) : index + 1}
                              </span>
                              <span className="font-extrabold text-slate-800 truncate underline decoration-dotted decoration-teal-400 underline-offset-2">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-right shrink-0">
                              <span className="text-[10px] text-slate-400 font-extrabold">
                                {isBangla ? `${toBanglaNumber(item.count)} বার` : `${item.count} times`}
                              </span>
                              <span className="text-teal-600 font-sans font-black">
                                {formatCurrency(item.amount, isBangla)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex-grow bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percent}%` }}
                                className="bg-teal-500 h-full rounded-full"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {getTopSellingProducts().length > 8 && (
                      <button
                        type="button"
                        onClick={() => setShowAllTopProducts(!showAllTopProducts)}
                        className="w-full mt-2 py-2 text-xs font-extrabold text-teal-600 hover:text-teal-800 hover:bg-slate-100/50 border border-slate-200/50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                      >
                        <span>
                          {showAllTopProducts 
                            ? (isBangla ? 'কম দেখান' : 'Show Less') 
                            : (isBangla ? `আরও ${toBanglaNumber(getTopSellingProducts().length - 8)}টি দেখুন` : `Show ${getTopSellingProducts().length - 8} More`)
                          }
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                {isBangla ? 'চলতি মাসের সমস্ত হিসাব বিবরণী' : 'This Month Ledger List'}
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50/50">
                      <th className="py-2.5 px-2">{isBangla ? 'তারিখ' : 'Date'}</th>
                      <th className="py-2.5 px-2">{isBangla ? 'খাত/পণ্য' : 'Details'}</th>
                      <th className="py-2.5 px-2">{isBangla ? 'ধরন' : 'Type'}</th>
                      <th className="py-2.5 px-2 text-right">{isBangla ? 'পরিমাণ' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {transactions
                      .filter(tx => {
                        const d = new Date(tx.date);
                        return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                      })
                      .sort((a, b) => b.id.localeCompare(a.id))
                      .slice(0, 10)
                      .map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2 font-mono text-[10px]">{isBangla ? toBanglaNumber(tx.date) : tx.date}</td>
                          <td className="py-2 px-2 max-w-[120px] truncate">{tx.product} {tx.customer && `(${tx.customer})`}</td>
                          <td className="py-2 px-2">
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tx.isCash ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {tx.isCash ? (isBangla ? 'নগদ' : 'Cash') : (isBangla ? 'বাকি' : 'Due')}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800">{formatCurrency(tx.amount, isBangla)}</td>
                        </tr>
                      ))}
                    {expenses
                      .filter(ex => {
                        const d = new Date(ex.date);
                        return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
                      })
                      .sort((a, b) => b.id.localeCompare(a.id))
                      .slice(0, 10)
                      .map(ex => (
                        <tr key={ex.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-2 font-mono text-[10px]">{isBangla ? toBanglaNumber(ex.date) : ex.date}</td>
                          <td className="py-2 px-2 max-w-[120px] truncate text-rose-700">{ex.description}</td>
                          <td className="py-2 px-2">
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800">
                              {isBangla ? 'খরচ' : 'Expense'}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-rose-600">-{formatCurrency(ex.amount, isBangla)}</td>
                        </tr>
                      ))}
                    {transactions.length === 0 && expenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center py-6 text-slate-400 font-normal">
                          {isBangla ? 'চলতি মাসে কোনো লেনদেন হয়নি।' : 'No transactions this month.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- 3. OLD LEDGER TAB VIEW --- */}
        {currentNavTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="max-w-4xl mx-auto w-full px-4 py-4 space-y-6"
          >
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-800">
                    {isBangla ? 'পুরোনো খতিয়ান ও হিসাব অডিট' : 'Past Ledgers & Date Audit'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isBangla ? 'নির্দিষ্ট যেকোনো পেছনের তারিখ নির্বাচন করে হিসাব পর্যালোচনা করুন।' : 'Select any past date to audit ledger histories.'}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {(todayTransactions.length > 0 || todayExpenses.length > 0) && (
                    <button
                      type="button"
                      onClick={() => handleDeleteDateRecords(selectedDate)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-black text-rose-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-3xs active:scale-95"
                      title={isBangla ? 'এই দিনের সম্পূর্ণ হিসাব মুছুন' : 'Delete all records for this day'}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{isBangla ? 'সম্পূর্ণ হিসাব ডিলিট' : 'Delete Day Records'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'ঐ দিনের মোট বিক্রি' : 'Sales on Date'}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-emerald-700 block mt-1">
                    {formatCurrency(todaySales, isBangla)}
                  </span>
                </div>
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'নগদ জমা' : 'Cash Deposit'}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-blue-700 block mt-1">
                    {formatCurrency(todayCashDeposit, isBangla)}
                  </span>
                </div>
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'বাকি লেনদেন' : 'Dues Given'}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-amber-700 block mt-1">
                    {formatCurrency(todayDueTaken, isBangla)}
                  </span>
                </div>
                <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                    {isBangla ? 'ঐ দিনের মোট খরচ' : 'Expenses on Date'}
                  </span>
                  <span className="text-[17px] sm:text-lg font-black text-rose-700 block mt-1">
                    {formatCurrency(todayExpenseTotal, isBangla)}
                  </span>
                </div>
              </div>

              {/* --- All-time Product Sales Donut Chart Infographic --- */}
              <div className="border-t border-slate-100 pt-5 mt-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-teal-600 shrink-0" />
                      <span>{isBangla ? 'সর্বমোট পণ্য বিক্রির সামারি (শুরু থেকে বর্তমান)' : 'All-time Product Sales Summary'}</span>
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                      {isBangla ? 'অ্যাপের শুরু থেকে এ পর্যন্ত মোট বিক্রিত পণ্যের অনুপাত ও খতিয়ান।' : 'Distribution of product sales from the beginning of the ledger.'}
                    </p>
                  </div>
                </div>
                
                {chartData.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium bg-slate-50/50 border border-dashed border-slate-200 rounded-xl">
                    {isBangla ? 'এখনও কোনো পণ্যের বিক্রি রেকর্ড করা হয়নি।' : 'No product sales recorded yet.'}
                  </div>
                ) : (
                  <div className="bg-slate-50/40 rounded-2xl border border-slate-150 p-4 sm:p-5 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    
                    {/* SVG Donut Chart container */}
                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex-shrink-0 flex items-center justify-center mx-auto">
                      <svg viewBox="0 0 120 120" className="w-full h-full">
                        {/* Background circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="50"
                          fill="transparent"
                          stroke="#F1F5F9"
                          strokeWidth="11"
                        />
                        
                        {/* Rotated group to start from 12 o'clock (top) */}
                        <g transform="rotate(-90 60 60)">
                          {/* Circles for chart segments */}
                          {chartData.map((data, index) => {
                            const strokeLength = (data.percentage / 100) * circumference;
                            const strokeOffset = -accumulatedOffsetArray[index];
                            const isOthers = data.name === 'অন্যান্য' || data.name === 'Others';
                            
                            return (
                              <motion.circle
                                key={data.name}
                                cx="60"
                                cy="60"
                                r="50"
                                fill="transparent"
                                stroke={data.color}
                                strokeWidth={activeSliceIndex === index ? 14 : 11}
                                strokeDasharray={`${strokeLength} ${circumference}`}
                                strokeDashoffset={strokeOffset}
                                initial={{ strokeDasharray: `0 ${circumference}` }}
                                animate={{ strokeDasharray: `${strokeLength} ${circumference}` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
                                className="transition-all duration-200 cursor-pointer"
                                style={{ transformOrigin: 'center' }}
                                onMouseEnter={() => setActiveSliceIndex(index)}
                                onMouseLeave={() => setActiveSliceIndex(null)}
                                onClick={() => {
                                  if (isOthers) {
                                    setIsOthersModalOpen(true);
                                  }
                                }}
                              />
                            );
                          })}
                        </g>
                      </svg>
                      
                      {/* Inner circle text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-3">
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                          {isBangla ? 'মোট বিক্রি' : 'Total Sales'}
                        </span>
                        <span className="text-[11px] sm:text-xs font-black text-slate-800 font-sans mt-1 leading-none max-w-[85px] truncate" title={formatCurrency(allTimeSales.totalAmount, isBangla)}>
                          {formatCurrency(allTimeSales.totalAmount, isBangla)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Infographic details / legends list */}
                    <div className="flex-grow w-full space-y-2.5">
                      {chartData.map((data, index) => {
                        const isHovered = activeSliceIndex === index;
                        const isOthers = data.name === 'অন্যান্য' || data.name === 'Others';
                        return (
                          <div
                            key={data.name}
                            className={`flex flex-col gap-1 p-2 -mx-2 rounded-xl transition-all duration-200 cursor-pointer ${
                              isHovered ? 'bg-white shadow-3xs border border-slate-150' : 'border border-transparent'
                            }`}
                            onMouseEnter={() => setActiveSliceIndex(index)}
                            onMouseLeave={() => setActiveSliceIndex(null)}
                            onClick={() => {
                              if (isOthers) {
                                setIsOthersModalOpen(true);
                              }
                            }}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                {/* Circle dot */}
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: data.color }}
                                />
                                <span className="font-extrabold text-slate-800 truncate">
                                  {data.name}
                                  {isOthers && (
                                    <span className="text-[9px] font-medium text-indigo-500 ml-1.5 underline">
                                      {isBangla ? '(বিস্তারিত)' : '(Details)'}
                                    </span>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-mono shrink-0">
                                <span className="text-[9px] text-slate-400 font-bold">
                                  {isBangla ? `${toBanglaNumber(data.count)} বার` : `${data.count} sold`}
                                </span>
                                <span className="font-black text-slate-900 text-[11px]">
                                  {formatCurrency(data.amount, isBangla)}
                                </span>
                                <span className="text-[9px] text-teal-600 font-black bg-teal-50 px-1 py-0.5 rounded-md">
                                  {isBangla ? `${toBanglaNumber(data.percentage.toFixed(0))}%` : `${data.percentage.toFixed(0)}%`}
                                </span>
                              </div>
                            </div>
                            
                            {/* Visual percentage progress bar */}
                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: data.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${data.percentage}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: index * 0.05 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>{isBangla ? 'বেচাকেনার তালিকা' : 'Sales Ledger'}</span>
                </h3>
                
                <div className="space-y-2">
                  {todayTransactions.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      {isBangla ? 'ঐ তারিখে কোনো বেচাকেনা হিসাব নেই।' : 'No sales entries on this date.'}
                    </div>
                  ) : (
                    <>
                      {(showAllHistoryTxs ? todayTransactions : todayTransactions.slice(0, 6)).map(tx => (
                        <div key={tx.id} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{tx.product}</h4>
                            <span className="text-[9px] text-slate-400 block mt-0.5">
                              {tx.customer ? `${isBangla ? 'কাস্টমার' : 'Customer'}: ${tx.customer}` : (isBangla ? 'নগদ বিক্রি' : 'Cash Sale')} • {formatTimeStr(tx.time, isBangla)}
                            </span>
                          </div>
                          <span className={`text-xs font-black ${tx.isCash ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {formatCurrency(tx.amount, isBangla)}
                          </span>
                        </div>
                      ))}
                      
                      {todayTransactions.length > 6 && (
                        <button
                          type="button"
                          onClick={() => setShowAllHistoryTxs(!showAllHistoryTxs)}
                          className="w-full mt-2 py-2 text-xs font-extrabold text-indigo-600 hover:text-indigo-800 hover:bg-slate-100/50 border border-slate-200/50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                        >
                          <span>
                            {showAllHistoryTxs 
                              ? (isBangla ? 'কম দেখান' : 'Show Less') 
                              : (isBangla ? `আরও ${toBanglaNumber(todayTransactions.length - 6)}টি দেখুন` : `Show ${todayTransactions.length - 6} More`)
                            }
                          </span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-3xs space-y-3">
                <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-rose-600" />
                  <span>{isBangla ? 'খরচের তালিকা' : 'Expense Ledger'}</span>
                </h3>

                <div className="space-y-2">
                  {todayExpenses.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">
                      {isBangla ? 'ঐ তারিখে কোনো খরচের খতিয়ান নেই।' : 'No expense entries on this date.'}
                    </div>
                  ) : (
                    todayExpenses.map(ex => (
                      <div key={ex.id} className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{ex.description}</h4>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{formatTimeStr(ex.time, isBangla)}</span>
                        </div>
                        <span className="text-xs font-black text-rose-600">
                          {formatCurrency(ex.amount, isBangla)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* --- 4. SETTINGS TAB VIEW --- */}
        {currentNavTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="max-w-xl mx-auto w-full px-4 py-4 space-y-6"
          >
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-teal-600" />
                <span>{isBangla ? 'হিসাব খাতা সেটিংস' : 'Ledger App Settings'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBangla ? 'অ্যাপের সেটিংস ও গ্রাহকের দোকান বা ব্যাকআপ ম্যানেজ করুন।' : 'Configure store metadata and data retention.'}
              </p>
            </div>

            {/* Shop Settings Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                {isBangla ? 'দোকানের সেটিংস' : 'Store Settings'}
              </h3>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">
                  {isBangla ? 'গ্রাহকের দোকানের নাম' : 'Store Name'}
                </label>
                <input
                  type="text"
                  placeholder={isBangla ? 'যেমন: মেসার্স জনি ট্রেডার্স' : 'e.g. M/S Jony Traders'}
                  value={shopName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setShopName(val);
                    localStorage.setItem('hisab_khata_shop_name', val);
                    localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    const now = Date.now();
                    localStorage.setItem('hisab_khata_shop_name', val);
                    localStorage.setItem('hisab_khata_last_updated', String(now));
                    if (isSyncActive) {
                      triggerCloudSync(transactions, expenses, val, userEmail);
                    }
                  }}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                />
                <p className="text-[10px] text-slate-400">
                  {isBangla ? '* এই নামটি লোগোর নিচে হোম স্ক্রিনে দেখাবে।' : '* This name will be displayed underneath the logo on header.'}
                </p>
              </div>
            </div>

            {/* Cloud Sync Settings */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                {isBangla ? 'ক্লাউড সিঙ্ক অ্যাকাউন্ট' : 'Cloud Sync Account'}
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSyncing}
                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.6-6.887 4.6-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.103C18.28 1.845 15.548 1 12.24 1A11 11 0 0 0 1.24 12a11 11 0 0 0 11 11c11.5 0 12.24-8.09 11.965-11.715H12.24z"
                      />
                    </svg>
                    <span>{isBangla ? 'গুগল দিয়ে সাইন-ইন করুন' : 'Sign in with Google'}</span>
                  </button>

                  {userEmail && (
                    <div className="flex items-center justify-between px-3 py-2 bg-teal-50/50 rounded-lg border border-teal-100/50">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                        <span className="text-[11px] text-teal-800 font-bold truncate max-w-[180px] font-sans">
                          {userEmail}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded"
                      >
                        {isBangla ? 'লগআউট' : 'Logout'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-150"></div>
                  <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    {isBangla ? 'অথবা নিজে লিখুন' : 'or enter manually'}
                  </span>
                  <div className="flex-grow border-t border-slate-150"></div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600">
                    {isBangla ? 'পছন্দের সিঙ্ক ইমেইল আইডি' : 'Preferred Sync Email ID'}
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => {
                      setUserEmail(e.target.value);
                      localStorage.setItem('hisab_khata_sync_email', e.target.value);
                    }}
                    placeholder="e.g. jony@example.com"
                    className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold font-sans"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4 text-teal-600 animate-pulse" />
                    <span className="text-xs font-bold text-slate-700">
                      {isSyncActive ? (isBangla ? 'সিঙ্ক সক্রিয় আছে' : 'Sync Active') : (isBangla ? 'সিঙ্ক বন্ধ আছে' : 'Sync Inactive')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSyncState(userEmail)}
                    className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg border transition-colors cursor-pointer ${
                      isSyncActive
                        ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    {isSyncActive ? (isBangla ? 'বন্ধ করুন' : 'Disable') : (isBangla ? 'চালু করুন' : 'Enable')}
                  </button>
                </div>
              </div>
            </div>

            {/* Google Drive Backup Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                  {isBangla ? 'গুগল ড্রাইভ ব্যাকআপ' : 'Google Drive Backup'}
                </h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black">Drive v3</span>
              </div>

              <div className="space-y-4">
                {/* Connection status & Google sign-in */}
                <div className="space-y-2.5">
                  {!driveEmail ? (
                    <button
                      type="button"
                      onClick={handleDriveConnect}
                      disabled={isDriveSyncing}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.6-6.887 4.6-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.103C18.28 1.845 15.548 1 12.24 1A11 11 0 0 0 1.24 12a11 11 0 0 0 11 11c11.5 0 12.24-8.09 11.965-11.715H12.24z"
                        />
                      </svg>
                      <span>{isBangla ? 'ড্রাইভ ব্যাকআপ চালু করুন' : 'Enable Drive Backup'}</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse flex-shrink-0"></span>
                          <span className="text-[11px] text-indigo-800 font-bold truncate max-w-[180px] font-sans">
                            {driveEmail}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleDriveDisconnect}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded"
                        >
                          {isBangla ? 'সংযোগ বিচ্ছিন্ন' : 'Disconnect'}
                        </button>
                      </div>

                      {/* Token status if expired */}
                      {!driveAccessToken && (
                        <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div className="text-[10px] text-amber-800">
                            <span className="font-bold">
                              {isBangla ? 'ড্রাইভ কানেক্ট করুন:' : 'Session expired:'}
                            </span>{' '}
                            {isBangla
                              ? 'অটো-ব্যাকআপ বা ম্যানুয়াল ব্যাকআপের জন্য প্রথমে ড্রাইভ কানেক্ট করুন।'
                              : 'Click connect to log into Drive for backing up.'}
                            <button
                              onClick={handleDriveConnect}
                              className="block mt-1 text-[10px] text-indigo-700 underline font-bold"
                            >
                              {isBangla ? 'কানেক্ট করুন' : 'Connect Now'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Backup & Restore controls */}
                {driveEmail && (
                  <div className="space-y-3">
                    {/* Auto backup switch */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-150 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-indigo-600" />
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">
                            {isBangla ? 'অটো-ব্যাকআপ' : 'Auto-Backup'}
                          </span>
                          <span className="text-[9px] text-slate-400 block -mt-1 font-medium">
                            {isBangla ? 'প্রতি পরিবর্তনের পর স্বয়ংক্রিয় ড্রাইভ ব্যাকআপ' : 'Automatic upload on change'}
                          </span>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const nextVal = !isDriveAutoBackupActive;
                          setIsDriveAutoBackupActive(nextVal);
                          localStorage.setItem('hisab_khata_drive_auto_backup', String(nextVal));
                          if (nextVal && !driveAccessToken) {
                            handleDriveConnect();
                          } else if (nextVal && driveAccessToken) {
                            triggerDriveBackup(transactions, expenses, shopName, false);
                          }
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          isDriveAutoBackupActive ? 'bg-indigo-600' : 'bg-slate-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            isDriveAutoBackupActive ? 'translate-x-4.5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Manual buttons */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => triggerDriveBackup(transactions, expenses, shopName, false)}
                        disabled={isDriveSyncing || !driveAccessToken}
                        className="py-2 px-2 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                      >
                        <FileUp className="h-4 w-4 text-indigo-600" />
                        <span>{isBangla ? 'ড্রাইভে ব্যাকআপ' : 'Backup to Drive'}</span>
                      </button>

                      <button
                        onClick={triggerDriveRestore}
                        disabled={isDriveSyncing || !driveAccessToken}
                        className="py-2 px-2 border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors disabled:opacity-50"
                      >
                        <FileDown className="h-4 w-4 text-emerald-600" />
                        <span>{isBangla ? 'ড্রাইভ রিস্টোর' : 'Restore from Drive'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Backup Restore Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                {isBangla ? 'ডাটা সংরক্ষণ ও রিসেট' : 'Backup & Hard Reset'}
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleExportBackup}
                  className="py-2.5 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  <FileDown className="h-4 w-4 text-teal-600" />
                  <span>{isBangla ? 'ডাউনলোড খাতা' : 'Download JSON'}</span>
                </button>

                <label className="py-2.5 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors">
                  <FileUp className="h-4 w-4 text-indigo-600" />
                  <span>{isBangla ? 'আপলোড খাতা' : 'Upload JSON'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                onClick={handleHardReset}
                className="w-full py-2.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isBangla ? 'খাতা সম্পূর্ণ খালি করুন (Reset)' : 'Reset All Ledger Data'}</span>
              </button>
            </div>
          </motion.div>
        )}
        </AnimatePresence>

      </main>

      {/* --- FLOATING CALC OVERLAY SIDEBAR DRAWER --- */}
      <Calculator
        isOpen={isCalcOpen}
        onClose={() => setIsCalcOpen(false)}
        isBangla={isBangla}
        onApplyValue={(val) => {
          setAmount(String(val));
          showToast(isBangla ? 'হিসাবটি দামের ঘরে বসানো হয়েছে!' : 'Amount pasted successfully!');
        }}
      />

      {/* --- CLOUD SYNC MODAL OVERLAY DIALOG --- */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSyncModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="sync-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <Cloud className="h-5 w-5 text-teal-600 animate-pulse" />
                  <span>{isBangla ? 'ফায়ারবেস ক্লাউড সিঙ্ক' : 'Firebase Cloud Sync'}</span>
                </h3>
                <button
                  onClick={() => setIsSyncModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {isBangla 
                    ? 'আপনার হিসাব খাতার সকল ডাটা ফায়ারবেস ক্লাউডে রিয়েল-টাইমে সিঙ্ক করুন। এতে আপনার ফোন হারিয়ে গেলেও ডাটা সুরক্ষিত থাকবে।' 
                    : 'Sync all your ledger data in real-time to Firebase Cloud. Your data will remain safe and secure even if you switch or lose your device.'}
                </p>

                <div className="space-y-3">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isSyncing}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#EA4335"
                          d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.6-6.887 4.6-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.103C18.28 1.845 15.548 1 12.24 1A11 11 0 0 0 1.24 12a11 11 0 0 0 11 11c11.5 0 12.24-8.09 11.965-11.715H12.24z"
                        />
                      </svg>
                      <span>{isBangla ? 'গুগল দিয়ে সাইন-ইন করুন' : 'Sign in with Google'}</span>
                    </button>
                    
                    {userEmail && (
                      <div className="flex items-center justify-between px-2.5 py-1.5 bg-teal-50/50 rounded-lg border border-teal-100/50">
                        <span className="text-[10px] text-teal-800 font-bold truncate max-w-[200px]">
                          {userEmail}
                        </span>
                        <button
                          type="button"
                          onClick={handleGoogleLogout}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded"
                        >
                          {isBangla ? 'লগআউট' : 'Logout'}
                        </button>
                      </div>
                    )}
                  </div>

                  {showAuthHelp && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl text-xs text-indigo-950 space-y-2.5 shadow-sm"
                      id="auth-help-box"
                    >
                      <div className="flex items-center gap-1.5 font-black text-indigo-950">
                        <AlertCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span>
                          {isBangla ? 'গুগল সাইন-ইন কেন কাজ করছে না?' : 'Why is Google Sign-In blocked?'}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600 font-bold">
                        {isBangla ? (
                          <>
                            গুগল ক্রোম ও মোবাইল ব্রাউজারের কঠোর সিকিউরিটির কারণে এই টেস্টিং ডোমেইনে ব্রাউজার ডেটা (sessionStorage) শেয়ারিং বন্ধ থাকে, যা গুগল সাইন-ইন সাময়িকভাবে বাধাগ্রস্ত করে।
                            <br /><br />
                            <span className="text-teal-700 font-extrabold">শতভাগ কার্যকারী বিকল্প সহজ সমাধান:</span>
                            <br />
                            ১. নিচে <strong className="text-slate-800">"সিঙ্ক ইমেইল আইডি"</strong> ঘরে আপনার যেকোনো ইমেইল লিখুন।
                            <br />
                            ২. এরপর সরাসরি ডানপাশের <strong className="text-slate-800">"চালু করুন"</strong> বাটনে ক্লিক করুন।
                            <br /><br />
                            ব্যাস! কোনো পাসওয়ার্ড বা অতিরিক্ত লগইন ছাড়া আপনার ডাটা ক্লাউডে সুরক্ষিত থাকবে। অ্যাপ প্লে-স্টোরে ইনস্টল করার পর গুগল সাইন-ইন সরাসরি কাজ করবে!
                          </>
                        ) : (
                          <>
                            Google Chrome restricts cross-domain popups on temporary test environments due to third-party cookie and storage-partitioning security policies.
                            <br /><br />
                            <span className="text-teal-700 font-extrabold">Guaranteed Easy Alternative:</span>
                            <br />
                            1. Type your preferred email in the <strong className="text-slate-800">"Sync Email ID"</strong> field below.
                            <br />
                            2. Click the <strong className="text-slate-800">"Enable"</strong> button directly.
                            <br /><br />
                            That's it! Your data is fully synced and backed up without needing a Google sign-in. Google Login will work out-of-the-box once deployed to production!
                          </>
                        )}
                      </p>
                      <div className="flex justify-end pt-1 border-t border-indigo-100">
                        <button
                          type="button"
                          onClick={() => setShowAuthHelp(false)}
                          className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 underline cursor-pointer"
                        >
                          {isBangla ? 'বুঝেছি, এটি লুকান' : 'Got it, hide this'}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-slate-150"></div>
                    <span className="flex-shrink mx-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      {isBangla ? 'অথবা নিজে লিখুন' : 'or enter manually'}
                    </span>
                    <div className="flex-grow border-t border-slate-150"></div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      {isBangla ? 'সিঙ্ক ইমেইল আইডি' : 'Sync Email ID'}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. jony@example.com"
                      value={userEmail}
                      onChange={(e) => {
                        setUserEmail(e.target.value);
                        localStorage.setItem('hisab_khata_sync_email', e.target.value);
                      }}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold font-sans"
                      id="sync-email-input"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSyncActive ? (
                      <Cloud className="h-4 w-4 text-emerald-600 animate-pulse" />
                    ) : (
                      <CloudOff className="h-4 w-4 text-rose-500" />
                    )}
                    <span className="text-xs font-bold text-slate-700">
                      {isSyncActive ? (isBangla ? 'সিঙ্ক সক্রিয় আছে' : 'Sync Active') : (isBangla ? 'সিঙ্ক নিষ্ক্রিয় আছে' : 'Sync Inactive')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSyncState(userEmail)}
                    disabled={isSyncing}
                    className={`px-3 py-1.5 text-xs font-black rounded-lg border transition-colors cursor-pointer ${
                      isSyncActive
                        ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                        : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                    }`}
                  >
                    {isSyncActive ? (isBangla ? 'বন্ধ করুন' : 'Disable') : (isBangla ? 'চালু করুন' : 'Enable')}
                  </button>
                </div>

                {isSyncActive && (
                  <button
                    type="button"
                    onClick={() => triggerCloudSync(transactions, expenses, shopName, userEmail)}
                    disabled={isSyncing}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Cloud className="h-4 w-4 text-white" />
                    <span>{isBangla ? 'এখনই সিঙ্ক করুন (Force Sync)' : 'Sync Now (Force Sync)'}</span>
                  </button>
                )}

                {isSyncing && (
                  <div className="text-center py-1 text-xs text-indigo-600 font-bold animate-pulse flex items-center justify-center gap-1.5">
                    <span className="h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>{syncMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSyncModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer font-bold"
                  >
                    {isBangla ? 'বন্ধ করুন' : 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- OUTSTANDING DUES MODAL OVERLAY DIALOG --- */}
      <AnimatePresence>
        {isDueListModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDueListModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl p-5 border border-slate-100 overflow-hidden flex flex-col max-h-[80vh]"
              id="dues-modal-box"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-150">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <span>{isBangla ? 'বাকি খতিয়ান (কার কাছে কতো বাকি)' : 'Outstanding Dues (Who owes what)'}</span>
                </h3>
                <button
                  onClick={() => setIsDueListModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              {/* Total Summary Row */}
              <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 mb-3.5 flex justify-between items-center text-xs font-black text-amber-900">
                <span>{isBangla ? 'সর্বমোট বকেয়া পাওনা টাকা:' : 'Total Outstanding Receivable:'}</span>
                <span className="text-base font-black text-amber-700">{formatCurrency(globalTotalDue, isBangla)}</span>
              </div>

              {/* Search Box */}
              <div className="mb-3.5 relative">
                <input
                  type="text"
                  placeholder={isBangla ? 'কাস্টমারের নাম লিখে খুঁজুন...' : 'Search customer...'}
                  id="modal-due-search"
                  className="w-full pl-3 pr-3 py-2 text-xs rounded-xl border-2 border-slate-200 focus:outline-none focus:border-amber-500 bg-slate-50/50 transition-all font-semibold"
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase();
                    setModalSearchQuery(val);
                  }}
                  value={modalSearchQuery}
                />
              </div>

              {/* Scrollable Customer List */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-2 max-h-[40vh]">
                {filteredModalDues.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                    {isBangla ? 'কোনো বকেয়া হিসাব পাওয়া যায়নি' : 'No matching outstanding dues'}
                  </div>
                ) : (
                  filteredModalDues.map((cd) => {
                    const isDepositingThis = depositingCustomerName === cd.name;

                    return (
                      <div
                        key={cd.name}
                        className="p-3 rounded-xl border border-slate-100 bg-rose-50/10 hover:bg-rose-50/20 flex flex-col gap-2 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                              <h4 className="text-xs sm:text-sm font-black text-slate-800 truncate">{cd.name}</h4>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold mt-1">
                              {isBangla ? 'সর্বশেষ লেনদেন:' : 'Last active:'} <span className="font-mono">{isBangla ? toBanglaNumber(cd.lastDate) : cd.lastDate}</span>
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 flex flex-col items-end">
                            <span className="text-xs sm:text-sm font-black text-rose-600 block">
                              {formatCurrency(cd.amount, isBangla)}
                            </span>
                            
                            {!isDepositingThis && (
                              <button
                                onClick={() => {
                                  setDepositingCustomerName(cd.name);
                                  setModalDepositValue('');
                                  setModalDepositError('');
                                }}
                                className="text-[9px] font-black text-teal-700 bg-teal-50 border border-teal-200/50 hover:bg-teal-100 px-2 py-0.5 rounded-lg mt-1 transition-all cursor-pointer shadow-3xs"
                              >
                                {isBangla ? 'জমা নিন' : 'Deposit'}
                              </button>
                            )}
                          </div>
                        </div>

                        {isDepositingThis && (
                          <div className="space-y-1.5 pt-1.5 border-t border-slate-150 mt-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                placeholder={isBangla ? '৳ জমার পরিমাণ' : '৳ Deposit Amount'}
                                value={modalDepositValue}
                                onChange={(e) => {
                                  setModalDepositValue(e.target.value);
                                  setModalDepositError('');
                                }}
                                className="flex-1 text-xs p-1.5 rounded-xl border-2 border-teal-200 focus:outline-none focus:border-teal-500 bg-white font-semibold"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  const amt = parseFloat(modalDepositValue);
                                  if (isNaN(amt) || amt <= 0) {
                                    setModalDepositError(isBangla ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Please enter a valid amount');
                                    return;
                                  }
                                  if (amt > cd.amount) {
                                    setModalDepositError(isBangla ? 'বকেয়া পরিমাণের চেয়ে বেশি জমা করা যাবে না' : 'Deposit cannot exceed due');
                                    return;
                                  }
                                  handleDueDeposit(cd.name, amt);
                                  setDepositingCustomerName(null);
                                  setModalDepositValue('');
                                  setModalDepositError('');
                                }}
                                className="p-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg cursor-pointer transition-all shrink-0 flex items-center justify-center"
                                title={isBangla ? 'জমা সম্পন্ন করুন' : 'Confirm Deposit'}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  setDepositingCustomerName(null);
                                  setModalDepositValue('');
                                  setModalDepositError('');
                                }}
                                className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg cursor-pointer shrink-0 flex items-center justify-center"
                                title={isBangla ? 'বাতিল' : 'Cancel'}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            {modalDepositError && (
                              <p className="text-[10px] text-rose-600 font-bold mt-0.5">{modalDepositError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center justify-end pt-3 mt-3.5 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsDueListModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 rounded-xl cursor-pointer font-black transition-colors"
                >
                  {isBangla ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD EXPENSE MODAL OVERLAY DIALOG --- */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="expense-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base">
                  {isBangla ? 'আজকের খরচ যোগ করুন' : 'Add Store Expense'}
                </h3>
                <button
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'খরচের বিবরণ' : 'Expense Details'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isBangla ? 'যেমন: কারেন্ট বিল, দোকানের ভাড়া, চা-নাস্তা' : 'e.g. Electric bill, Rent, Snacks'}
                    value={expenseDesc}
                    onChange={(e) => setExpenseDesc(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    id="expense-desc-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'টাকার পরিমাণ' : 'Amount (৳)'}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder={isBangla ? 'যেমন: ৩০০' : 'e.g. 300'}
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                    id="expense-amount-input"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs text-slate-950 font-bold bg-amber-500 hover:bg-amber-400 rounded-lg shadow-sm cursor-pointer"
                    id="expense-submit-btn"
                  >
                    {isBangla ? 'যোগ করুন' : 'Add'}
                  </button>
                </div>
              </form>
            </motion.div>

          </div>
        )}
      </AnimatePresence>

      {/* --- CONFIRM DELETE DATE MODAL OVERLAY DIALOG --- */}
      <AnimatePresence>
        {isDeleteDateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteDateModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="delete-date-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                  <span>{isBangla ? 'সতর্কবার্তা!' : 'Warning!'}</span>
                </h3>
                <button
                  onClick={() => setIsDeleteDateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-bold">
                  {isBangla
                    ? `${formatDate(deleteDateTarget, true)} তারিখের সম্পূর্ণ বেচাকেনা এবং খরচের হিসাব ডিলিট করতে চান? এটি বাকির হিসাবও আপডেট করে দেবে।`
                    : `Are you sure you want to delete all transaction and expense records for ${formatDate(deleteDateTarget, false)}? This will recalculate customer dues.`}
                </p>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsDeleteDateModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer font-bold"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const remainingTxs = transactions.filter((tx) => tx.date !== deleteDateTarget);
                      const remainingExs = expenses.filter((ex) => ex.date !== deleteDateTarget);

                      saveTransactionsToStorage(remainingTxs);
                      saveExpensesToStorage(remainingExs);

                      showToast(
                        isBangla
                          ? `${formatDate(deleteDateTarget, true)} তারিখের সম্পূর্ণ হিসাব ডিলিট করা হয়েছে!`
                          : `Successfully deleted all records for ${formatDate(deleteDateTarget, false)}!`
                      );
                      setIsDeleteDateModalOpen(false);
                    }}
                    className="px-4 py-2 text-xs text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm cursor-pointer font-bold"
                    id="confirm-delete-date-btn"
                  >
                    {isBangla ? 'ওকে' : 'OK'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- TOP SELLING PRODUCT DETAILS MODAL --- */}
      <AnimatePresence>
        {selectedProductForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForDetail(null)}
              className="fixed inset-0 bg-black shadow-lg"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-teal-600 shrink-0 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-none flex items-center gap-2">
                      <span className="text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded text-xs">
                        {isBangla ? 'পণ্য' : 'Product'}
                      </span>
                      <span>{selectedProductForDetail}</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isBangla ? 'এই মাসে পণ্য বিক্রির সমস্ত বিবরণী নিচে দেওয়া হলো।' : 'All sales listings for this product this month.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProductForDetail(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                <div className="p-3.5 bg-teal-50/50 border border-teal-100 rounded-xl text-xs text-teal-950 space-y-1">
                  <span className="font-extrabold text-teal-800 uppercase block tracking-wider text-[10px]">
                    {isBangla ? 'মোট হিসাবসংক্ষেপ' : 'Product Sales Summary'}
                  </span>
                  <div className="flex justify-between items-center pt-1 font-bold">
                    <span className="text-slate-500">
                      {isBangla ? 'বিক্রয়ের পরিমাণ (ভাগ সহ):' : 'Calculated sales amount:'}
                    </span>
                    <span className="text-teal-700 font-sans font-black text-sm">
                      {formatCurrency(
                        getTopSellingProducts().find(p => p.name.toLowerCase() === selectedProductForDetail.toLowerCase())?.amount || 0,
                        isBangla
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-500">
                      {isBangla ? 'মোট বিক্রির সংখ্যা:' : 'Times sold:'}
                    </span>
                    <span className="text-teal-700 font-sans font-black text-sm">
                      {isBangla 
                        ? `${toBanglaNumber(getTopSellingProducts().find(p => p.name.toLowerCase() === selectedProductForDetail.toLowerCase())?.count || 0)} বার`
                        : `${getTopSellingProducts().find(p => p.name.toLowerCase() === selectedProductForDetail.toLowerCase())?.count || 0} times`}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    {isBangla ? 'বিক্রি এন্ট্রিসমূহ' : 'Individual Sales Entries'}
                  </h4>

                  {getTransactionsForProduct(selectedProductForDetail).length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl font-semibold">
                      {isBangla ? 'কোনো এন্ট্রি পাওয়া যায়নি।' : 'No entries found.'}
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                      {getTransactionsForProduct(selectedProductForDetail).map(tx => {
                        const partsCount = tx.product.split('+').filter(Boolean).length;
                        const individualValue = tx.amount / partsCount;

                        return (
                          <div key={tx.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-extrabold text-xs text-slate-800 break-words">{tx.product}</span>
                                {partsCount > 1 && (
                                  <span className="text-[8px] px-1 bg-teal-100 text-teal-800 font-black rounded-sm border border-teal-200/40 shrink-0">
                                    {isBangla ? `১/${toBanglaNumber(partsCount)} ভাগ` : `1/${partsCount} share`}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold flex-wrap">
                                <span className="font-mono">{isBangla ? toBanglaNumber(tx.date) : tx.date}</span>
                                <span>•</span>
                                <span>{tx.customer ? `${isBangla ? 'কাস্টমার' : 'Cust'}: ${tx.customer}` : (isBangla ? 'নগদ বিক্রি' : 'Cash')}</span>
                                <span>•</span>
                                <span className={`px-1 rounded-sm text-[8px] font-black ${tx.isCash ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                  {tx.isCash ? (isBangla ? 'নগদ' : 'Cash') : (isBangla ? 'বাকি' : 'Due')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="text-xs font-black text-slate-700 font-sans block">
                                  {formatCurrency(tx.amount, isBangla)}
                                </span>
                                {partsCount > 1 && (
                                  <span className="text-[9px] text-teal-600 font-black font-sans block">
                                    ({isBangla ? 'ভাগ' : 'part'}: {formatCurrency(individualValue, isBangla)})
                                  </span>
                                )}
                              </div>

                              {deletingTxId === tx.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteTransaction(tx.id);
                                      setDeletingTxId(null);
                                      // If no transactions left for this product, close modal
                                      const remaining = getTransactionsForProduct(selectedProductForDetail || '').filter(t => t.id !== tx.id);
                                      if (remaining.length === 0) {
                                        setSelectedProductForDetail(null);
                                      }
                                    }}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] rounded-md transition-colors cursor-pointer"
                                  >
                                    {isBangla ? 'হ্যাঁ' : 'Yes'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingTxId(null)}
                                    className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-[9px] rounded-md transition-colors cursor-pointer"
                                  >
                                    {isBangla ? 'না' : 'No'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setDeletingTxId(tx.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-100 hover:border-rose-200 rounded-lg transition-colors cursor-pointer"
                                  title={isBangla ? 'ডিলিট করুন' : 'Delete'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSelectedProductForDetail(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-800 text-xs font-black rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  {isBangla ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- OTHER PRODUCTS BREAKDOWN MODAL --- */}
      <AnimatePresence>
        {isOthersModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOthersModalOpen(false)}
              className="fixed inset-0 bg-black shadow-lg"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden border border-slate-100 flex flex-col max-h-[80vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-none">
                      {isBangla ? 'অন্যান্য পণ্যের বিক্রয় খতিয়ান' : 'Other Products Sales Details'}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      {isBangla ? 'শীর্ষ ৬টি পণ্য বাদে অন্যান্য সব পণ্যের বিক্রির হিসাব।' : 'List of all other product sales outside the top 6.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOthersModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-base">✕</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {/* Total Summary of Others */}
                {(() => {
                  const othersList = allTimeSales.items.slice(6);
                  const totalOthersAmount = othersList.reduce((sum, item) => sum + item.amount, 0);
                  const totalOthersCount = othersList.reduce((sum, item) => sum + item.count, 0);
                  const othersPercentage = allTimeSales.totalAmount > 0 ? (totalOthersAmount / allTimeSales.totalAmount) * 100 : 0;

                  return (
                    <>
                      <div className="p-3.5 bg-slate-50/70 border border-slate-150 rounded-xl text-xs space-y-1">
                        <span className="font-extrabold text-slate-500 uppercase block tracking-wider text-[9px]">
                          {isBangla ? 'অন্যান্য প্রোডাক্ট সামারি' : 'Others Category Summary'}
                        </span>
                        <div className="flex justify-between items-center pt-1 font-bold">
                          <span className="text-slate-500">
                            {isBangla ? 'অন্যান্য পণ্যের মোট বিক্রি:' : 'Total sales from Others:'}
                          </span>
                          <span className="text-slate-800 font-sans font-black text-sm">
                            {formatCurrency(totalOthersAmount, isBangla)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-slate-500">
                            {isBangla ? 'মোট পণ্য সংখ্যা:' : 'Total other products:'}
                          </span>
                          <span className="text-slate-800 font-sans font-black text-xs">
                            {isBangla ? `${toBanglaNumber(othersList.length)}টি` : `${othersList.length} products`}
                          </span>
                        </div>
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-slate-500">
                            {isBangla ? 'মোট বিক্রির অংশীদারিত্ব:' : 'Share of overall sales:'}
                          </span>
                          <span className="text-indigo-600 font-sans font-black text-xs bg-indigo-50 px-1.5 py-0.5 rounded">
                            {isBangla ? `${toBanglaNumber(othersPercentage.toFixed(1))}%` : `${othersPercentage.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>

                      {/* Product details list */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          {isBangla ? 'অন্যান্য পণ্যের তালিকা' : 'List of other products'}
                        </h4>

                        {othersList.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl font-semibold">
                            {isBangla ? 'কোনো পণ্য পাওয়া যায়নি।' : 'No other products found.'}
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                            {othersList.map((item, index) => {
                              const itemPercentage = allTimeSales.totalAmount > 0 ? (item.amount / allTimeSales.totalAmount) * 100 : 0;
                              return (
                                <div key={item.name} className="p-3 bg-white border border-slate-150 rounded-xl flex flex-col gap-1.5 shadow-3xs">
                                  <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-800 font-extrabold truncate max-w-[200px]" title={item.name}>
                                      {item.name}
                                    </span>
                                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-900 shrink-0">
                                      <span className="text-[9px] text-slate-400">
                                        {isBangla ? `${toBanglaNumber(item.count)} বার` : `${item.count} sold`}
                                      </span>
                                      <span className="font-black">
                                        {formatCurrency(item.amount, isBangla)}
                                      </span>
                                    </div>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-slate-500 rounded-full"
                                        style={{ width: `${itemPercentage}%` }}
                                      />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-400 shrink-0 font-mono">
                                      {isBangla ? `${toBanglaNumber(itemPercentage.toFixed(1))}%` : `${itemPercentage.toFixed(1)}%`}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsOthersModalOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-800 text-xs font-black rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  {isBangla ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- INFO / STATUS NOTIFICATION TOAST --- */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white py-2.5 px-5 rounded-full shadow-xl border border-slate-800 text-xs font-medium z-50 flex items-center gap-2"
            id="toast-notification"
          >
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PERSISTENT STICKY BOTTOM NAVIGATION BAR --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/80 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] px-4 py-3 flex items-center justify-around">
        <button
          onClick={() => setCurrentNavTab('home')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
            currentNavTab === 'home'
              ? 'text-teal-600 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="h-5 w-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">
            {isBangla ? 'হোম' : 'Home'}
          </span>
        </button>

        <button
          onClick={() => setCurrentNavTab('monthly')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
            currentNavTab === 'monthly'
              ? 'text-teal-600 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Database className="h-5 w-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">
            {isBangla ? 'মাসিক রিপোর্ট' : 'Monthly'}
          </span>
        </button>

        <button
          onClick={() => setCurrentNavTab('history')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
            currentNavTab === 'history'
              ? 'text-teal-600 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <History className="h-5 w-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">
            {isBangla ? 'পুরোনো হিসাব' : 'Old Hisab'}
          </span>
        </button>

        <button
          onClick={() => setCurrentNavTab('settings')}
          className={`flex flex-col items-center gap-1 transition-all cursor-pointer ${
            currentNavTab === 'settings'
              ? 'text-teal-600 scale-105'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <SettingsIcon className="h-5 w-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">
            {isBangla ? 'সেটিংস' : 'Settings'}
          </span>
        </button>
      </div>

      {/* Footer credits and copyright */}
      <footer className="bg-white border-t border-slate-200/80 py-5 text-center mt-auto">
        <p className="text-xs text-slate-400">
          {isBangla 
            ? 'ডিজিটাল হিসাব খাতা © ২০২৬ • ব্যবস্থাপনাকারী: জনি দত্ত (jonydatta222@gmail.com)' 
            : 'Digital Hisab Khata © 2026 • Managed by: Jony Datta (jonydatta222@gmail.com)'}
        </p>
      </footer>

    </div>
  );
}

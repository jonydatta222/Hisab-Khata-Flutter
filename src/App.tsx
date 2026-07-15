import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
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
  Smartphone,
  FileJson,
  Clock,
  Sparkles,
  Info,
  LogOut,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
  Home,
  Settings as SettingsIcon,
  Database,
  User,
  Edit2,
  Facebook,
  Linkedin,
  Search,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';

import { Transaction, Expense, CustomerDue, DailySummary, OutOfStockItem, ProductRateItem, MemoItem } from './types';
import {
  toBanglaNumber,
  formatDate,
  formatTimeStr,
  getTodayDateString,
  formatCurrency,
  generateId,
  getTimestamp
} from './utils';

import { 
  uploadLedgerToCloud, 
  downloadLedgerFromCloud, 
  auth, 
  logOutFromFirebase,
  ensureAuthForEmail,
  loginWithGoogle,
  loginWithEmailAndPassword,
  registerWithEmailAndPassword,
  resetPasswordForEmail
} from './firebase';

// Native Capacitor Chrome Custom Tabs & Deep Linking callback imports
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';

import logoPng from './assets/logo.png';
import logoImg from './assets/logo.jpg';

// Stable cache buster calculated once per page session to bypass browser cache memory
const LOGO_CACHE_BUSTER = `?t=${Date.now()}`;
const logoPngWithCache = `${logoPng}${LOGO_CACHE_BUSTER}`;
const logoImgWithCache = `${logoImg}${LOGO_CACHE_BUSTER}`;

import StatCard from './components/StatCard';

const Calculator = lazy(() => import('./components/Calculator'));
const TransactionList = lazy(() => import('./components/TransactionList'));
const DueList = lazy(() => import('./components/DueList'));
const ExpenseList = lazy(() => import('./components/ExpenseList'));
const MemoTab = lazy(() => import('./components/MemoTab'));

export default function App() {
  // --- QR Verification States & Handlers ---
  const [verificationInvoiceId, setVerificationInvoiceId] = useState<string | null>(null);
  const [verifiedMemoData, setVerifiedMemoData] = useState<any | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<'not_found' | 'failed' | null>(null);
  const [isVerificationOnlyMode, setIsVerificationOnlyMode] = useState(false);
  const [verificationSessionEnded, setVerificationSessionEnded] = useState(false);

  const fetchVerifiedMemo = async (id: string) => {
    if (!id || !id.trim()) {
      setIsVerifying(false);
      setVerificationError('not_found');
      setVerifiedMemoData(null);
      return;
    }
    setIsVerifying(true);
    setVerificationError(null);
    setVerifiedMemoData(null);
    try {
      const { doc, getDoc, getDocFromServer } = await import('firebase/firestore');
      const { db } = await import('./firebase');
      
      const cleanId = id.trim();
      const docRef = doc(db, 'verified_memos', cleanId);
      
      let docSnap;
      try {
        docSnap = await getDocFromServer(docRef);
      } catch (serverErr) {
        console.warn('Failed to fetch from server, trying default getDoc:', serverErr);
        docSnap = await getDoc(docRef);
      }

      if (docSnap.exists()) {
        setVerifiedMemoData(docSnap.data());
      } else {
        setVerificationError('not_found');
      }
    } catch (err) {
      console.error('Error fetching verified memo:', err);
      setVerificationError('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCloseVerification = () => {
    if (isVerificationOnlyMode) {
      setVerificationSessionEnded(true);
    } else {
      setVerificationInvoiceId(null);
      setVerifiedMemoData(null);
      setVerificationError(null);
      window.history.pushState({}, document.title, window.location.pathname);
    }
  };

  // --- Hide Native Splash Screen instantly when React App finishes loading ---
  useEffect(() => {
    SplashScreen.hide().catch((err) => {
      console.warn('Native SplashScreen hide failed (benign if not in native environment):', err);
    });
  }, []);

  // --- Check for Invoice QR verification link on load ---
  useEffect(() => {
    const checkVerifyLink = () => {
      const params = new URLSearchParams(window.location.search);
      let verifyId = params.get('verify');
      
      if (!verifyId && window.location.hash.includes('verify=')) {
        const hashPart = window.location.hash.split('?')[1] || window.location.hash;
        const hashParams = new URLSearchParams(hashPart);
        verifyId = hashParams.get('verify');
      }

      if (verifyId !== null && verifyId !== undefined) {
        const cleanId = decodeURIComponent(verifyId).trim();
        setIsVerificationOnlyMode(true);
        setVerificationInvoiceId(cleanId);
        fetchVerifiedMemo(cleanId);
      } else {
        setVerificationInvoiceId(null);
      }
    };

    // Run the check on initial mount
    checkVerifyLink();

    window.addEventListener('popstate', checkVerifyLink);
    window.addEventListener('hashchange', checkVerifyLink);
    return () => {
      window.removeEventListener('popstate', checkVerifyLink);
      window.removeEventListener('hashchange', checkVerifyLink);
    };
  }, []);

  // --- States ---
  const isIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isCapacitor = typeof window !== 'undefined' && (
    (window as any).Capacitor || 
    window.location.protocol === 'file:' || 
    window.location.protocol.startsWith('capacitor') ||
    /Capacitor|Cordova/i.test(navigator.userAgent)
  );
  const [isBangla, setIsBangla] = useState(true);
  const [isBalancesHidden, setIsBalancesHidden] = useState<boolean>(() => {
    return localStorage.getItem('hisab_khata_balances_hidden') === 'true';
  });
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  const changeDateByDays = (days: number) => {
    const d = new Date(selectedDate);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (target.getAttribute('data-fallback-tried') !== 'true') {
      target.setAttribute('data-fallback-tried', 'true');
      target.src = logoImgWithCache;
    }
  };
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
  
  // Out of stock & Product rates state
  const [outOfStockItems, setOutOfStockItems] = useState<OutOfStockItem[]>(() => {
    const localOos = localStorage.getItem('hisab_khata_out_of_stock');
    if (localOos) {
      try {
        return JSON.parse(localOos);
      } catch (e) {
        console.error('Failed to parse out of stock items', e);
      }
    }
    return [];
  });
  const [productRates, setProductRates] = useState<ProductRateItem[]>(() => {
    const localRates = localStorage.getItem('hisab_khata_product_rates');
    if (localRates) {
      try {
        return JSON.parse(localRates);
      } catch (e) {
        console.error('Failed to parse product rates', e);
      }
    }
    return [];
  });
  
  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'dues' | 'expenses'>('dues');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDueListModalOpen, setIsDueListModalOpen] = useState(false);
  const [selectedCustomerForDetail, setSelectedCustomerForDetail] = useState<string | null>(null);
  const [isOutOfStockModalOpen, setIsOutOfStockModalOpen] = useState(false);
  const [isProductRateModalOpen, setIsProductRateModalOpen] = useState(false);
  const [activeProfitCalcProduct, setActiveProfitCalcProduct] = useState<ProductRateItem | null>(null);
  const [profitInput, setProfitInput] = useState('');
  const [isAddDueModalOpen, setIsAddDueModalOpen] = useState(false);
  const [addDueCustomerName, setAddDueCustomerName] = useState('');
  const [addDueAmount, setAddDueAmount] = useState('');
  const [addDueProduct, setAddDueProduct] = useState('');
  const [oosItemName, setOosItemName] = useState('');
  const [rateItemName, setRateItemName] = useState('');
  const [rateItemPrice, setRateItemPrice] = useState('');
  const [rateItemKeywords, setRateItemKeywords] = useState('');
  const [oosPage, setOosPage] = useState(1);
  const [ratePage, setRatePage] = useState(1);
  const [showAllOos, setShowAllOos] = useState(false);
  const [showAllRates, setShowAllRates] = useState(false);
  const [oosSearch, setOosSearch] = useState('');
  const [rateSearch, setRateSearch] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
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

  // Previous Sold Products Suggestions Logic
  const previousProducts = useMemo(() => {
    const productsMap = new Map<string, { lastPrice?: number }>();
    
    // Collect from transactions from newest to oldest
    for (let i = transactions.length - 1; i >= 0; i--) {
      const tx = transactions[i];
      if (tx.product && tx.product.trim()) {
        const prodTrim = tx.product.trim();
        if (!productsMap.has(prodTrim)) {
          productsMap.set(prodTrim, { lastPrice: tx.amount });
        }
      }
    }

    return Array.from(productsMap.entries()).map(([name, info]) => ({
      name,
      lastPrice: info.lastPrice
    }));
  }, [transactions]);

  const [showProductSuggestions, setShowProductSuggestions] = useState(false);

  const filteredProductSuggestions = useMemo(() => {
    const query = productName.trim().toLowerCase();
    if (!query) {
      return [];
    }
    return previousProducts
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [previousProducts, productName]);

  const handleSelectProductSuggestion = (name: string) => {
    setProductName(name);
    setShowProductSuggestions(false);
  };

  const [showAddDueProductSuggestions, setShowAddDueProductSuggestions] = useState(false);

  const filteredAddDueProductSuggestions = useMemo(() => {
    const query = addDueProduct.trim().toLowerCase();
    if (!query) {
      return [];
    }
    return previousProducts
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [previousProducts, addDueProduct]);

  const handleSelectAddDueProductSuggestion = (name: string) => {
    setAddDueProduct(name);
    setShowAddDueProductSuggestions(false);
  };

  // Memo Pre-fill state
  const [initialMemoCustomer, setInitialMemoCustomer] = useState('');
  const [initialMemoItems, setInitialMemoItems] = useState<MemoItem[]>([]);
  const [memoKey, setMemoKey] = useState(0);

  const handleOpenMemoWithData = () => {
    const items: MemoItem[] = [];
    if (productName.trim()) {
      const rate = parseFloat(amount) || 0;
      items.push({
        id: generateId(),
        name: productName.trim(),
        quantity: 1,
        rate: rate,
        total: rate,
        unit: isBangla ? 'টি' : 'pcs'
      });
    }
    setInitialMemoCustomer(customerName.trim());
    setInitialMemoItems(items);
    setMemoKey(prev => prev + 1);
    
    // Switch to settings nav tab and select memo subtab
    setCurrentNavTab('settings');
    setSettingsSubTab('memo');
    
    showToast(isBangla ? 'মেমো তৈরি করার পৃষ্ঠা খোলা হয়েছে!' : 'Memo creation page opened!');
  };
  
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
    return localStorage.getItem('hisab_khata_shop_name') || 'রঞ্জু দত্ত এন্ড সন্স';
  });

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isRestoreChoiceModalOpen, setIsRestoreChoiceModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthHelp, setShowAuthHelp] = useState(false);
  const [currentNavTab, setCurrentNavTab] = useState<'home' | 'info' | 'monthly' | 'settings'>('home');
  const [weeklyDetailModal, setWeeklyDetailModal] = useState<'sales' | 'expense' | 'net' | 'most_sold' | 'least_sold' | 'expensive' | 'due' | 'others' | null>(null);
  const [weeklyPeriod, setWeeklyPeriod] = useState<'7D' | '1D' | '30D'>('1D');
  const [showAllHistoryTxs, setShowAllHistoryTxs] = useState(false);
  const [showAllTopProducts, setShowAllTopProducts] = useState(false);
  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null);
  const [isOthersModalOpen, setIsOthersModalOpen] = useState(false);

  const [authServerType, setAuthServerType] = useState<'dev' | 'pre'>(() => {
    return (localStorage.getItem('hisab_khata_auth_server_type') as 'dev' | 'pre') || 'dev';
  });

  const [authTab, setAuthTab] = useState<'google' | 'email'>('google');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState('');

  const [syncConflictData, setSyncConflictData] = useState<{
    email: string;
    cloudData: any;
    localData: {
      transactions: any[];
      expenses: any[];
      outOfStockItems: any[];
      productRates: any[];
      shopName: string;
      lastUpdated: number;
    };
  } | null>(null);

  const resolveSyncConflict = async (decision: 'cloud' | 'local') => {
    if (!syncConflictData) return;
    const { email, cloudData, localData } = syncConflictData;
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'সিঙ্ক সিদ্ধান্ত প্রয়োগ করা হচ্ছে...' : 'Applying sync decision...');
    
    try {
      if (decision === 'cloud') {
        // Restore from cloud
        setTransactions(cloudData.transactions || []);
        setExpenses(cloudData.expenses || []);
        setOutOfStockItems(cloudData.outOfStockItems || []);
        setProductRates(cloudData.productRates || []);
        if (cloudData.shopName) {
          setShopName(cloudData.shopName);
          localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
        }
        localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
        localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
        localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(cloudData.outOfStockItems || []));
        localStorage.setItem('hisab_khata_product_rates', JSON.stringify(cloudData.productRates || []));
        localStorage.setItem('hisab_khata_last_updated', String(cloudData.updatedAt || Date.now()));
        
        setIsSyncActive(true);
        localStorage.setItem('hisab_khata_sync', 'true');
        localStorage.setItem('hisab_khata_sync_email', email);
        setUserEmail(email);
        
        showToast(
          isBangla 
            ? 'ক্লাউড থেকে সর্বশেষ ডাটা সফলভাবে ডাউনলোড করা হয়েছে!' 
            : 'Latest data successfully downloaded from cloud!'
        );
      } else {
        // Upload local to cloud (overwriting cloud)
        await uploadLedgerToCloud(
          email, 
          localData.transactions, 
          localData.expenses, 
          localData.shopName, 
          localData.outOfStockItems, 
          localData.productRates
        );
        localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
        
        setIsSyncActive(true);
        localStorage.setItem('hisab_khata_sync', 'true');
        localStorage.setItem('hisab_khata_sync_email', email);
        setUserEmail(email);

        showToast(
          isBangla 
            ? 'ক্লাউডে স্থানীয় ডাটা সফলভাবে আপলোড করা হয়েছে!' 
            : 'Local data successfully uploaded to cloud!'
        );
      }
      setSyncConflictData(null);
    } catch (e) {
      console.error('Failed to resolve sync conflict', e);
      showToast(isBangla ? 'সিঙ্ক দ্বন্দ্ব সমাধান করতে ব্যর্থ হয়েছে!' : 'Failed to resolve sync conflict!');
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError(isBangla ? 'ইমেইল এবং পাসওয়ার্ড দিন।' : 'Please enter email and password.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError(isBangla ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }

    setIsSyncing(true);
    setAuthError('');
    setSyncMessage(isRegisterMode 
      ? (isBangla ? 'অ্যাকাউন্ট তৈরি করা হচ্ছে...' : 'Creating account...') 
      : (isBangla ? 'লগইন করা হচ্ছে...' : 'Logging in...')
    );

    try {
      let email = '';
      if (isRegisterMode) {
        email = await registerWithEmailAndPassword(authEmail, authPassword);
        showToast(isBangla ? 'সফলভাবে নতুন অ্যাকাউন্ট তৈরি হয়েছে!' : 'Successfully created new account!');
      } else {
        email = await loginWithEmailAndPassword(authEmail, authPassword);
        showToast(isBangla ? 'সফলভাবে লগইন সম্পন্ন হয়েছে!' : 'Logged in successfully!');
      }
      
      // Clear password field for security
      setAuthPassword('');
      setIsSyncModalOpen(false);
      
      // Automatically toggle sync if not active
      if (!isSyncActive) {
        await toggleSyncState(email);
      }
    } catch (error: any) {
      console.error('Email Auth Error:', error);
      let errorMsg = error?.message || String(error);
      if (errorMsg.includes('auth/invalid-credential') || errorMsg.includes('auth/wrong-password') || errorMsg.includes('auth/user-not-found')) {
        setAuthError(isBangla ? 'ভুল ইমেইল অথবা পাসওয়ার্ড!' : 'Incorrect email or password!');
      } else if (errorMsg.includes('auth/email-already-in-use')) {
        setAuthError(isBangla ? 'এই ইমেইলটি ইতিমধ্যে ব্যবহৃত হয়েছে! অনুগ্রহ করে নতুন অ্যাকাউন্ট খুলুন এর পরিবর্তে সরাসরি "লগইন করুন" সিলেক্ট করুন।' : 'This email is already in use! Please choose Log In instead of Register.');
      } else if (errorMsg.includes('auth/invalid-email')) {
        setAuthError(isBangla ? 'অকার্যকর ইমেইল ফরম্যাট!' : 'Invalid email format!');
      } else if (errorMsg.includes('auth/weak-password')) {
        setAuthError(isBangla ? 'পাসওয়ার্ড অত্যন্ত দুর্বল! কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন।' : 'Weak password! Use at least 6 characters.');
      } else if (errorMsg.includes('auth/operation-not-allowed')) {
        setAuthError(isBangla ? 'ইমেইল/পাসওয়ার্ড পদ্ধতি সক্রিয় করা হয়নি। দয়া করে আপনার Firebase Console-এ গিয়ে Authentication -> Sign-in method থেকে Email/Password সক্রিয় (Enable) করুন।' : 'Email/Password auth is disabled. Please enable it in Firebase Console under Authentication -> Sign-in method.');
      } else {
        setAuthError(isBangla ? `লগইন ব্যর্থ হয়েছে! (${errorMsg})` : `Auth failed! (${errorMsg})`);
      }
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail.trim()) {
      setAuthError(isBangla ? 'পাসওয়ার্ড রিসেট করতে প্রথমে আপনার ইমেইল এড্রেসটি দিন।' : 'Please enter your email address first to reset password.');
      return;
    }
    setIsSyncing(true);
    setAuthError('');
    setSyncMessage(isBangla ? 'পাসওয়ার্ড রিসেট লিংক পাঠানো হচ্ছে...' : 'Sending password reset link...');
    try {
      await resetPasswordForEmail(authEmail);
      showToast(isBangla 
        ? 'পাসওয়ার্ড রিসেটের ইমেইল পাঠানো হয়েছে! আপনার ইনবক্স চেক করুন।' 
        : 'Password reset email sent! Please check your inbox.'
      );
      setAuthError(isBangla 
        ? 'পাসওয়ার্ড রিসেট লিংক সফলভাবে পাঠানো হয়েছে। আপনার ইমেইল ইনবক্স (বা স্প্যাম ফোল্ডার) চেক করুন।' 
        : 'Password reset link sent successfully. Check your inbox or spam folder.'
      );
    } catch (error: any) {
      console.error('Password Reset Error:', error);
      let errorMsg = error?.message || String(error);
      if (errorMsg.includes('auth/user-not-found') || errorMsg.includes('auth/invalid-email')) {
        setAuthError(isBangla ? 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।' : 'No account found with this email.');
      } else {
        setAuthError(isBangla ? `রিসেট রিকোয়েস্ট ব্যর্থ হয়েছে! (${errorMsg})` : `Reset request failed! (${errorMsg})`);
      }
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  const getAuthRedirectUrl = (mode: 'app-auth') => {
    const baseUrl = authServerType === 'dev'
      ? 'https://ais-dev-ubhqkvzgdwmiuzrvrwvhgc-273317504244.asia-southeast1.run.app'
      : 'https://ais-pre-ubhqkvzgdwmiuzrvrwvhgc-273317504244.asia-southeast1.run.app';
    return `${baseUrl}/#mode=${mode}`;
  };

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
  const [deletingOosId, setDeletingOosId] = useState<string | null>(null);
  const [deletingRateId, setDeletingRateId] = useState<string | null>(null);
  const [editingOosId, setEditingOosId] = useState<string | null>(null);
  const [editOosName, setEditOosName] = useState('');
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editRateName, setEditRateName] = useState('');
  const [editRatePrice, setEditRatePrice] = useState('');
  const [editRateKeywords, setEditRateKeywords] = useState('');
  const [activeInfoTab, setActiveInfoTab] = useState<'oos' | 'rates' | 'dues' | 'expenses'>('oos');
  const [settingsSubTab, setSettingsSubTab] = useState<'store' | 'sync' | 'history' | 'memo'>('store');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

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
      const localShopName = localStorage.getItem('hisab_khata_shop_name') || 'রঞ্জু দত্ত এন্ড সন্স';
      const localOosStr = localStorage.getItem('hisab_khata_out_of_stock');
      const localRatesStr = localStorage.getItem('hisab_khata_product_rates');
      
      const freshLocalTxs = localTxsStr ? JSON.parse(localTxsStr) : transactions;
      const freshLocalExs = localExpensesStr ? JSON.parse(localExpensesStr) : expenses;
      const freshLocalOos = localOosStr ? JSON.parse(localOosStr) : outOfStockItems;
      const freshLocalRates = localRatesStr ? JSON.parse(localRatesStr) : productRates;
      
      setTransactions(freshLocalTxs);
      setExpenses(freshLocalExs);
      setOutOfStockItems(freshLocalOos);
      setProductRates(freshLocalRates);
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
            setOutOfStockItems(cloudData.outOfStockItems || []);
            setProductRates(cloudData.productRates || []);
            if (cloudData.shopName !== undefined) {
              setShopName(cloudData.shopName);
              localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
            }
            localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
            localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
            localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(cloudData.outOfStockItems || []));
            localStorage.setItem('hisab_khata_product_rates', JSON.stringify(cloudData.productRates || []));
            localStorage.setItem('hisab_khata_last_updated', String(cloudUpdateTime));
            showToast(isBangla ? 'ক্লাউড থেকে নতুন তথ্য সফলভাবে রিফ্রেশ হয়েছে!' : 'Data refreshed and synced from cloud!');
          } else {
            // Local is newer, so push fresh local data to cloud
            await uploadLedgerToCloud(userEmail, freshLocalTxs, freshLocalExs, localShopName, freshLocalOos, freshLocalRates);
            localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
            showToast(isBangla ? 'সর্বশেষ লোকাল ডাটা ক্লাউডে সিঙ্ক করা হয়েছে!' : 'Local data synced to cloud!');
          }
        } else {
          // Cloud doc doesn't exist yet, push fresh local data
          await uploadLedgerToCloud(userEmail, freshLocalTxs, freshLocalExs, localShopName, freshLocalOos, freshLocalRates);
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

  // --- Memoized Real-Time Date & Day format for Header (e.g. ১১:২৮ AM | বুধবার ১৫/০৭/২০২৬) ---
  const headerDateTimeStr = useMemo(() => {
    if (!currentTime) return '';
    const now = new Date();
    const dayIdx = now.getDay();
    const enDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bnDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    
    const dayName = isBangla ? bnDays[dayIdx] : enDays[dayIdx];
    
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    
    const dateStr = `${dd}/${mm}/${yyyy}`;
    const localizedDate = isBangla ? toBanglaNumber(dateStr) : dateStr;
    const localizedTime = isBangla ? toBanglaNumber(currentTime) : currentTime;
    
    return `${localizedTime} | ${dayName} ${localizedDate}`;
  }, [currentTime, isBangla]);

  // --- Prevent background scrolling when modal is open ---
  useEffect(() => {
    const isAnyModalOpen = 
      isCalcOpen ||
      isExpenseModalOpen ||
      isDueListModalOpen ||
      selectedCustomerForDetail !== null ||
      isOutOfStockModalOpen ||
      isProductRateModalOpen ||
      activeProfitCalcProduct !== null ||
      isAddDueModalOpen ||
      isSyncModalOpen ||
      isRestoreChoiceModalOpen ||
      isDeleteDateModalOpen ||
      isOthersModalOpen ||
      depositingCustomerName !== null ||
      syncConflictData !== null ||
      confirmModal !== null;

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [
    isCalcOpen,
    isExpenseModalOpen,
    isDueListModalOpen,
    selectedCustomerForDetail,
    isOutOfStockModalOpen,
    isProductRateModalOpen,
    activeProfitCalcProduct,
    isAddDueModalOpen,
    isSyncModalOpen,
    isRestoreChoiceModalOpen,
    isDeleteDateModalOpen,
    isOthersModalOpen,
    depositingCustomerName,
    syncConflictData,
    confirmModal
  ]);

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

  const [currentUser, setCurrentUser] = useState<any>(null);



  // --- Listen for Firebase Auth changes ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user && user.email) {
        setUserEmail(user.email);
        localStorage.setItem('hisab_khata_sync_email', user.email);
      } else {
        // Since we now require secure Google/password login, we do not auto-authenticate in the background.
        // We disable sync if the user is not authenticated.
        setIsSyncActive(false);
        setUserEmail('');
        localStorage.setItem('hisab_khata_sync', 'false');
        localStorage.removeItem('hisab_khata_sync_email');
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
            
            // Read latest raw local storage values to avoid stale closures
            const localTxsStr = localStorage.getItem('hisab_khata_transactions');
            const localExsStr = localStorage.getItem('hisab_khata_expenses');
            const localTxs = localTxsStr ? JSON.parse(localTxsStr) : [];
            const localExs = localExsStr ? JSON.parse(localExsStr) : [];
            const isLocalEmpty = localTxs.length === 0 && localExs.length === 0;
            const isCloudNotEmpty = (cloudData.transactions && cloudData.transactions.length > 0) || 
                                    (cloudData.expenses && cloudData.expenses.length > 0) ||
                                    (cloudData.outOfStockItems && cloudData.outOfStockItems.length > 0) ||
                                    (cloudData.productRates && cloudData.productRates.length > 0);

            if (cloudUpdateTime > localUpdateTime || (isLocalEmpty && isCloudNotEmpty)) {
              setTransactions(cloudData.transactions || []);
              setExpenses(cloudData.expenses || []);
              setOutOfStockItems(cloudData.outOfStockItems || []);
              setProductRates(cloudData.productRates || []);
              if (cloudData.shopName) {
                setShopName(cloudData.shopName);
                localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
              }
              localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
              localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
              localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(cloudData.outOfStockItems || []));
              localStorage.setItem('hisab_khata_product_rates', JSON.stringify(cloudData.productRates || []));
              localStorage.setItem('hisab_khata_last_updated', String(cloudUpdateTime));
              showToast(isBangla ? 'ক্লাউড থেকে নতুন ডাটা আপডেট করা হয়েছে!' : 'Newer data synced from cloud!');
            } else if (localUpdateTime > cloudUpdateTime) {
              await uploadLedgerToCloud(userEmail, localTxs, localExs, shopName, outOfStockItems, productRates);
              localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
            }
          } else {
            const localTxsStr = localStorage.getItem('hisab_khata_transactions');
            const localExsStr = localStorage.getItem('hisab_khata_expenses');
            const localTxs = localTxsStr ? JSON.parse(localTxsStr) : [];
            const localExs = localExsStr ? JSON.parse(localExsStr) : [];
            await uploadLedgerToCloud(userEmail, localTxs, localExs, shopName, outOfStockItems, productRates);
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
      triggerCloudSync(txList, expenses, shopName, userEmail, outOfStockItems, productRates);
    }
  };

  const saveExpensesToStorage = (expList: Expense[]) => {
    setExpenses(expList);
    localStorage.setItem('hisab_khata_expenses', JSON.stringify(expList));
    const now = Date.now();
    localStorage.setItem('hisab_khata_last_updated', String(now));
    if (isSyncActive) {
      triggerCloudSync(transactions, expList, shopName, userEmail, outOfStockItems, productRates);
    }
  };

  const saveOutOfStockItemsToStorage = (oosList: OutOfStockItem[]) => {
    setOutOfStockItems(oosList);
    localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(oosList));
    const now = Date.now();
    localStorage.setItem('hisab_khata_last_updated', String(now));
    if (isSyncActive) {
      triggerCloudSync(transactions, expenses, shopName, userEmail, oosList, productRates);
    }
  };

  const saveProductRatesToStorage = (ratesList: ProductRateItem[]) => {
    setProductRates(ratesList);
    localStorage.setItem('hisab_khata_product_rates', JSON.stringify(ratesList));
    const now = Date.now();
    localStorage.setItem('hisab_khata_last_updated', String(now));
    if (isSyncActive) {
      triggerCloudSync(transactions, expenses, shopName, userEmail, outOfStockItems, ratesList);
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

  const handleNavTabChange = (tab: 'home' | 'info' | 'monthly' | 'settings') => {
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
    currentEmail: string = userEmail,
    currentOos: OutOfStockItem[] = outOfStockItems,
    currentRates: ProductRateItem[] = productRates
  ) => {
    if (!isSyncActive || !currentEmail || !currentEmail.trim()) return;
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'ফায়ারবেস ক্লাউডে ডেটা সিঙ্ক হচ্ছে...' : 'Syncing data with Firebase Cloud...');
    
    try {
      const now = Date.now();
      await uploadLedgerToCloud(currentEmail, currentTxs, currentExs, currentShopName, currentOos, currentRates);
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
        // Authenticate in background to satisfy Firestore rules requirement
        try {
          await ensureAuthForEmail(emailToUse);
        } catch (authErr: any) {
          if (authErr.message === 'SECURE_AUTH_REQUIRED') {
            showToast(
              isBangla 
                ? 'অনুগ্রহ করে প্রথমে গুগল লগইন সম্পন্ন করুন।' 
                : 'Please complete secure Google login first.'
            );
            setIsSyncModalOpen(true);
            return;
          }
          throw authErr;
        }

        const cloudData = await downloadLedgerFromCloud(emailToUse);
        
        // Read actual synchronous local values directly from localStorage to prevent any React state stales/closures
        const localTxsStr = localStorage.getItem('hisab_khata_transactions');
        const localExsStr = localStorage.getItem('hisab_khata_expenses');
        const localOosStr = localStorage.getItem('hisab_khata_out_of_stock');
        const localRatesStr = localStorage.getItem('hisab_khata_product_rates');
        const localTxs = localTxsStr ? JSON.parse(localTxsStr) : [];
        const localExs = localExsStr ? JSON.parse(localExsStr) : [];
        const localOos = localOosStr ? JSON.parse(localOosStr) : [];
        const localRates = localRatesStr ? JSON.parse(localRatesStr) : [];
        const localShopName = localStorage.getItem('hisab_khata_shop_name') || shopName;
        const localUpdated = localStorage.getItem('hisab_khata_last_updated');
        const localUpdateTime = localUpdated ? parseInt(localUpdated, 10) : 0;

        if (cloudData) {
          const isCloudNotEmpty = (cloudData.transactions && cloudData.transactions.length > 0) || 
                                  (cloudData.expenses && cloudData.expenses.length > 0) ||
                                  (cloudData.outOfStockItems && cloudData.outOfStockItems.length > 0) ||
                                  (cloudData.productRates && cloudData.productRates.length > 0);
          
          const isLocalNotEmpty = localTxs.length > 0 || 
                                  localExs.length > 0 || 
                                  localOos.length > 0 || 
                                  localRates.length > 0;

          // Check for Sync Conflict:
          // If BOTH local database and cloud database contain some data, we have a sync conflict.
          // In this case, we present a modal to let the user choose.
          if (isLocalNotEmpty && isCloudNotEmpty) {
            setSyncConflictData({
              email: emailToUse,
              cloudData,
              localData: {
                transactions: localTxs,
                expenses: localExs,
                outOfStockItems: localOos,
                productRates: localRates,
                shopName: localShopName,
                lastUpdated: localUpdateTime
              }
            });
            setIsSyncModalOpen(false); // Close standard settings sync modal
            return;
          }
          
          const isLocalEmpty = localTxs.length === 0 && localExs.length === 0;
          const cloudUpdateTime = cloudData.updatedAt || 0;

          setIsSyncActive(true);
          localStorage.setItem('hisab_khata_sync', 'true');
          localStorage.setItem('hisab_khata_sync_email', emailToUse);
          setUserEmail(emailToUse);

          if (cloudUpdateTime > localUpdateTime || (isLocalEmpty && isCloudNotEmpty)) {
            setTransactions(cloudData.transactions || []);
            setExpenses(cloudData.expenses || []);
            setOutOfStockItems(cloudData.outOfStockItems || []);
            setProductRates(cloudData.productRates || []);
            if (cloudData.shopName) {
              setShopName(cloudData.shopName);
              localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
            }
            localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
            localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
            localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(cloudData.outOfStockItems || []));
            localStorage.setItem('hisab_khata_product_rates', JSON.stringify(cloudData.productRates || []));
            localStorage.setItem('hisab_khata_last_updated', String(cloudUpdateTime || Date.now()));
            
            showToast(
              isBangla 
                ? 'ক্লাউড থেকে সর্বশেষ ডাটা সফলভাবে ডাউনলোড করা হয়েছে!' 
                : 'Latest data successfully downloaded from cloud!'
            );
          } else {
            await uploadLedgerToCloud(emailToUse, localTxs, localExs, localShopName, localOos, localRates);
            localStorage.setItem('hisab_khata_last_updated', String(Date.now()));
            showToast(
              isBangla 
                ? 'ক্লাউডে স্থানীয় ডাটা সফলভাবে আপলোড করা হয়েছে!' 
                : 'Local data successfully uploaded to cloud!'
            );
          }
        } else {
          // Cloud is completely empty - safe to upload everything directly
          setIsSyncActive(true);
          localStorage.setItem('hisab_khata_sync', 'true');
          localStorage.setItem('hisab_khata_sync_email', emailToUse);
          setUserEmail(emailToUse);

          await uploadLedgerToCloud(emailToUse, localTxs, localExs, localShopName, localOos, localRates);
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
    if (isCapacitor) {
      setShowAuthHelp(true);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'গুগল লগইন করা হচ্ছে...' : 'Logging in with Google...');
    try {
      const email = await loginWithGoogle();
      showToast(isBangla ? `গুগল লগইন সফল হয়েছে: ${email}` : `Google login successful: ${email}`);
      // Automatically toggle sync if not active
      if (!isSyncActive) {
        await toggleSyncState(email);
      }
    } catch (error: any) {
      console.error('Google Login Error:', error);
      let errorMsg = isBangla ? 'গুগল লগইন ব্যর্থ হয়েছে!' : 'Google Login failed!';
      if (error?.message) {
        errorMsg += ` (${error.message})`;
      }
      showToast(errorMsg);
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  const handleLogout = async () => {
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'লগআউট করা হচ্ছে...' : 'Signing out...');
    try {
      await logOutFromFirebase();
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
  const todayTransactions = useMemo(() => {
    return transactions
      .filter((tx) => tx.date === selectedDate)
      .sort((a, b) => getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time));
  }, [transactions, selectedDate]);

  const todayExpenses = useMemo(() => {
    return expenses
      .filter((ex) => ex.date === selectedDate)
      .sort((a, b) => getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time));
  }, [expenses, selectedDate]);

  // Dynamic calculations
  const todaySales = useMemo(() => todayTransactions.reduce((sum, tx) => {
    // Only regular sales count as total sales (exclude due payment collections as they are already accounted for in sales of the day credit was given, or treated as cash flow).
    // To match this literal Flutter app behavior perfectly, we will count all today's ledger entry amounts in total sales!
    return sum + tx.amount;
  }, 0), [todayTransactions]);

  const todayCashDeposit = useMemo(() => todayTransactions.reduce((sum, tx) => {
    return sum + (tx.isCash ? tx.amount : 0);
  }, 0), [todayTransactions]);

  const todayDueTaken = useMemo(() => todayTransactions.reduce((sum, tx) => {
    return sum + (!tx.isCash ? tx.amount : 0);
  }, 0), [todayTransactions]);

  const todayExpenseTotal = useMemo(() => todayExpenses.reduce((sum, ex) => sum + ex.amount, 0), [todayExpenses]);

  // --- Global Customer Due Calculation across all time ---
  // Calculates live customer due lists dynamically from all recorded transactions.
  const customerDues = useMemo((): CustomerDue[] => {
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
      .filter((cd) => cd.amount > 0)
      .sort((a, b) => getTimestamp(b.lastDate, b.lastTime) - getTimestamp(a.lastDate, a.lastTime));
  }, [transactions]);

  const globalTotalDue = useMemo(() => customerDues.reduce((sum, cd) => sum + cd.amount, 0), [customerDues]);

  // Selected customer details and transaction history calculations
  const selectedCustomerTxHistory = useMemo(() => {
    if (!selectedCustomerForDetail) return [];
    return transactions.filter(tx => 
      tx.customer && 
      tx.customer.trim().toLowerCase() === selectedCustomerForDetail.trim().toLowerCase()
    ).sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
  }, [transactions, selectedCustomerForDetail]);

  const selectedCustomerTotalDue = useMemo(() => {
    if (!selectedCustomerForDetail) return 0;
    const found = customerDues.find(cd => cd.name.trim().toLowerCase() === selectedCustomerForDetail.trim().toLowerCase());
    return found ? found.amount : 0;
  }, [customerDues, selectedCustomerForDetail]);

  const soldTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const prodLower = tx.product.toLowerCase().trim();
      return !(
        prodLower.startsWith('বাকি টাকা জমা') || 
        prodLower.startsWith('বাকির টাকা জমা') || 
        prodLower.includes('due deposit')
      );
    }).sort((a, b) => getTimestamp(b.date, b.time) - getTimestamp(a.date, a.time));
  }, [transactions]);

  const filteredSoldTransactions = useMemo(() => {
    if (!historySearchQuery.trim()) return soldTransactions;
    const q = historySearchQuery.toLowerCase().trim();
    return soldTransactions.filter(tx => 
      tx.product.toLowerCase().includes(q) ||
      (tx.customer && tx.customer.toLowerCase().includes(q))
    );
  }, [soldTransactions, historySearchQuery]);

  // --- All-time Product Sales Helper for Donut Chart ---
  const allTimeSales = useMemo(() => {
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
  }, [transactions]);
  
  // Group everything after top 6 into 'Others' (অন্যান্য)
  const chartData = useMemo(() => {
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
  }, [allTimeSales, isBangla]);
  
  // Pre-calculate accumulated offsets for correct SVG rendering of donut slices
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314.159
  
  const accumulatedOffsetArray = useMemo(() => {
    const accumulatedOffsetArray: number[] = [];
    let runningOffset = 0;
    chartData.forEach(data => {
      accumulatedOffsetArray.push(runningOffset);
      runningOffset += (data.percentage / 100) * circumference;
    });
    return accumulatedOffsetArray;
  }, [chartData, circumference]);

  const filteredModalDues = useMemo(() => {
    return customerDues.filter((cd) =>
      cd.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
    );
  }, [customerDues, modalSearchQuery]);

  // Find previous customer names for quick selection
  const previousCustomers = useMemo(() => {
    return Array.from(
      new Set(
        transactions
          .map((tx) => tx.customer?.trim())
          .filter((name): name is string => typeof name === 'string' && name.length > 0)
      )
    ).slice(0, 8);
  }, [transactions]);

  // Get monthly stats (memoized object)
  const monthlyStats = useMemo(() => {
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
  }, [transactions, expenses]);

  // Get weekly stats & details
  const weeklyReport = useMemo(() => {
    // Calculate date days ago (inclusive of today)
    const getDaysAgoDate = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    
    let daysToSubtract = 6;
    if (weeklyPeriod === '30D') daysToSubtract = 29;
    if (weeklyPeriod === '1D') daysToSubtract = 0;
    
    const periodStartDateStr = getDaysAgoDate(daysToSubtract);
    
    // Filter transactions and expenses based on selected period
    const weeklyTxs = transactions.filter(tx => tx.date >= periodStartDateStr);
    const weeklyExs = expenses.filter(ex => ex.date >= periodStartDateStr);
    
    // 1. Total sales money
    const totalSales = weeklyTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const totalCashSales = weeklyTxs.filter(tx => tx.isCash).reduce((sum, tx) => sum + tx.amount, 0);
    const totalDueSales = weeklyTxs.filter(tx => !tx.isCash).reduce((sum, tx) => sum + tx.amount, 0);
    
    // Helper to filter out due deposits for product analysis
    const isProductSale = (tx: Transaction) => {
      const prodLower = tx.product.toLowerCase().trim();
      return !(
        prodLower.startsWith('বাকি টাকা জমা') || 
        prodLower.startsWith('বাকির টাকা জমা') || 
        prodLower.includes('due deposit') ||
        prodLower.includes('বাকি টাকা জমা')
      );
    };
    
    const weeklySalesTxs = weeklyTxs.filter(isProductSale);
    
    // Map to aggregate product count & amount
    const productMap: Record<string, { name: string; count: number; totalAmount: number; txs: { date: string; customer?: string; amount: number }[] }> = {};
    
    // Variable to track most expensive single product sold
    let mostExpensiveProduct = { name: '', price: 0, date: '' };
    
    weeklySalesTxs.forEach(tx => {
      const parts = tx.product.split('+').map(p => p.trim()).filter(p => {
        const pl = p.toLowerCase();
        return pl !== '' && pl !== 'নগদ' && pl !== 'cash';
      });
      if (parts.length === 0) return;
      const splitAmount = tx.amount / parts.length;
      
      parts.forEach(part => {
        const key = part.toLowerCase();
        if (!productMap[key]) {
          productMap[key] = {
            name: part,
            count: 0,
            totalAmount: 0,
            txs: []
          };
        }
        productMap[key].count += 1;
        productMap[key].totalAmount += splitAmount;
        productMap[key].txs.push({
          date: tx.date,
          customer: tx.customer,
          amount: splitAmount
        });
        
        // Track most expensive sold product
        if (splitAmount > mostExpensiveProduct.price) {
          mostExpensiveProduct = {
            name: part,
            price: splitAmount,
            date: tx.date
          };
        }
      });
    });
    
    const productList = Object.values(productMap);
    
    // 2. Most sold products (up to 10)
    let mostSoldProducts: typeof productList = [];
    if (productList.length > 0) {
      mostSoldProducts = [...productList]
        .sort((a, b) => b.count - a.count || b.totalAmount - a.totalAmount)
        .slice(0, 10);
    }
    
    // 3. Least sold products (up to 10)
    let leastSoldProducts: typeof productList = [];
    if (productList.length > 0) {
      leastSoldProducts = [...productList]
        .sort((a, b) => a.count - b.count || a.totalAmount - b.totalAmount)
        .slice(0, 10);
    }
    
    // Find up to 10 most expensive single transactions/product sales
    const individualSales: { name: string; price: number; date: string; customer?: string }[] = [];
    weeklySalesTxs.forEach(tx => {
      const parts = tx.product.split('+').map(p => p.trim()).filter(p => {
        const pl = p.toLowerCase();
        return pl !== '' && pl !== 'নগদ' && pl !== 'cash';
      });
      if (parts.length === 0) return;
      const splitAmount = tx.amount / parts.length;
      parts.forEach(part => {
        individualSales.push({
          name: part,
          price: splitAmount,
          date: tx.date,
          customer: tx.customer
        });
      });
    });
    
    const mostExpensiveProducts = [...individualSales]
      .sort((a, b) => b.price - a.price)
      .slice(0, 10);

    // 4. Total Expense
    const totalExpense = weeklyExs.reduce((sum, ex) => sum + ex.amount, 0);

    // 5. Total Due Deposits (বাকির টাকা জমা - other transactions / collections)
    const totalDueDeposits = weeklyTxs.filter(tx => !isProductSale(tx)).reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      startDate: periodStartDateStr,
      totalSales,
      totalCashSales,
      totalDueSales,
      mostSoldProducts,
      leastSoldProducts,
      mostExpensiveProduct,
      mostExpensiveProducts,
      totalExpense,
      weeklyExs,
      totalDueDeposits
    };
  }, [transactions, expenses, weeklyPeriod]);

  // Get top selling products of the month (memoized array)
  const topSellingProducts = useMemo(() => {
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
  }, [transactions]);

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

  // Add Out of Stock item
  const handleAddOutOfStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oosItemName.trim()) return;

    const newItem: OutOfStockItem = {
      id: generateId(),
      name: oosItemName.trim(),
      dateAdded: selectedDate // YYYY-MM-DD
    };

    const updated = [newItem, ...outOfStockItems];
    saveOutOfStockItemsToStorage(updated);

    // Reset Form & Close Modal
    setOosItemName('');
    setIsOutOfStockModalOpen(false);

    showToast(isBangla ? 'আইটেমটি তালিকায় যুক্ত হয়েছে!' : 'Item added to list!');
  };

  // Delete Out of Stock item
  const handleDeleteOutOfStock = (id: string) => {
    const updated = outOfStockItems.filter(item => item.id !== id);
    saveOutOfStockItemsToStorage(updated);
    showToast(isBangla ? 'আইটেমটি তালিকা থেকে মুছে ফেলা হয়েছে!' : 'Item deleted from list!');
  };

  // Update Out of Stock item
  const handleUpdateOutOfStock = (id: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = outOfStockItems.map(item => 
      item.id === id ? { ...item, name: newName.trim() } : item
    );
    saveOutOfStockItemsToStorage(updated);
    showToast(isBangla ? 'ঘাটতি পণ্যের নাম আপডেট করা হয়েছে!' : 'Out of stock item updated!');
  };

  // Add Product rate item
  const handleAddProductRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateItemName.trim() || !rateItemPrice) return;
    const price = parseFloat(rateItemPrice);
    if (isNaN(price) || price < 0) return;

    const newItem: ProductRateItem = {
      id: generateId(),
      name: rateItemName.trim(),
      buyingPrice: price,
      dateAdded: selectedDate, // YYYY-MM-DD
      keywords: rateItemKeywords.trim() || undefined
    };

    const updated = [newItem, ...productRates];
    saveProductRatesToStorage(updated);

    // Reset Form & Close Modal
    setRateItemName('');
    setRateItemPrice('');
    setRateItemKeywords('');
    setIsProductRateModalOpen(false);

    showToast(isBangla ? 'মালের রেট যুক্ত হয়েছে!' : 'Product rate added!');
  };

  // Add customer due from Due List tab
  const handleAddDue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDueCustomerName.trim() || !addDueAmount) return;
    const price = parseFloat(addDueAmount);
    if (isNaN(price) || price <= 0) return;

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
      product: addDueProduct.trim() || (isBangla ? 'পূর্বের বকেয়া বাকি' : 'Previous Due'),
      amount: price,
      isCash: false,
      customer: addDueCustomerName.trim()
    };

    const updated = [newTx, ...transactions];
    saveTransactionsToStorage(updated);

    // Reset Form & Close Modal
    setAddDueCustomerName('');
    setAddDueAmount('');
    setAddDueProduct('');
    setIsAddDueModalOpen(false);

    showToast(isBangla ? 'বকেয়া হিসাব সফলভাবে যোগ হয়েছে!' : 'Due outstanding added successfully!');
  };

  // Delete Product rate item
  const handleDeleteProductRate = (id: string) => {
    const updated = productRates.filter(item => item.id !== id);
    saveProductRatesToStorage(updated);
    showToast(isBangla ? 'মালের রেট মুছে ফেলা হয়েছে!' : 'Product rate deleted!');
  };

  // Update Product rate item
  const handleUpdateProductRate = (id: string, newName: string, newPrice: number, newKeywords?: string) => {
    if (!newName.trim() || isNaN(newPrice) || newPrice < 0) return;
    const updated = productRates.map(item => 
      item.id === id ? { ...item, name: newName.trim(), buyingPrice: newPrice, keywords: newKeywords?.trim() || undefined } : item
    );
    saveProductRatesToStorage(updated);
    showToast(isBangla ? 'মালের রেট ও দাম আপডেট করা হয়েছে!' : 'Product rate updated!');
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
  const handleExportBackup = async () => {
    const backupData = {
      transactions,
      expenses,
      outOfStockItems,
      productRates,
      exportDate: new Date().toISOString(),
      creator: userEmail
    };

    const backupStr = JSON.stringify(backupData, null, 2);
    // Save to local device memory (localStorage)
    localStorage.setItem('hisab_khata_local_memory_backup', backupStr);

    const fileName = `hisab_khata_backup_${selectedDate}.json`;

    if (isCapacitor) {
      try {
        const base64Data = btoa(unescape(encodeURIComponent(backupStr)));
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Cache,
        });

        await Share.share({
          title: isBangla ? 'হিসাব খাতা ব্যাকআপ ফাইল' : 'Hisab Khata Backup File',
          text: isBangla ? 'হিসাব খাতার ব্যাকআপ ফাইল সংরক্ষণ অথবা শেয়ার করুন' : 'Save or share Hisab Khata backup file',
          url: writeResult.uri,
          dialogTitle: isBangla ? 'ব্যাকআপ ফাইল সংরক্ষণ/শেয়ার করুন' : 'Save/Share Backup File',
        });

        showToast(isBangla ? 'ব্যাকআপ ফাইল সফলভাবে ফোনে সেভ হয়েছে এবং শেয়ার করার জন্য প্রস্তুত!' : 'Backup file successfully saved on phone and ready to save/share!');
      } catch (error: any) {
        const errorStr = String(error).toLowerCase();
        const isCanceled = errorStr.includes('cancel') || errorStr.includes('canceled') || errorStr.includes('cancelled');
        
        if (isCanceled) {
          console.log('Share action was canceled by user/system.');
          showToast(isBangla ? 'ব্যাকআপ ফাইল শেয়ার করা বাতিল করা হয়েছে।' : 'Backup file sharing cancelled.');
        } else {
          console.error('Failed to save or share backup file via Capacitor:', error);
          showToast(isBangla ? 'ব্যাকআপ ফাইল ফোনে সেভ বা শেয়ার করতে সমস্যা হয়েছে!' : 'Error saving or sharing backup file!');
        }
      }
    } else {
      const blob = new Blob([backupStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(isBangla ? 'ফোনের মেমোরিতে লোকাল ব্যাকআপ সেভ হয়েছে এবং ফাইল ডাউনলোড শুরু হয়েছে!' : 'Backup saved in phone memory and download started!');
    }
  };

  const handleImportClick = () => {
    const localBackup = localStorage.getItem('hisab_khata_local_memory_backup');
    if (localBackup) {
      setIsRestoreChoiceModalOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleRestoreFromLocalMemory = () => {
    const localBackupStr = localStorage.getItem('hisab_khata_local_memory_backup');
    if (!localBackupStr) return;
    try {
      const parsed = JSON.parse(localBackupStr);
      if (Array.isArray(parsed.transactions) && Array.isArray(parsed.expenses)) {
        setTransactions(parsed.transactions);
        setExpenses(parsed.expenses);
        const oos = Array.isArray(parsed.outOfStockItems) ? parsed.outOfStockItems : [];
        const rates = Array.isArray(parsed.productRates) ? parsed.productRates : [];
        setOutOfStockItems(oos);
        setProductRates(rates);
        
        localStorage.setItem('hisab_khata_transactions', JSON.stringify(parsed.transactions));
        localStorage.setItem('hisab_khata_expenses', JSON.stringify(parsed.expenses));
        localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(oos));
        localStorage.setItem('hisab_khata_product_rates', JSON.stringify(rates));
        
        showToast(isBangla ? 'ফোনের মেমোরি ব্যাকআপ থেকে খাতা সফলভাবে রিস্টোর হয়েছে!' : 'Backup restored from phone memory successfully!');
        triggerCloudSync(parsed.transactions, parsed.expenses, shopName, userEmail, oos, rates);
        setIsRestoreChoiceModalOpen(false);
      } else {
        alert(isBangla ? 'ভুল ফরম্যাট! সঠিক ব্যাকআপ ডাটা পাওয়া যায়নি।' : 'Invalid backup format!');
      }
    } catch (err) {
      alert(isBangla ? 'ব্যাকআপ ডাটা পড়তে ত্রুটি হয়েছে!' : 'Error parsing backup data!');
    }
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
          const oos = Array.isArray(parsed.outOfStockItems) ? parsed.outOfStockItems : [];
          const rates = Array.isArray(parsed.productRates) ? parsed.productRates : [];
          setOutOfStockItems(oos);
          setProductRates(rates);
          
          localStorage.setItem('hisab_khata_transactions', JSON.stringify(parsed.transactions));
          localStorage.setItem('hisab_khata_expenses', JSON.stringify(parsed.expenses));
          localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(oos));
          localStorage.setItem('hisab_khata_product_rates', JSON.stringify(rates));
          
          showToast(isBangla ? 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে!' : 'Backup restored successfully!');
          triggerCloudSync(parsed.transactions, parsed.expenses, shopName, userEmail, oos, rates);
          setIsRestoreChoiceModalOpen(false);
        } else {
          alert(isBangla ? 'ভুল ফরম্যাট! সঠিক ব্যাকআপ ফাইল নির্বাচন করুন।' : 'Invalid backup format!');
        }
      } catch (err) {
        alert(isBangla ? 'ফাইল পড়তে ত্রুটি হয়েছে!' : 'Error parsing backup file!');
      }
    };
    reader.readAsText(file);
  };

  // Restore Cloud Backup manually
  const handleRestoreCloudBackup = async () => {
    if (!userEmail || !userEmail.trim()) {
      showToast(isBangla ? 'অনুগ্রহ করে প্রথমে গুগল লগইন করুন।' : 'Please log in with Google first.');
      return;
    }
    
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'ক্লাউড থেকে ব্যাকআপ রিস্টোর করা হচ্ছে...' : 'Restoring backup from cloud...');
    
    try {
      const cloudData = await downloadLedgerFromCloud(userEmail);
      if (cloudData) {
        setTransactions(cloudData.transactions || []);
        setExpenses(cloudData.expenses || []);
        setOutOfStockItems(cloudData.outOfStockItems || []);
        setProductRates(cloudData.productRates || []);
        if (cloudData.shopName !== undefined) {
          setShopName(cloudData.shopName);
          localStorage.setItem('hisab_khata_shop_name', cloudData.shopName);
        }
        localStorage.setItem('hisab_khata_transactions', JSON.stringify(cloudData.transactions || []));
        localStorage.setItem('hisab_khata_expenses', JSON.stringify(cloudData.expenses || []));
        localStorage.setItem('hisab_khata_out_of_stock', JSON.stringify(cloudData.outOfStockItems || []));
        localStorage.setItem('hisab_khata_product_rates', JSON.stringify(cloudData.productRates || []));
        localStorage.setItem('hisab_khata_last_updated', String(cloudData.updatedAt || Date.now()));
        
        showToast(isBangla ? 'ক্লাউড ব্যাকআপ সফলভাবে রিস্টোর করা হয়েছে!' : 'Cloud backup successfully restored!');
      } else {
        showToast(isBangla ? 'ক্লাউডে কোনো ব্যাকআপ ডেটা পাওয়া যায়নি।' : 'No backup data found on cloud.');
      }
    } catch (error) {
      console.error('Failed to restore from cloud:', error);
      showToast(isBangla ? 'ক্লাউড ব্যাকআপ রিস্টোর করতে ব্যর্থ হয়েছে!' : 'Failed to restore cloud backup!');
    } finally {
      setIsSyncing(false);
      setSyncMessage('');
    }
  };

  // Hard Reset Database option
  const handleHardReset = () => {
    setConfirmModal({
      isOpen: true,
      title: isBangla ? 'খাতা সম্পূর্ণ খালি করুন?' : 'Clear all ledger data?',
      message: isBangla 
        ? '⚠️ আপনি কি নিশ্চিতভাবে সমস্ত ডেটা মুছে ফেলে খাতা সম্পূর্ণ খালি করতে চান? এই কাজ আর ফেরত নেওয়া যাবে না।' 
        : '⚠️ ARE YOU SURE you want to clear all ledger data? This action cannot be undone!',
      onConfirm: () => {
        setTransactions([]);
        setExpenses([]);
        setOutOfStockItems([]);
        setProductRates([]);
        localStorage.removeItem('hisab_khata_transactions');
        localStorage.removeItem('hisab_khata_expenses');
        localStorage.removeItem('hisab_khata_out_of_stock');
        localStorage.removeItem('hisab_khata_product_rates');
        localStorage.removeItem('hisab_khata_last_updated');
        showToast(isBangla ? 'সমস্ত হিসাব মুছে খাতা খালি করা হয়েছে।' : 'All ledger data cleared.');
        triggerCloudSync([], [], shopName, userEmail, [], []);
      }
    });
  };



  if (isVerificationOnlyMode) {
    return (
      <div className="min-h-screen bg-[#0B132B] text-slate-100 antialiased font-sans flex flex-col p-4 sm:p-6 md:p-8 relative justify-center items-center overflow-x-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="max-w-xl w-full bg-[#1C2541]/90 backdrop-blur-md border border-[#3A506B]/50 shadow-2xl rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative z-10">
          
          {/* Header & Server Connection Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#3A506B]/40 pb-5 mb-5 gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 border border-teal-500/30 rounded-2xl">
                <ShieldCheck className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white tracking-wide">
                  {isBangla ? 'ফায়ারবেস ক্লাউড মেমো সত্যতা যাচাই' : 'Firebase Cloud Memo Authenticator'}
                </h2>
                <p className="text-[10px] text-teal-400 font-bold mt-1 tracking-wider uppercase">
                  {isBangla ? 'গুগল ক্লাউড সিকিউরিটি পোর্টাল' : 'Google Cloud Security Portal'}
                </p>
              </div>
            </div>
            
            {/* Live Server Indicator */}
            <div className="flex items-center gap-2 bg-[#0B132B] px-3 py-1.5 rounded-xl border border-[#3A506B]/30 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-mono font-black text-emerald-400 tracking-wider">
                FIRESTORE_LIVE
              </span>
            </div>
          </div>

          {/* Database Info Widget */}
          <div className="bg-[#0B132B]/60 border border-[#3A506B]/30 rounded-2xl p-3.5 mb-5 space-y-2 font-mono text-[9px] text-slate-400 leading-normal">
            <div className="flex justify-between items-center">
              <span>[SYSTEM_HOST]</span>
              <span className="text-teal-400 font-bold">Google Cloud Asia-Southeast1</span>
            </div>
            <div className="flex justify-between items-center">
              <span>[DATABASE_PROVIDER]</span>
              <span className="text-teal-400">Firebase Firestore Real-time DB</span>
            </div>
            <div className="flex justify-between items-center">
              <span>[VERIFICATION_HASH]</span>
              <span className="text-slate-300 select-all font-bold">
                {verificationSessionEnded ? 'SESSION_CLOSED_SECURE' : `SHA256-${verificationInvoiceId}`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>[SECURITY_HANDSHAKE]</span>
              <span className="text-emerald-400 font-black">✓ ENCRYPTED_SSL</span>
            </div>
          </div>

          {/* Verification Session Ended state */}
          {verificationSessionEnded && (
            <div className="text-center py-8 space-y-5">
              <div className="h-20 w-20 bg-teal-500/10 border-2 border-teal-500/30 text-teal-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-500/5">
                <ShieldCheck className="h-10 w-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-black text-teal-400 tracking-wide">
                  {isBangla ? 'যাচাইকরণ সেশন শেষ' : 'Verification Session Closed'}
                </h3>
                <div className="bg-[#1C2541] border border-teal-500/20 px-4 py-3.5 rounded-2xl max-w-md mx-auto">
                  <p className="text-[11px] text-slate-200 leading-relaxed font-bold">
                    {isBangla 
                      ? 'নিরাপত্তার স্বার্থে এই যাচাইকরণ সেশনটি বন্ধ করা হয়েছে এবং ওয়েব অ্যাপ্লিকেশনের অ্যাক্সেস অবরুদ্ধ করা হয়েছে। আপনি চাইলে এই ব্রাউজার উইন্ডো বা ট্যাবটি নিরাপদে বন্ধ করতে পারেন।'
                      : 'For security reasons, this verification session has been closed and web application access is blocked. You may safely close this browser window or tab.'}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-normal">
                  {isBangla 
                    ? 'হিসাব খাতার ক্যাশ মেমো যাচাইকরণে অংশগ্রহণ করার জন্য আপনাকে ধন্যবাদ।'
                    : 'Thank you for using Hisab Khata secure receipt verification service.'}
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {!verificationSessionEnded && isVerifying && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="h-10 w-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
              <div className="text-center space-y-1.5">
                <p className="text-xs font-black text-teal-400 animate-pulse">
                  {isBangla ? 'ফায়ারবেস সার্ভার থেকে যাচাই করা হচ্ছে...' : 'Querying Firebase secure records...'}
                </p>
                <p className="text-[10px] text-slate-500 font-bold">
                  {isBangla ? 'রিয়েল-টাইম ক্লাউড ডাটাবেজ অনুসন্ধান চলছে' : 'Establishing Firestore database handshake'}
                </p>
              </div>
            </div>
          )}

          {/* Verification Failed or Unregistered state */}
          {!verificationSessionEnded && !isVerifying && verificationError && (
            <div className="text-center py-8 space-y-5">
              <div className="h-20 w-20 bg-rose-500/10 border-2 border-rose-500/30 text-rose-400 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-500/5">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div className="space-y-3">
                <h3 className="text-lg font-black text-rose-400 tracking-wide">
                  {verificationError === 'failed' 
                    ? (isBangla ? 'সার্ভার সংযোগ ত্রুটি!' : 'Server Connection Error!')
                    : (isBangla ? 'নকল বা অনিবন্ধিত মেমো!' : 'Unregistered or Modified Memo!')}
                </h3>
                <div className="bg-[#1C2541] border border-rose-500/20 px-4 py-3.5 rounded-2xl max-w-md mx-auto">
                  <p className="text-[11px] text-rose-200 leading-relaxed font-bold">
                    {verificationError === 'failed'
                      ? (isBangla 
                          ? 'দুঃখিত, ক্লাউড সার্ভারের সাথে সংযোগ করা সম্ভব হয়নি। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।'
                          : 'Sorry, we couldn\'t connect to the secure verification server. Please check your internet connection and try again.')
                      : (isBangla 
                          ? `সতর্কতা: রশিদ নং ${verificationInvoiceId} ফায়ারবেস ক্লাউড সার্ভারে পাওয়া যায়নি! এই মেমোটি এডিটিং সফটওয়্যার বা এআই দিয়ে পরিবর্তন করা হয়ে থাকতে পারে অথবা দোকান মালিক মেমোটি তৈরি করার সময় ক্লাউডে ডাটা সংরক্ষণ করেননি!`
                          : `Warning: Invoice ${verificationInvoiceId} is not registered in Firebase server! This memo may be modified, fake, or was not uploaded to the cloud ledger by the shop proprietor.`)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-normal">
                  {isBangla 
                    ? 'আসল মেমো ক্রিয়েট করার সাথে সাথে ক্লাউড ভেরিফিকেশনে অটোমেটিক সেভ হয়ে যায়। অনুগ্রহ করে ক্যাশ মেমোটির সঠিকতা যাচাই করতে দোকানদারের সাথে যোগাযোগ করুন।'
                    : 'Genuine memos are synchronized instantly. Please verify with the shop owner regarding the authenticity of this printed receipt.'}
                </p>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleCloseVerification}
                  className="px-6 py-3 bg-[#3A506B] hover:bg-[#4A648C] text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md"
                >
                  {isBangla ? 'যাচাই বন্ধ করুন' : 'Close Verification'}
                </button>
              </div>
            </div>
          )}

          {/* Verification Successful state */}
          {!isVerifying && verifiedMemoData && (
            <div className="space-y-6">
              
              {/* Success Badge */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-4.5 rounded-2xl flex items-center gap-4 shadow-lg shadow-emerald-500/5">
                <div className="h-12 w-12 bg-emerald-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                  <Check className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-emerald-400">
                    {isBangla ? '✓ আসল ক্যাশ মেমো নিশ্চিত!' : '✓ Official Authentic Memo Confirmed!'}
                  </h3>
                  <p className="text-[10px] text-emerald-300 font-bold mt-1 leading-snug">
                    {isBangla 
                      ? 'এই ক্যাশ মেমোটির তথ্য ফায়ারবেস সুরক্ষিত ডেটাবেজের সাথে শতভাগ মিলেছে। এটি কোনোভাবেই এডিট বা পরিবর্তন করা হয়নি।' 
                      : 'This memo matches exactly with the records saved in the secure cloud and is tamper-proof.'}
                  </p>
                </div>
              </div>

              {/* Verified details text summary */}
              <div className="bg-[#0B132B]/70 border border-[#3A506B]/30 p-4 rounded-2xl text-[11px] font-bold text-slate-300 space-y-2 leading-relaxed">
                <p className="text-[10px] font-black uppercase text-teal-400 tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{isBangla ? 'সার্ভার ভেরিফাইড টেক্সট' : 'Server Verified Statement'}</span>
                </p>
                <p className="italic text-slate-100 bg-[#1C2541]/50 p-2.5 rounded-xl border border-[#3A506B]/20">
                  "{verifiedMemoData.verifiedText}"
                </p>
              </div>

              {/* Full Memo Data Breakdown */}
              <div className="border border-[#3A506B]/40 rounded-2xl overflow-hidden shadow-xl bg-[#0B132B]/30">
                <div className="bg-[#1C2541] border-b border-[#3A506B]/40 px-4 py-2.5 text-[10px] font-black text-slate-200 uppercase tracking-wider flex justify-between">
                  <span>{isBangla ? 'মেমোর বিস্তারিত বিবরণ' : 'Memo Specifications'}</span>
                  <span className="text-teal-400 font-black tracking-wide">{verifiedMemoData.invoiceNo || verificationInvoiceId}</span>
                </div>
                
                <div className="p-4 space-y-3 text-xs font-bold text-slate-300">
                  <div className="flex justify-between border-b border-[#3A506B]/20 pb-2">
                    <span className="text-slate-400">{isBangla ? 'দোকানের নাম:' : 'Shop Name:'}</span>
                    <span className="text-white font-black">{verifiedMemoData.shopName || (isBangla ? 'অজানা দোকান' : 'Unknown Shop')}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#3A506B]/20 pb-2">
                    <span className="text-slate-400">{isBangla ? 'ক্রেতার নাম:' : 'Customer Name:'}</span>
                    <span className="text-white font-extrabold">{verifiedMemoData.customerName || (isBangla ? 'সাধারণ ক্রেতা' : 'General Customer')}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#3A506B]/20 pb-2">
                    <span className="text-slate-400">{isBangla ? 'তৈরির তারিখ:' : 'Created Date:'}</span>
                    <span className="text-white">{verifiedMemoData.date ? formatDate(verifiedMemoData.date, isBangla) : (isBangla ? 'অজানা তারিখ' : 'Unknown Date')}</span>
                  </div>
                  
                  {/* Items list */}
                  <div className="mt-4 space-y-1.5 bg-[#1C2541]/50 p-3 rounded-2xl border border-[#3A506B]/20 max-h-[160px] overflow-y-auto">
                    <p className="text-[9px] font-black uppercase text-teal-400 tracking-wider mb-2">
                      {isBangla ? 'পণ্য ও মূল্যের বিবরণী' : 'Products & Price Details'}
                    </p>
                    {verifiedMemoData.items && verifiedMemoData.items.length > 0 ? (
                      verifiedMemoData.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[11px] py-1 border-b border-[#3A506B]/10 last:border-0 font-extrabold text-slate-200">
                          <span>{item.name} <span className="text-[8px] text-slate-400">({isBangla ? toBanglaNumber(item.quantity) : item.quantity} {item.unit || ''})</span></span>
                          <span>৳{isBangla ? toBanglaNumber(item.total) : item.total}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-slate-400 italic">
                        {isBangla 
                          ? 'পণ্যের বিস্তারিত বিবরণী এই মেমোর জন্য ক্লাউড সার্ভারে সংরক্ষিত নেই।' 
                          : 'Product details are not registered in cloud server for this memo.'}
                      </p>
                    )}
                  </div>

                  {/* Pricing summaries */}
                  <div className="pt-2 space-y-2 text-slate-400 font-extrabold">
                    <div className="flex justify-between text-[11px]">
                      <span>{isBangla ? 'উপ-মোট মূল্য:' : 'Subtotal:'}</span>
                      <span className="text-slate-200">৳{isBangla ? toBanglaNumber(verifiedMemoData.subTotal || 0) : (verifiedMemoData.subTotal || 0)}</span>
                    </div>
                    {(verifiedMemoData.discount || 0) > 0 && (
                      <div className="flex justify-between text-[11px]">
                        <span>{isBangla ? 'ডিসকাউন্ট (ছাড়):' : 'Discount:'}</span>
                        <span className="text-rose-400">- ৳{isBangla ? toBanglaNumber(verifiedMemoData.discount) : verifiedMemoData.discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-teal-400 font-black text-sm border-t border-[#3A506B]/40 pt-2">
                      <span>{isBangla ? 'সর্বমোট মূল্য (পরিশোধযোগ্য):' : 'Net Payable:'}</span>
                      <span>৳{isBangla ? toBanglaNumber(verifiedMemoData.netTotal || 0) : (verifiedMemoData.netTotal || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span>{isBangla ? 'পরিশোধিত টাকা:' : 'Paid Amount:'}</span>
                      <span className="text-emerald-400 font-black">৳{isBangla ? toBanglaNumber(verifiedMemoData.paid || 0) : (verifiedMemoData.paid || 0)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] border-t border-[#3A506B]/10 pt-1.5" style={{ color: (verifiedMemoData.due || 0) > 0 ? '#f87171' : '#34d399' }}>
                      <span>{isBangla ? 'বাকি বা বকেয়া:' : 'Due balance:'}</span>
                      <span className="font-black">৳{isBangla ? toBanglaNumber(verifiedMemoData.due || 0) : (verifiedMemoData.due || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleCloseVerification}
                  className="w-full py-3 bg-[#3A506B] hover:bg-[#4A648C] text-white text-xs font-black rounded-xl transition-all cursor-pointer text-center"
                >
                  {isBangla ? 'যাচাই সম্পন্ন করুন' : 'Finish Verification'}
                </button>
              </div>

            </div>
          )}

          {/* Footer branding */}
          <div className="text-center text-[9px] text-[#5C7594] font-bold border-t border-[#3A506B]/30 pt-4 mt-6 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
            <span>{isBangla ? 'হিসাব খাতা সিকিউরড ক্লাউড অথেন্টিকেটর' : 'Hisab Khata Secured Cloud Authenticator'}</span>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 antialiased font-sans flex flex-col pb-24 relative overflow-x-hidden">
      
      {/* --- Fixed Top Area (Progress Bar + Header) --- */}
      <div className="fixed top-0 left-0 right-0 z-40 flex flex-col shadow-xs border-b border-slate-100">
        {/* 🚀 Top Simulated Cloud Sync Active Progress Bar */}
        <AnimatePresence>
          {isSyncing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-teal-600 text-white text-xs py-2 px-4 flex items-center justify-between shadow-inner relative overflow-hidden z-50"
              id="sync-progressbar"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
                <span className="font-medium">{syncMessage}</span>
              </div>
              {/* Infinite loading line */}
              <div className="absolute bottom-0 left-0 h-[2px] bg-emerald-300 animate-[loading_1.5s_infinite_linear]" style={{ width: '40%' }}></div>
            </motion.div>
          )}
        </AnimatePresence>
   
        {/* --- App Header & Action Bar --- */}
        <header className="bg-white py-3">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-3">
            
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-2">
              <img
                src={logoPngWithCache}
                onError={handleLogoError}
                alt="হিসাব খাতা"
                className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl object-cover shadow-sm border border-slate-200/60 shrink-0 transition-transform duration-250 active:scale-95"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 font-sans leading-none">
                    {isBangla ? 'হিসাব খাতা' : 'Hisab Khata'}
                  </h1>
                  {isOnline ? (
                    <span className="text-[8px] sm:text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-1 py-0.5 rounded-md uppercase leading-none flex items-center gap-1 shrink-0">
                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                      {isBangla ? 'অনলাইন' : 'Online'}
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200/50 px-1 py-0.5 rounded-md uppercase leading-none flex items-center gap-1 shrink-0">
                      <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                      {isBangla ? 'অফলাইন' : 'Offline'}
                    </span>
                  )}
                </div>
                
                {/* Real-time formatted Date & Time like screenshot (e.g. ১১:২৮ AM | বুধবার ১৫/০৭/২০২৬) */}
                <span className="text-[10px] sm:text-xs font-bold text-slate-700 tracking-tight mt-0.5 leading-none whitespace-nowrap">
                  {headerDateTimeStr}
                </span>

                {/* Shop Name row */}
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 truncate mt-0.5 max-w-[150px] sm:max-w-[250px] leading-none" id="shop-name-title">
                  {shopName || (isBangla ? 'রঞ্জু দত্ত এন্ড সন্স' : 'Ranju Dutta & Sons')}
                </span>
              </div>
            </div>
   
            {/* Header Action Tools */}
            <div className="flex items-center gap-2 shrink-0">
              
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


     
                {/* Cloud Sync Controller */}
                <button
                  type="button"
                  onClick={handleToggleSync}
                  className={`flex items-center justify-center border transition-all cursor-pointer h-8 shadow-3xs active:scale-95 shrink-0 rounded-md ${
                    isSyncActive
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  } w-8 sm:w-auto sm:px-2.5 sm:gap-1.5`}
                  id="cloud-sync-toggle"
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
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="space-y-4"
          >
            
            {/* STATS CARDS GRID - INSIDE HOME TAB */}
            <div className="max-w-xl mx-auto w-full px-1 sm:px-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <span>📊</span>
                  <span>{isBangla ? 'আজকের হিসাব বিবরণী' : "Today's Account Summary"}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !isBalancesHidden;
                    setIsBalancesHidden(nextVal);
                    localStorage.setItem('hisab_khata_balances_hidden', String(nextVal));
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-black rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-3xs cursor-pointer active:scale-95 transition-all shrink-0"
                  id="stats-eye-toggle-master"
                >
                  {isBalancesHidden ? (
                    <>
                      <Eye className="h-3 w-3 text-emerald-600 animate-pulse" />
                      <span>{isBangla ? 'টাকা দেখান' : 'Show Money'}</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3 w-3 text-slate-400" />
                      <span>{isBangla ? 'টাকা লুকান' : 'Hide Money'}</span>
                    </>
                  )}
                </button>
              </div>

              <section className="grid grid-cols-2 gap-2" id="stats-dashboard-grid">
                
                <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-3xs relative overflow-hidden">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block leading-tight">
                    {isBangla ? 'মোট বিক্রি' : 'Total Sales'}
                  </span>
                  <span className="text-[18px] sm:text-xl font-black text-emerald-600 block mt-0.5 leading-tight">
                    {isBalancesHidden ? '৳ ••••' : formatCurrency(todaySales, isBangla)}
                  </span>
                </div>

                <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-3xs relative overflow-hidden">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block leading-tight">
                    {isBangla ? 'নগদ জমা' : 'Cash Deposit'}
                  </span>
                  <span className="text-[18px] sm:text-xl font-black text-blue-600 block mt-0.5 leading-tight">
                    {isBalancesHidden ? '৳ ••••' : formatCurrency(todayCashDeposit, isBangla)}
                  </span>
                </div>

                <div 
                  onClick={() => setIsDueListModalOpen(true)}
                  className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-3xs cursor-pointer hover:bg-slate-50/50 transition-colors relative overflow-hidden"
                >
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block leading-tight">
                    {isBangla ? 'আজকের বাকি' : "Today's Due"}
                  </span>
                  <span className="text-[18px] sm:text-xl font-black text-amber-600 block mt-0.5 leading-tight">
                    {isBalancesHidden ? '৳ ••••' : formatCurrency(todayDueTaken, isBangla)}
                  </span>
                </div>

                <div className="bg-white py-2 px-3 rounded-xl border border-slate-200 shadow-3xs relative overflow-hidden">
                  <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block leading-tight">
                    {isBangla ? 'আজকের খরচ' : "Today's Expense"}
                  </span>
                  <span className="text-[18px] sm:text-xl font-black text-rose-600 block mt-0.5 leading-tight">
                    {isBalancesHidden ? '৳ ••••' : formatCurrency(todayExpenseTotal, isBangla)}
                  </span>
                </div>

              </section>
            </div>
            
            {/* CENTERED & COMPACT SINGLE-COLUMN WORKSPACE */}
            <div className="max-w-xl mx-auto w-full space-y-4">
              
              {/* 1. Add Transaction Form Card */}
              <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-xs">
                <div className="grid grid-cols-3 gap-1.5 mb-4 pb-3 border-b border-slate-100 w-full">
                  <button
                    type="button"
                    onClick={() => setIsOutOfStockModalOpen(true)}
                    className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] sm:text-xs font-black rounded-lg border border-amber-200/50 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs active:scale-95"
                    id="oos-trigger-btn"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{isBangla ? 'মাল নেই' : 'No Goods'}</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setIsProductRateModalOpen(true)}
                    className="w-full py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10px] sm:text-xs font-black rounded-lg border border-sky-200/50 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs active:scale-95"
                    id="rates-trigger-btn"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                    <span className="truncate">{isBangla ? 'মালের রেট' : 'Rates'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] sm:text-xs font-black rounded-lg border border-rose-200/40 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs active:scale-95"
                    id="small-expense-btn"
                  >
                    <PlusCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                    <span className="truncate">{isBangla ? 'খরচ যোগ' : 'Add Expense'}</span>
                  </button>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-3.5">
                  
                  {/* Inputs Grid */}
                  <div className="grid grid-cols-12 gap-3">
                    {/* Product Name */}
                    <div className="col-span-7 relative">
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
                        onFocus={() => setShowProductSuggestions(true)}
                        onBlur={() => setShowProductSuggestions(false)}
                        className="w-full text-base px-3 py-2.5 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-teal-50/20 transition-all font-semibold text-slate-900 h-12"
                        id="product-input"
                      />
                      {showProductSuggestions && filteredProductSuggestions.length > 0 && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border-2 border-slate-100 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                          {filteredProductSuggestions.map((item, index) => (
                            <div
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectProductSuggestion(item.name);
                              }}
                              className="px-3.5 py-2.5 hover:bg-teal-50/50 cursor-pointer border-b border-slate-50 last:border-b-0 flex items-center justify-between transition-all"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                              </div>
                              <span className="text-xs text-teal-600 font-black">
                                {isBangla ? 'বসান' : 'Apply'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
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
                        onChange={(e) => {
                          let val = e.target.value;
                          if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                            val = val.replace(/^0+/, '');
                          }
                          setAmount(val);
                        }}
                        className="w-full text-base px-3 py-2.5 rounded-xl border-2 border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 bg-teal-50/20 transition-all font-sans font-black text-slate-900 h-12"
                        id="amount-input"
                      />
                    </div>
                  </div>

                  {/* Payment Type Selection (Mini capsule toggle) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-50">
                    <div className="flex items-center justify-between sm:justify-start gap-3 flex-wrap w-full sm:w-auto">
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

                      {/* Memo/Receipt Shortcut Button - shifted slightly to the right with beautiful soft click design */}
                      <button
                        type="button"
                        onClick={handleOpenMemoWithData}
                        className="ml-auto sm:ml-4 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] sm:text-xs font-black rounded-lg border border-teal-200/50 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs active:scale-95"
                        id="dashboard-open-memo-btn"
                      >
                        <span className="text-xs">📝</span>
                        <span>{isBangla ? 'মেমো তৈরি করুন' : 'Create Memo'}</span>
                      </button>
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
                <Suspense fallback={
                  <div className="flex justify-center items-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500"></div>
                  </div>
                }>
                  <TransactionList
                    transactions={todayTransactions}
                    isBangla={isBangla}
                    onDelete={handleDeleteTransaction}
                    onUpdate={handleUpdateTransaction}
                  />
                </Suspense>

              </div>
          </motion.div>
        )}

        {/* --- INFO / "তথ্য" TAB VIEW --- */}
        {currentNavTab === 'info' && (
          <motion.div
            key="info"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="max-w-4xl mx-auto w-full px-4 py-4 space-y-5"
          >
            {/* Page Header Info */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                  <Info className="h-5 w-5 text-teal-600" />
                  <span>{isBangla ? 'প্রয়োজনীয় খতিয়ান ও সার্ভিস' : 'Ledger Services & Lists'}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {isBangla 
                    ? 'দোকানের ঘাটতি পণ্য (মাল নেই), পণ্যের রেট তালিকা, গ্রাহকের বকেয়া খাতা এবং খরচের বিবরণী।' 
                    : 'List of out of stock goods, product rates, customer outstanding dues, and store expenses.'}
                </p>
              </div>
            </div>

            {/* Custom Quad Sub-Tabs Selector Bar */}
            <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 grid grid-cols-2 md:grid-cols-4 gap-1.5 shadow-2xs max-w-4xl mx-auto w-full">
              <button
                type="button"
                onClick={() => {
                  setActiveInfoTab('oos');
                  setShowAllOos(false);
                }}
                className={`py-3 px-2 text-xs font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeInfoTab === 'oos'
                    ? 'bg-white text-amber-850 shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="truncate">{isBangla ? 'শর্ট/নেই মাল' : 'Short/No Goods'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveInfoTab('rates');
                  setShowAllRates(false);
                }}
                className={`py-3 px-2 text-xs font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeInfoTab === 'rates'
                    ? 'bg-white text-sky-850 shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Coins className="h-4 w-4 text-sky-600 shrink-0" />
                <span className="truncate">{isBangla ? 'পণ্যের রেট' : 'Product Rates'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveInfoTab('dues');
                }}
                className={`py-3 px-2 text-xs font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeInfoTab === 'dues'
                    ? 'bg-white text-rose-850 shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <User className="h-4 w-4 text-rose-600 shrink-0" />
                <span className="truncate">{isBangla ? 'বাকির লিস্ট' : 'Due List'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveInfoTab('expenses');
                }}
                className={`py-3 px-2 text-xs font-black rounded-xl transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeInfoTab === 'expenses'
                    ? 'bg-white text-emerald-850 shadow-sm border border-slate-200/40'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Wallet className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">{isBangla ? 'খরচের লিস্ট' : 'Expense List'}</span>
              </button>
            </div>

            {/* Content Card Panel */}
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-5 shadow-xs flex flex-col min-h-[460px]">
              
              {/* Header inside Card (Title + Add Button) */}
              {activeInfoTab === 'oos' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 bg-amber-50 rounded-lg text-amber-700 shrink-0">
                      <AlertCircle className="h-4 w-4" />
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">
                      {isBangla ? 'শর্ট/নেই মাল এর তালিকা' : 'Short/Out of Stock'}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold bg-amber-100 text-amber-850 px-2.5 py-1 rounded-full font-sans">
                        {isBangla ? toBanglaNumber(outOfStockItems.length) : outOfStockItems.length}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold sm:hidden">
                        {isBangla ? 'টি পণ্য' : 'items'}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsOutOfStockModalOpen(true)}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white text-[11px] sm:text-xs font-black rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>{isBangla ? 'যোগ করুন' : 'Add New'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeInfoTab === 'rates' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 bg-sky-50 rounded-lg text-sky-700 shrink-0">
                      <Coins className="h-4 w-4" />
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">
                      {isBangla ? 'পণ্যের রেট ও কেনা দাম' : 'Product Wholesale Rates'}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold bg-sky-100 text-sky-850 px-2.5 py-1 rounded-full font-sans">
                        {isBangla ? toBanglaNumber(productRates.length) : productRates.length}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold sm:hidden">
                        {isBangla ? 'টি পণ্য' : 'items'}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsProductRateModalOpen(true)}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-sky-700 to-sky-800 hover:from-sky-800 hover:to-sky-900 text-white text-[11px] sm:text-xs font-black rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>{isBangla ? 'যোগ করুন' : 'Add New'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeInfoTab === 'dues' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 bg-rose-50 rounded-lg text-rose-700 shrink-0">
                      <User className="h-4 w-4" />
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">
                      {isBangla ? 'গ্রাহকদের বাকির তালিকা' : 'Customer Due List'}
                    </h3>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5 bg-rose-50/60 px-2.5 py-1 rounded-full border border-rose-100/50">
                      <span className="text-xs font-black text-rose-800 font-sans">
                        {isBangla ? toBanglaNumber(customerDues.length) : customerDues.length}
                      </span>
                      <span className="text-[10px] text-rose-700/80 font-bold">
                        {isBangla ? 'জন ক্রেতা' : 'customers'}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsAddDueModalOpen(true)}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-800 hover:to-rose-900 text-white text-[11px] sm:text-xs font-black rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>{isBangla ? 'যোগ করুন' : 'Add New'}</span>
                    </button>
                  </div>
                </div>
              )}

              {activeInfoTab === 'expenses' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="p-1.5 bg-emerald-50 rounded-lg text-emerald-700 shrink-0">
                      <Wallet className="h-4 w-4" />
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base truncate">
                      {isBangla ? 'খরচের তালিকা ও খতিয়ান' : 'Expense Ledger List'}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold bg-emerald-100 text-emerald-850 px-2.5 py-1 rounded-full font-sans">
                        {isBangla ? toBanglaNumber(todayExpenses.length) : todayExpenses.length}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {isBangla ? 'টি খতিয়ান' : 'entries'}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsExpenseModalOpen(true)}
                      className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-emerald-700 to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white text-[11px] sm:text-xs font-black rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>{isBangla ? 'খরচ যোগ' : 'Add Expense'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Tab Specific Content */}
              {activeInfoTab === 'oos' && (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Local Search for Out Of Stock */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder={isBangla ? 'মালের নাম দিয়ে খুঁজুন...' : 'Search goods...'}
                      value={oosSearch}
                      onChange={(e) => {
                        setOosSearch(e.target.value);
                        setOosPage(1);
                        setShowAllOos(false);
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
                    />
                  </div>

                  {/* List Container without lagging layout animation */}
                  <div className="flex-1 space-y-2 flex flex-col justify-between">
                    {(() => {
                      const filteredOos = outOfStockItems
                        .filter(item => item.name.toLowerCase().includes(oosSearch.toLowerCase()))
                        .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
                      
                      const itemsToShow = showAllOos ? filteredOos : filteredOos.slice(0, 6);

                      if (filteredOos.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center text-center py-16 flex-1 text-slate-400">
                            <AlertCircle className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-xs font-semibold">
                              {isBangla ? 'কোনো তথ্য খুঁজে পাওয়া যায়নি!' : 'No out of stock items found!'}
                            </p>
                            <button
                              onClick={() => setIsOutOfStockModalOpen(true)}
                              className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-bold underline cursor-pointer"
                            >
                              {isBangla ? 'নতুন যোগ করুন' : 'Add new item'}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {itemsToShow.map((item) => {
                              const isEditing = editingOosId === item.id;
                              return (
                                <div 
                                  key={item.id} 
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                                    isEditing 
                                      ? 'bg-amber-50 border-amber-300 shadow-3xs' 
                                      : 'bg-amber-50/40 border-amber-100 hover:bg-amber-50/80 hover:border-amber-200'
                                  }`}
                                >
                                  {isEditing ? (
                                    <div className="flex-1 flex flex-col gap-2">
                                      <input
                                        type="text"
                                        value={editOosName}
                                        onChange={(e) => setEditOosName(e.target.value)}
                                        className="w-full text-xs p-1.5 rounded-lg border border-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-bold text-slate-800"
                                        autoFocus
                                      />
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setEditingOosId(null)}
                                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                                        >
                                          <X className="h-3 w-3" />
                                          <span>{isBangla ? 'বাতিল' : 'Cancel'}</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (editOosName.trim()) {
                                              handleUpdateOutOfStock(item.id, editOosName);
                                              setEditingOosId(null);
                                            }
                                          }}
                                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                                        >
                                          <Check className="h-3 w-3" />
                                          <span>{isBangla ? 'সেভ' : 'Save'}</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="min-w-0 flex-1 pr-2">
                                        <h4 className="text-xs font-extrabold text-slate-800 break-words whitespace-normal leading-snug">{item.name}</h4>
                                        <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                                          {isBangla ? 'যুক্ত করা হয়েছে: ' : 'Added: '} 
                                          {formatDate(item.dateAdded, isBangla)}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          onClick={() => {
                                            setEditingOosId(item.id);
                                            setEditOosName(item.name);
                                            setDeletingOosId(null);
                                          }}
                                          className="p-1.5 hover:bg-amber-100 text-slate-400 hover:text-amber-600 rounded-lg transition-colors cursor-pointer"
                                          title={isBangla ? 'নাম পরিবর্তন' : 'Edit'}
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingOosId(null);
                                            setConfirmModal({
                                              isOpen: true,
                                              title: isBangla ? 'ঘাটতি পণ্য মুছুন' : 'Delete Shortage Item',
                                              message: isBangla 
                                                ? `আপনি কি নিশ্চিতভাবে "${item.name}" তালিকা থেকে মুছে ফেলতে চান?` 
                                                : `Are you sure you want to delete "${item.name}" from the shortage list?`,
                                              onConfirm: () => handleDeleteOutOfStock(item.id)
                                            });
                                          }}
                                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                                          title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* See More Button */}
                          {filteredOos.length > 6 && (
                            <div className="flex justify-center pt-4 border-t border-slate-100 mt-4">
                              <button
                                onClick={() => setShowAllOos(!showAllOos)}
                                className="px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100/60 rounded-xl border border-amber-200/50 flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs active:scale-95"
                              >
                                <span>
                                  {showAllOos 
                                    ? (isBangla ? 'কম দেখুন' : 'Show Less') 
                                    : (isBangla ? 'আরও দেখুন' : 'See More')}
                                </span>
                                {showAllOos ? (
                                  <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeInfoTab === 'rates' && (
                <div className="flex-1 flex flex-col justify-between">
                  {/* Local Search for Product Rates */}
                  <div className="mb-4">
                    <input
                      type="text"
                      placeholder={isBangla ? 'মালের নাম দিয়ে খুঁজুন...' : 'Search product...'}
                      value={rateSearch}
                      onChange={(e) => {
                        setRateSearch(e.target.value);
                        setRatePage(1);
                        setShowAllRates(false);
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
                    />
                  </div>

                  {/* List Container without lagging layout animation */}
                  <div className="flex-1 space-y-2 flex flex-col justify-between">
                    {(() => {
                      const filteredRates = productRates
                        .filter(item => 
                          item.name.toLowerCase().includes(rateSearch.toLowerCase()) ||
                          (item.keywords && item.keywords.toLowerCase().includes(rateSearch.toLowerCase()))
                        )
                        .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
                      
                      const itemsToShow = showAllRates ? filteredRates : filteredRates.slice(0, 6);

                      if (filteredRates.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center text-center py-16 flex-1 text-slate-400">
                            <Coins className="h-10 w-10 text-slate-300 mb-2" />
                            <p className="text-xs font-semibold">
                              {isBangla ? 'কোনো তথ্য খুঁজে পাওয়া যায়নি!' : 'No product rates found!'}
                            </p>
                            <button
                              onClick={() => setIsProductRateModalOpen(true)}
                              className="mt-3 text-xs text-sky-600 hover:text-sky-700 font-bold underline cursor-pointer"
                            >
                              {isBangla ? 'নতুন যোগ করুন' : 'Add new rate'}
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="flex-1 flex flex-col justify-between">
                          <div className="space-y-2.5">
                            {itemsToShow.map((item) => {
                              const isEditing = editingRateId === item.id;
                              return (
                                <div 
                                  key={item.id} 
                                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                                    isEditing 
                                      ? 'bg-sky-50 border-sky-300 shadow-3xs' 
                                      : 'bg-sky-50/40 border-sky-100 hover:bg-sky-50/80 hover:border-sky-200'
                                  }`}
                                >
                                  {isEditing ? (
                                    <div className="flex-1 flex flex-col gap-2">
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-[9px] font-black text-slate-500 mb-0.5">
                                            {isBangla ? 'মালের নাম' : 'Product Name'}
                                          </label>
                                          <input
                                            type="text"
                                            value={editRateName}
                                            onChange={(e) => setEditRateName(e.target.value)}
                                            className="w-full text-xs p-1.5 rounded-lg border border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-bold text-slate-800"
                                            autoFocus
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[9px] font-black text-slate-500 mb-0.5">
                                            {isBangla ? 'কেনা দাম (৳)' : 'Price (৳)'}
                                          </label>
                                          <input
                                            type="number"
                                            value={editRatePrice}
                                            onChange={(e) => {
                                              let val = e.target.value;
                                              if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                                                val = val.replace(/^0+/, '');
                                              }
                                              setEditRatePrice(val);
                                            }}
                                            className="w-full text-xs p-1.5 rounded-lg border border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-bold text-slate-800"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-[9px] font-black text-slate-500 mb-0.5">
                                          {isBangla ? 'কীওয়ার্ড / ট্যাগ (কমা দিয়ে আলাদা করুন)' : 'Keywords / Tags (comma separated)'}
                                        </label>
                                        <input
                                          type="text"
                                          value={editRateKeywords}
                                          onChange={(e) => setEditRateKeywords(e.target.value)}
                                          placeholder={isBangla ? 'যেমন: আলু, লাল আলু, potato' : 'e.g. potato, red potato'}
                                          className="w-full text-xs p-1.5 rounded-lg border border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white font-medium text-slate-800"
                                        />
                                      </div>
                                      <div className="flex items-center gap-1.5 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => setEditingRateId(null)}
                                          className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                                        >
                                          <X className="h-3 w-3" />
                                          <span>{isBangla ? 'বাতিল' : 'Cancel'}</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const priceNum = parseFloat(editRatePrice);
                                            if (editRateName.trim() && !isNaN(priceNum) && priceNum >= 0) {
                                              handleUpdateProductRate(item.id, editRateName, priceNum, editRateKeywords);
                                              setEditingRateId(null);
                                            }
                                          }}
                                          className="px-2 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                                        >
                                          <Check className="h-3 w-3" />
                                          <span>{isBangla ? 'সেভ' : 'Save'}</span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="min-w-0 flex-1 pr-2">
                                        <h4 
                                          onClick={() => {
                                            setActiveProfitCalcProduct(item);
                                            setProfitInput('');
                                          }}
                                          className="text-xs font-extrabold text-slate-800 break-words whitespace-normal leading-snug cursor-pointer hover:text-sky-600 transition-colors"
                                          title={isBangla ? 'লাভ হিসাব করতে ক্লিক করুন' : 'Click to calculate profit'}
                                        >
                                          {item.name}
                                        </h4>
                                        <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                                          {isBangla ? 'যুক্ত করা হয়েছে: ' : 'Added: '} 
                                          {formatDate(item.dateAdded, isBangla)}
                                        </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="text-xs font-black text-sky-700 font-sans bg-sky-100/60 px-2 py-1 rounded-lg">
                                          {formatCurrency(item.buyingPrice, isBangla)}
                                        </span>
                                        
                                        <motion.button
                                          whileHover={{ scale: 1.15, rotate: 6, backgroundColor: 'rgba(14, 165, 233, 0.12)' }}
                                          whileTap={{ scale: 0.9 }}
                                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                          onClick={() => {
                                            setEditingRateId(item.id);
                                            setEditRateName(item.name);
                                            setEditRatePrice(String(item.buyingPrice));
                                            setEditRateKeywords(item.keywords || '');
                                          }}
                                          className="p-1.5 text-slate-400 hover:text-sky-600 rounded-lg cursor-pointer flex items-center justify-center transition-colors"
                                          title={isBangla ? 'পরিবর্তন করুন' : 'Edit'}
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </motion.button>
                                        
                                        <button
                                          onClick={() => {
                                            setEditingRateId(null);
                                            setConfirmModal({
                                              isOpen: true,
                                              title: isBangla ? 'মালের রেট মুছুন' : 'Delete Product Rate',
                                              message: isBangla 
                                                ? `আপনি কি নিশ্চিতভাবে "${item.name}"-এর রেট মুছে ফেলতে চান?` 
                                                : `Are you sure you want to delete the rate for "${item.name}"?`,
                                              onConfirm: () => handleDeleteProductRate(item.id)
                                            });
                                          }}
                                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                                          title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* See More Button */}
                          {filteredRates.length > 6 && (
                            <div className="flex justify-center pt-4 border-t border-slate-100 mt-4">
                              <button
                                onClick={() => setShowAllRates(!showAllRates)}
                                className="px-4 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100/60 rounded-xl border border-sky-200/50 flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs active:scale-95"
                              >
                                <span>
                                  {showAllRates 
                                    ? (isBangla ? 'কম দেখুন' : 'Show Less') 
                                    : (isBangla ? 'আরও দেখুন' : 'See More')}
                                </span>
                                {showAllRates ? (
                                  <ChevronLeft className="h-3.5 w-3.5 rotate-90" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 rotate-90" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {activeInfoTab === 'dues' && (
                <div className="flex-1 flex flex-col justify-between">
                  <Suspense fallback={
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  }>
                    <DueList
                      dueList={customerDues}
                      isBangla={isBangla}
                      onDeposit={handleDueDeposit}
                      onDelete={handleDeleteCustomerDues}
                      onRename={handleRenameCustomerDues}
                      onViewDetail={setSelectedCustomerForDetail}
                      transactions={transactions}
                      onDeleteTransaction={handleDeleteTransaction}
                    />
                  </Suspense>
                </div>
              )}

              {activeInfoTab === 'expenses' && (
                <div className="flex-1 flex flex-col justify-between">
                  <Suspense fallback={
                    <div className="flex justify-center items-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                    </div>
                  }>
                    <ExpenseList
                      expenses={todayExpenses}
                      isBangla={isBangla}
                      onDelete={handleDeleteExpense}
                      onUpdate={handleUpdateExpense}
                      todayExpenseTotal={todayExpenseTotal}
                    />
                  </Suspense>
                </div>
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
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className="max-w-4xl mx-auto w-full px-4 py-4 space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'চলতি মাসের বিক্রি' : "This Month's Sales"}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-emerald-600 block mt-1">
                  {isBalancesHidden ? '৳ ••••' : formatCurrency(monthlyStats.sales, isBangla)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'চলতি মাসের নগদ জমা' : "This Month's Cash"}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-blue-600 block mt-1">
                  {isBalancesHidden ? '৳ ••••' : formatCurrency(monthlyStats.cash, isBangla)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'চলতি মাসের বাকি' : "This Month's Due"}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-amber-600 block mt-1">
                  {isBalancesHidden ? '৳ ••••' : formatCurrency(monthlyStats.due, isBangla)}
                </span>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                  {isBangla ? 'চলতি মাসের খরচ' : "This Month's Expenses"}
                </span>
                <span className="text-[17px] sm:text-lg font-black text-rose-600 block mt-1">
                  {isBalancesHidden ? '৳ ••••' : formatCurrency(monthlyStats.expense, isBangla)}
                </span>
              </div>
            </div>

            {/* --- সাপ্তাহিক রিপোর্ট সামারি (Weekly Report Summary) --- */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-300 space-y-3">
              {/* Header section styled elegantly and modern with dynamic titles and visual capsule selector */}
              <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-1.5 h-4 bg-indigo-600 rounded-full shrink-0"></div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-slate-800 tracking-tight leading-normal pt-1 pb-0.5 truncate">
                      {isBangla 
                        ? (weeklyPeriod === '7D' ? 'সাপ্তাহিক সামারি' : weeklyPeriod === '1D' ? 'আজকের সামারি' : '৩০ দিনের সামারি') 
                        : (weeklyPeriod === '7D' ? 'Weekly Summary' : weeklyPeriod === '1D' ? "Today's Summary" : '30 Days Summary')}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 font-extrabold mt-0.5 font-mono truncate">
                      {(() => {
                        try {
                          const start = new Date(weeklyReport.startDate);
                          const end = new Date();
                          const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
                          const startStr = start.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', options);
                          const endStr = end.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { ...options, year: 'numeric' });
                          if (weeklyPeriod === '1D') {
                            return end.toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                          }
                          return `${startStr} - ${endStr}`;
                        } catch (e) {
                          return isBangla 
                            ? (weeklyPeriod === '7D' ? 'গত ৭ দিন' : weeklyPeriod === '1D' ? 'আজ' : 'গত ৩০ দিন') 
                            : (weeklyPeriod === '7D' ? 'Last 7 Days' : weeklyPeriod === '1D' ? 'Today' : 'Last 30 Days');
                        }
                      })()}
                    </p>
                  </div>
                </div>

                {/* 7D, 1D, 30D Segmented Capsule Switcher matching the exact visual spec of the screenshot but with smaller size and Indigo theme colors */}
                <div id="period-switcher-container" className="flex items-center bg-indigo-600 p-0.5 rounded-full border border-indigo-500 shadow-xs relative select-none shrink-0">
                  {(['7D', '1D', '30D'] as const).map((period) => {
                    const isActive = weeklyPeriod === period;
                    return (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setWeeklyPeriod(period)}
                        className="relative px-2.5 py-0.5 text-[10px] font-black transition-all duration-300 rounded-full cursor-pointer focus:outline-hidden"
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activePeriodPill"
                            className="absolute inset-0 bg-white rounded-full shadow-xs"
                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 ${isActive ? 'text-indigo-600' : 'text-indigo-100/70 hover:text-white'}`}>
                          {period}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid of 6 clickable cards like the user's image, extremely compact & centered */}
              <div className="grid grid-cols-2 gap-3">
                {/* 1. Total Sales */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('sales')}
                  className="bg-gradient-to-br from-indigo-50/80 to-white py-1.5 px-2 text-center rounded-xl border border-indigo-200 hover:border-indigo-400 hover:from-indigo-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-indigo-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'মোট বিক্রি' : 'Total Sales'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-indigo-600 block mt-0.5 font-sans truncate max-w-full">
                    {formatCurrency(weeklyReport.totalSales, isBangla)}
                  </span>
                </button>

                {/* 2. Total Expense */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('expense')}
                  className="bg-gradient-to-br from-rose-50/80 to-white py-1.5 px-2 text-center rounded-xl border border-rose-200 hover:border-rose-400 hover:from-rose-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-rose-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'মোট খরচ' : 'Total Expense'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-rose-600 block mt-0.5 font-sans truncate max-w-full">
                    {formatCurrency(weeklyReport.totalExpense, isBangla)}
                  </span>
                </button>

                {/* 3. Net Balance */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('net')}
                  className="bg-gradient-to-br from-emerald-50/80 to-white py-1.5 px-2 text-center rounded-xl border border-emerald-200 hover:border-emerald-400 hover:from-emerald-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-emerald-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'নিট ব্যালেন্স' : 'Net Balance'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-emerald-600 block mt-0.5 font-sans truncate max-w-full">
                    {formatCurrency(weeklyReport.totalSales - weeklyReport.totalExpense, isBangla)}
                  </span>
                </button>

                {/* 4. Most Sold Product */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('most_sold')}
                  className="bg-gradient-to-br from-sky-50/80 to-white py-1.5 px-2 text-center rounded-xl border border-sky-200 hover:border-sky-400 hover:from-sky-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-sky-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'বেশি বিক্রি' : 'Most Sold'}
                  </span>
                  <span className="text-[10px] font-black text-slate-700 block mt-0.5 truncate max-w-full">
                    {weeklyReport.mostSoldProducts.length > 0 ? weeklyReport.mostSoldProducts[0].name : (isBangla ? 'নেই' : 'None')}
                  </span>
                </button>

                {/* 5. Least Sold Product */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('least_sold')}
                  className="bg-gradient-to-br from-amber-50/80 to-white py-1.5 px-2 text-center rounded-xl border border-amber-200 hover:border-amber-400 hover:from-amber-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-amber-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'কম বিক্রি' : 'Least Sold'}
                  </span>
                  <span className="text-[10px] font-black text-slate-700 block mt-0.5 truncate max-w-full">
                    {weeklyReport.leastSoldProducts.length > 0 ? weeklyReport.leastSoldProducts[0].name : (isBangla ? 'নেই' : 'None')}
                  </span>
                </button>

                {/* 6. Most Expensive Product */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('expensive')}
                  className="bg-gradient-to-br from-purple-50/80 to-white py-1.5 px-2 text-center rounded-xl border border-purple-200 hover:border-purple-400 hover:from-purple-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-purple-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'দামী বিক্রি' : 'Most Expensive'}
                  </span>
                  <span className="text-[10px] font-black text-slate-700 block mt-0.5 truncate max-w-full">
                    {weeklyReport.mostExpensiveProduct && weeklyReport.mostExpensiveProduct.name ? weeklyReport.mostExpensiveProduct.name : (isBangla ? 'নেই' : 'None')}
                  </span>
                </button>

                {/* 7. Due (বাকি) */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('due')}
                  className="bg-gradient-to-br from-orange-50/80 to-white py-1.5 px-2 text-center rounded-xl border border-orange-200 hover:border-orange-400 hover:from-orange-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-orange-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'বাকি' : 'Due Sales'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-orange-600 block mt-0.5 font-sans truncate max-w-full">
                    {formatCurrency(weeklyReport.totalDueSales, isBangla)}
                  </span>
                </button>

                {/* 8. Others (অন্যান্য) */}
                <button
                  type="button"
                  onClick={() => setWeeklyDetailModal('others')}
                  className="bg-gradient-to-br from-slate-100/70 to-white py-1.5 px-2 text-center rounded-xl border border-slate-200 hover:border-slate-400 hover:from-slate-50 hover:shadow-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[44px] w-full shadow-xs"
                >
                  <span className="text-[9px] font-black text-slate-700/90 uppercase tracking-wider block truncate max-w-full">
                    {isBangla ? 'অন্যান্য' : 'Others'}
                  </span>
                  <span className="text-[11px] sm:text-xs font-black text-slate-600 block mt-0.5 font-sans truncate max-w-full">
                    {formatCurrency(weeklyReport.totalDueDeposits, isBangla)}
                  </span>
                </button>
              </div>
            </div>

            {/* Weekly Detail Popup Modal */}
            <AnimatePresence>
              {weeklyDetailModal && (
                <div 
                  id="weekly-detail-modal"
                  className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setWeeklyDetailModal(null)}
                    className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
                  />

                  {/* Dialog content */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] z-10"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                      <div>
                        <h4 className="font-black text-slate-800 text-sm">
                          {(() => {
                            if (weeklyDetailModal === 'sales') return isBangla ? 'মোট বিক্রির হিসাব বিবরণী' : 'Total Sales Statement';
                            if (weeklyDetailModal === 'expense') return isBangla ? 'মোট খরচের হিসাব বিবরণী' : 'Total Expense Statement';
                            if (weeklyDetailModal === 'net') return isBangla ? 'নিট লাভ ও ক্যাশ ফ্লো বিবরণী' : 'Net Flow & Profit Statement';
                            if (weeklyDetailModal === 'most_sold') return isBangla ? 'সেরা বিক্রিত ১০টি পণ্য' : 'Top 10 Most Sold Products';
                            if (weeklyDetailModal === 'least_sold') return isBangla ? 'কম বিক্রিত ১০টি পণ্য' : 'Top 10 Least Sold Products';
                            if (weeklyDetailModal === 'expensive') return isBangla ? 'সর্বোচ্চ দামী ১০টি বিক্রয়' : 'Top 10 Most Expensive Sales';
                            if (weeklyDetailModal === 'due') return isBangla ? 'বাকি বিক্রির হিসাব বিবরণী' : 'Due Sales Statement';
                            if (weeklyDetailModal === 'others') return isBangla ? 'অন্যান্য লেনদেন বিবরণী (বাকি জমা)' : 'Other Transactions Statement (Due Deposits)';
                            return '';
                          })()}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-extrabold mt-0.5">
                          {isBangla 
                            ? (weeklyPeriod === '7D' ? 'বিগত ৭ দিনের বিশ্লেষণ' : weeklyPeriod === '1D' ? 'আজকের দিনের বিশ্লেষণ' : 'বিগত ৩০ দিনের বিশ্লেষণ') 
                            : (weeklyPeriod === '7D' ? '7 Days Analysis' : weeklyPeriod === '1D' ? "Today's Analysis" : '30 Days Analysis')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWeeklyDetailModal(null)}
                        className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="p-4 overflow-y-auto space-y-4">
                      {/* SALES */}
                      {weeklyDetailModal === 'sales' && (
                        <div className="space-y-4">
                          {/* Cash vs Due Bar */}
                          <div className="space-y-2 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/50">
                            <div className="flex justify-between items-center text-[11px] font-black">
                              <span className="text-emerald-700 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                {isBangla ? 'নগদ বিক্রি:' : 'Cash Sales:'} {formatCurrency(weeklyReport.totalCashSales, isBangla)}
                              </span>
                              <span className="text-rose-700 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                {isBangla ? 'বাকি বিক্রি:' : 'Due Sales:'} {formatCurrency(weeklyReport.totalDueSales, isBangla)}
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                              <div 
                                style={{ width: `${weeklyReport.totalSales > 0 ? (weeklyReport.totalCashSales / weeklyReport.totalSales) * 100 : 50}%` }}
                                className="h-full bg-emerald-500 rounded-l-full"
                              />
                              <div 
                                style={{ width: `${weeklyReport.totalSales > 0 ? (weeklyReport.totalDueSales / weeklyReport.totalSales) * 100 : 50}%` }}
                                className="h-full bg-rose-500 rounded-r-full"
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold flex justify-between pt-0.5">
                              <span>{isBangla ? 'মোট:' : 'Total:'} {formatCurrency(weeklyReport.totalSales, isBangla)}</span>
                              <span className="font-mono">
                                {weeklyReport.totalSales > 0 ? Math.round((weeklyReport.totalCashSales / weeklyReport.totalSales) * 100) : 0}% {isBangla ? 'নগদ' : 'Cash'}
                              </span>
                            </div>
                          </div>

                          {/* List of recent txs */}
                          <div className="space-y-2">
                            <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                              {isBangla 
                                ? (weeklyPeriod === '7D' ? 'সাপ্তাহিক বিক্রয় তালিকা:' : weeklyPeriod === '1D' ? 'আজকের বিক্রয় তালিকা:' : '৩০ দিনের বিক্রয় তালিকা:') 
                                : (weeklyPeriod === '7D' ? 'Weekly Sales Transactions:' : weeklyPeriod === '1D' ? "Today's Sales Transactions:" : '30 Days Sales Transactions:')}
                            </h5>
                            {(() => {
                              const getDaysAgoDate = (days: number) => {
                                const d = new Date();
                                d.setDate(d.getDate() - days);
                                const yyyy = d.getFullYear();
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                return `${yyyy}-${mm}-${dd}`;
                              };
                              let daysToSubtract = 6;
                              if (weeklyPeriod === '30D') daysToSubtract = 29;
                              if (weeklyPeriod === '1D') daysToSubtract = 0;
                              const periodStartDateStr = getDaysAgoDate(daysToSubtract);
                              const weeklyTxs = transactions.filter(tx => tx.date >= periodStartDateStr);
                              
                              if (weeklyTxs.length === 0) {
                                return (
                                  <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                    {isBangla 
                                      ? (weeklyPeriod === '7D' ? 'গত ৭ দিনে কোনো বিক্রি পাওয়া যায়নি।' : weeklyPeriod === '1D' ? 'আজ কোনো বিক্রি পাওয়া যায়নি।' : 'গত ৩০ দিনে কোনো বিক্রি পাওয়া যায়নি।') 
                                      : (weeklyPeriod === '7D' ? 'No sales records found in last 7 days.' : weeklyPeriod === '1D' ? "No sales records found today." : 'No sales records found in last 30 days.')
                                    }
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-1.5 font-sans">
                                  {weeklyTxs.map((tx) => (
                                    <div key={tx.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 border border-slate-150/60 text-xs font-bold transition-all">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-slate-800 font-extrabold truncate max-w-[150px]">{tx.product}</span>
                                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide ${
                                            tx.isCash 
                                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' 
                                              : 'bg-rose-50 border border-rose-200 text-rose-700'
                                          }`}>
                                            {tx.isCash ? (isBangla ? 'নগদ' : 'Cash') : (isBangla ? 'বাকি' : 'Due')}
                                          </span>
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold font-mono block mt-0.5">
                                          {formatDate(tx.date, isBangla)} • {tx.customer || (isBangla ? 'খুচরা ক্রেতা' : 'Retail')}
                                        </span>
                                      </div>
                                      <span className="text-slate-900 font-extrabold shrink-0 text-right ml-2">{formatCurrency(tx.amount, isBangla)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {/* EXPENSE */}
                      {weeklyDetailModal === 'expense' && (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 text-xs font-bold">
                            <span className="text-slate-500">{isBangla ? 'মোট খরচের পরিমাণ:' : 'Total Expense Amount:'}</span>
                            <span className="text-rose-600 font-black text-sm">{formatCurrency(weeklyReport.totalExpense, isBangla)}</span>
                          </div>

                          <div className="space-y-2">
                            <h5 className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                              {isBangla 
                                ? (weeklyPeriod === '7D' ? 'সাপ্তাহিক খরচের তালিকা:' : weeklyPeriod === '1D' ? 'আজকের খরচের তালিকা:' : '৩০ দিনের খরচের তালিকা:') 
                                : (weeklyPeriod === '7D' ? 'Weekly Expense List:' : weeklyPeriod === '1D' ? "Today's Expense List:" : '30 Days Expense List:')}
                            </h5>
                            {weeklyReport.weeklyExs.length === 0 ? (
                              <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                                {isBangla 
                                  ? (weeklyPeriod === '7D' ? 'গত ৭ দিনে কোনো খরচ করা হয়নি।' : weeklyPeriod === '1D' ? 'আজ কোনো খরচ করা হয়নি।' : 'গত ৩০ দিনে কোনো খরচ করা হয়নি।') 
                                  : (weeklyPeriod === '7D' ? 'No expenses recorded in last 7 days.' : weeklyPeriod === '1D' ? "No expenses recorded today." : 'No expenses recorded in last 30 days.')}
                              </div>
                            ) : (
                              <div className="space-y-1.5 font-sans">
                                {weeklyReport.weeklyExs.map((ex) => (
                                  <div key={ex.id} className="flex justify-between items-center p-2 rounded-lg bg-rose-50/20 hover:bg-rose-50/50 border border-rose-100/30 text-xs font-bold transition-all">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-slate-800 font-extrabold truncate block">{ex.description}</span>
                                      <span className="text-[9px] text-slate-400 font-bold font-mono block mt-0.5">
                                        {formatDate(ex.date, isBangla)}
                                      </span>
                                    </div>
                                    <span className="text-rose-600 font-extrabold shrink-0 ml-2">-{formatCurrency(ex.amount, isBangla)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* NET BALANCE */}
                      {weeklyDetailModal === 'net' && (
                        <div className="space-y-4">
                          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150/60 space-y-3 font-sans">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500 font-bold">{isBangla ? 'মোট বেচাকেনা (+)' : 'Total Sales (+)'}</span>
                              <span className="text-emerald-600 font-black">{formatCurrency(weeklyReport.totalSales, isBangla)}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-slate-200/50 pb-2.5">
                              <span className="text-slate-500 font-bold">{isBangla ? 'মোট খরচ (-)' : 'Total Expenses (-)'}</span>
                              <span className="text-rose-600 font-black">-{formatCurrency(weeklyReport.totalExpense, isBangla)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1">
                              <span className="text-xs font-black text-slate-800">{isBangla ? 'অবশিষ্ট নিট ব্যালেন্স:' : 'Net Retained Balance:'}</span>
                              <span className={`text-sm sm:text-base font-black ${
                                weeklyReport.totalSales - weeklyReport.totalExpense >= 0 ? 'text-indigo-600' : 'text-rose-600'
                              }`}>
                                {formatCurrency(weeklyReport.totalSales - weeklyReport.totalExpense, isBangla)}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-100/50 text-xs leading-relaxed font-medium text-slate-600">
                            {weeklyReport.totalSales - weeklyReport.totalExpense >= 0 
                              ? (isBangla 
                                  ? '✨ আপনার ক্যাশ ফ্লো লাভজনক অবস্থানে রয়েছে। খরচ সীমিত রেখে আপনার মজুদ বাড়ানোর পরিকল্পনা করুন।' 
                                  : '✨ Operating under healthy margins. Consider deploying capital back into active fast-moving inventories.')
                              : (isBangla 
                                  ? (weeklyPeriod === '7D' 
                                      ? '⚠️ আপনার মোট খরচ এই সপ্তাহে মোট বিক্রয়কে ছাড়িয়ে গেছে। খরচ ও লেনদেনসমূহ পুনঃপরীক্ষা করুন।' 
                                      : weeklyPeriod === '1D'
                                        ? '⚠️ আপনার মোট খরচ আজ মোট বিক্রয়কে ছাড়িয়ে গেছে। খরচ ও লেনদেনসমূহ পুনঃপরীক্ষা করুন।'
                                        : '⚠️ আপনার মোট খরচ গত ৩০ দিনে মোট বিক্রয়কে ছাড়িয়ে গেছে। খরচ ও লেনদেনসমূহ পুনঃপরীক্ষা করুন।') 
                                  : (weeklyPeriod === '7D' 
                                      ? '⚠️ Net balance is negative for this specific timeframe. Audit current overhead expenses.' 
                                      : weeklyPeriod === '1D'
                                        ? '⚠️ Your total expenses today have exceeded your total sales. Please audit current overhead expenses.'
                                        : '⚠️ Your total expenses in the last 30 days have exceeded your total sales. Please audit current overhead expenses.'))}
                          </div>
                        </div>
                      )}

                      {/* MOST SOLD */}
                      {weeklyDetailModal === 'most_sold' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">
                            {isBangla 
                              ? (weeklyPeriod === '7D'
                                  ? 'চলতি সপ্তাহে গ্রাহকদের চাহিদার ভিত্তিতে সেরা বিক্রিত ১০টি পণ্যের তালিকা নিচে দেওয়া হলো (নগদ এন্ট্রি বাদে):'
                                  : weeklyPeriod === '1D'
                                    ? 'আজকে গ্রাহকদের চাহিদার ভিত্তিতে সেরা বিক্রিত ১০টি পণ্যের তালিকা নিচে দেওয়া হলো (নগদ এন্ট্রি বাদে):'
                                    : 'গত ৩০ দিনে গ্রাহকদের চাহিদার ভিত্তিতে সেরা বিক্রিত ১০টি পণ্যের তালিকা নিচে দেওয়া হলো (নগদ এন্ট্রি বাদে):') 
                              : (weeklyPeriod === '7D'
                                  ? 'Below are the top 10 most selling items of the week sorted by transaction count (excluding cash products):'
                                  : weeklyPeriod === '1D'
                                    ? 'Below are the top 10 most selling items of today sorted by transaction count (excluding cash products):'
                                    : 'Below are the top 10 most selling items of the last 30 days sorted by transaction count (excluding cash products):')}
                          </p>
                          {weeklyReport.mostSoldProducts.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                              {isBangla ? 'কোনো পণ্য বিক্রির হিসাব পাওয়া যায়নি।' : 'No product sales recorded yet.'}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {weeklyReport.mostSoldProducts.map((item, idx) => (
                                <div key={item.name} className="flex justify-between items-center p-3 rounded-xl bg-indigo-50/30 border border-indigo-100/30 text-xs font-bold font-sans">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-black font-mono text-[10px]">
                                      {idx + 1}
                                    </span>
                                    <span className="text-slate-800 font-extrabold truncate max-w-[180px]">{item.name}</span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-slate-900 font-black">{isBangla ? `${toBanglaNumber(item.count)} বার` : `${item.count} times`}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{isBangla ? 'মোট:' : 'Sum:'} {formatCurrency(item.totalAmount, isBangla)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* LEAST SOLD */}
                      {weeklyDetailModal === 'least_sold' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">
                            {isBangla 
                              ? (weeklyPeriod === '7D'
                                  ? 'চলতি সপ্তাহে সবচেয়ে কম বিক্রি হওয়া ১০টি পণ্যের তালিকা (যাতে সহজে সঠিক সিদ্ধান্ত নেওয়া যায়):' 
                                  : weeklyPeriod === '1D'
                                    ? 'আজকে সবচেয়ে কম বিক্রি হওয়া ১০টি পণ্যের তালিকা (যাতে সহজে সঠিক সিদ্ধান্ত নেওয়া যায়):'
                                    : 'গত ৩০ দিনে সবচেয়ে কম বিক্রি হওয়া ১০টি পণ্যের তালিকা (যাতে সহজে সঠিক সিদ্ধান্ত নেওয়া যায়):')
                              : (weeklyPeriod === '7D'
                                  ? 'Here are the top 10 least selling items of the week sorted by transaction count:'
                                  : weeklyPeriod === '1D'
                                    ? 'Here are the top 10 least selling items of today sorted by transaction count:'
                                    : 'Here are the top 10 least selling items of the last 30 days sorted by transaction count:')}
                          </p>
                          {weeklyReport.leastSoldProducts.length === 0 ? (
                            <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                              {isBangla ? 'কোনো পণ্য বিক্রির হিসাব পাওয়া যায়নি।' : 'No product sales recorded yet.'}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {weeklyReport.leastSoldProducts.map((item, idx) => (
                                <div key={item.name} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs font-bold font-sans">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 font-black font-mono text-[10px]">
                                      {idx + 1}
                                    </span>
                                    <span className="text-slate-700 font-extrabold truncate max-w-[180px]">{item.name}</span>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-slate-800 font-black">{isBangla ? `${toBanglaNumber(item.count)} বার` : `${item.count} times`}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">{isBangla ? 'মোট:' : 'Sum:'} {formatCurrency(item.totalAmount, isBangla)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* EXPENSIVE */}
                      {weeklyDetailModal === 'expensive' && (
                        <div className="space-y-3">
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">
                            {isBangla 
                              ? (weeklyPeriod === '7D'
                                  ? 'চলতি সপ্তাহে সর্বোচ্চ মূল্যের ১০টি একক বিক্রয়ের বিবরণী:' 
                                  : weeklyPeriod === '1D'
                                    ? 'আজকে সর্বোচ্চ মূল্যের ১০টি একক বিক্রয়ের বিবরণী:'
                                    : 'গত ৩০ দিনে সর্বোচ্চ মূল্যের ১০টি একক বিক্রয়ের বিবরণী:')
                              : (weeklyPeriod === '7D'
                                  ? 'Top 10 highest priced product sales recorded this week:'
                                  : weeklyPeriod === '1D'
                                    ? 'Top 10 highest priced product sales recorded today:'
                                    : 'Top 10 highest priced product sales recorded in the last 30 days:')}
                          </p>
                          {(!weeklyReport.mostExpensiveProducts || weeklyReport.mostExpensiveProducts.length === 0) ? (
                            <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                              {isBangla ? 'কোনো পণ্য বিক্রি হয়নি।' : 'No sales recorded.'}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {weeklyReport.mostExpensiveProducts.map((item, idx) => (
                                <div key={`${item.name}-${idx}`} className="flex justify-between items-center p-3 rounded-xl bg-purple-50/40 border border-purple-100/40 text-xs font-bold font-sans">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-100 text-purple-700 font-black font-mono text-[10px] shrink-0">
                                      {idx + 1}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-slate-800 font-extrabold truncate max-w-[180px]">{item.name}</p>
                                      {item.customer && (
                                        <p className="text-[9px] text-slate-400 font-semibold truncate mt-0.5">
                                          {isBangla ? `গ্রাহক: ${item.customer}` : `Cust: ${item.customer}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-purple-600 font-black">{formatCurrency(item.price, isBangla)}</p>
                                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{formatDate(item.date, isBangla)}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* DUE (বাকি) */}
                      {weeklyDetailModal === 'due' && (() => {
                        let daysToSubtract = 6;
                        if (weeklyPeriod === '30D') daysToSubtract = 29;
                        if (weeklyPeriod === '1D') daysToSubtract = 0;
                        const periodStartDateStr = (() => {
                          const d = new Date();
                          d.setDate(d.getDate() - daysToSubtract);
                          const yyyy = d.getFullYear();
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const dd = String(d.getDate()).padStart(2, '0');
                          return `${yyyy}-${mm}-${dd}`;
                        })();
                        const dueTxs = transactions.filter(tx => tx.date >= periodStartDateStr && !tx.isCash);

                        return (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-500 font-bold leading-relaxed">
                              {isBangla 
                                ? 'এই নির্দিষ্ট মেয়াদে মোট বাকিতে বিক্রয়ের বিবরণী নিচে দেওয়া হলো:' 
                                : 'Below are all the due sales recorded during this period:'}
                            </p>
                            {dueTxs.length === 0 ? (
                              <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                                {isBangla ? 'কোনো বাকি বিক্রির হিসাব পাওয়া যায়নি।' : 'No due sales recorded during this timeframe.'}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {dueTxs.map((tx, idx) => (
                                  <div key={tx.id || idx} className="flex justify-between items-center p-3 rounded-xl bg-orange-50/40 border border-orange-100/40 text-xs font-bold font-sans">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-orange-100 text-orange-700 font-black font-mono text-[10px] shrink-0">
                                        {idx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-slate-800 font-extrabold truncate max-w-[180px]">{tx.customer || (isBangla ? 'সাধারণ বাকি' : 'General Due')}</p>
                                        <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">{tx.product}</p>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-orange-600 font-black">{formatCurrency(tx.amount, isBangla)}</p>
                                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{formatDate(tx.date, isBangla)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* OTHERS (অন্যান্য) */}
                      {weeklyDetailModal === 'others' && (() => {
                        let daysToSubtract = 6;
                        if (weeklyPeriod === '30D') daysToSubtract = 29;
                        if (weeklyPeriod === '1D') daysToSubtract = 0;
                        const periodStartDateStr = (() => {
                          const d = new Date();
                          d.setDate(d.getDate() - daysToSubtract);
                          const yyyy = d.getFullYear();
                          const mm = String(d.getMonth() + 1).padStart(2, '0');
                          const dd = String(d.getDate()).padStart(2, '0');
                          return `${yyyy}-${mm}-${dd}`;
                        })();

                        const isProductSale = (tx: Transaction) => {
                          const prodLower = tx.product.toLowerCase().trim();
                          return !(
                            prodLower.startsWith('বাকি টাকা জমা') || 
                            prodLower.startsWith('বাকির টাকা জমা') || 
                            prodLower.includes('due deposit') ||
                            prodLower.includes('বাকি টাকা জমা')
                          );
                        };

                        const otherTxs = transactions.filter(tx => tx.date >= periodStartDateStr && !isProductSale(tx));

                        return (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-500 font-bold leading-relaxed">
                              {isBangla 
                                ? 'এই নির্দিষ্ট মেয়াদে বাকির টাকা পরিশোধ/জমা নেওয়ার বিবরণী নিচে দেওয়া হলো:' 
                                : 'Below are all the payments received for previous dues during this period:'}
                            </p>
                            {otherTxs.length === 0 ? (
                              <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                                {isBangla ? 'কোনো বাকির টাকা জমা পাওয়া যায়নি।' : 'No due deposits recorded during this timeframe.'}
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {otherTxs.map((tx, idx) => (
                                  <div key={tx.id || idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200/50 text-xs font-bold font-sans">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 text-slate-600 font-black font-mono text-[10px] shrink-0">
                                        {idx + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-slate-800 font-extrabold truncate max-w-[180px]">{tx.customer || (isBangla ? 'সাধারণ জমা' : 'General Deposit')}</p>
                                        <p className="text-[9px] text-slate-400 font-bold truncate mt-0.5">{tx.product}</p>
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <p className="text-emerald-600 font-black">+{formatCurrency(tx.amount, isBangla)}</p>
                                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{formatDate(tx.date, isBangla)}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Footer */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setWeeklyDetailModal(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                      >
                        {isBangla ? 'বন্ধ করুন' : 'Close'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-teal-600" />
                <span>{isBangla ? 'গত ৭ দিনের বেচাকেনা বনাম খরচের তুলনা' : 'Last 7 Days Sales vs Expenses Comparison'}</span>
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
                      .slice(0, 7)
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
                {topSellingProducts.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-xl">
                    {isBangla ? 'চলতি মাসে কোনো পণ্য বিক্রি হয়নি।' : 'No products sold this month.'}
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {(showAllTopProducts ? topSellingProducts : topSellingProducts.slice(0, 8)).map((item, index) => {
                      const allProducts = topSellingProducts;
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

                    {topSellingProducts.length > 8 && (
                      <button
                        type="button"
                        onClick={() => setShowAllTopProducts(!showAllTopProducts)}
                        className="w-full mt-2 py-2 text-xs font-extrabold text-teal-600 hover:text-teal-800 hover:bg-slate-100/50 border border-slate-200/50 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-98"
                      >
                        <span>
                          {showAllTopProducts 
                            ? (isBangla ? 'কম দেখান' : 'Show Less') 
                            : (isBangla ? `আরও ${toBanglaNumber(topSellingProducts.length - 8)}টি দেখুন` : `Show ${topSellingProducts.length - 8} More`)
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

            {/* --- All-time Product Sales Donut Chart Infographic --- */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
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
          </motion.div>
        )}



        {/* --- 4. SETTINGS TAB VIEW --- */}
        {currentNavTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.1, ease: 'easeOut' }}
            className={`${(settingsSubTab === 'history' || settingsSubTab === 'memo') ? 'max-w-7xl' : 'max-w-4xl'} mx-auto w-full px-4 py-4 space-y-5 transition-all duration-300`}
          >
            {/* Settings Tab Navigation Header */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-3xs overflow-x-auto whitespace-nowrap scrollbar-none">
              <button
                type="button"
                onClick={() => setSettingsSubTab('store')}
                className={`flex-1 min-w-[70px] py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  settingsSubTab === 'store'
                    ? 'bg-white text-teal-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800 font-bold'
                }`}
              >
                {isBangla ? 'সাধারণ' : 'General'}
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('sync')}
                className={`flex-1 min-w-[70px] py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  settingsSubTab === 'sync'
                    ? 'bg-white text-teal-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800 font-bold'
                }`}
              >
                {isBangla ? 'ব্যাকআপ' : 'Backup'}
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('history')}
                className={`flex-1 min-w-[70px] py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  settingsSubTab === 'history'
                    ? 'bg-white text-teal-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800 font-bold'
                }`}
              >
                {isBangla ? 'ইতিহাস' : 'History'}
              </button>
              <button
                type="button"
                onClick={() => setSettingsSubTab('memo')}
                className={`flex-1 min-w-[90px] py-2 px-3 text-xs font-black rounded-lg transition-all cursor-pointer ${
                  settingsSubTab === 'memo'
                    ? 'bg-white text-teal-700 shadow-3xs'
                    : 'text-slate-500 hover:text-slate-800 font-bold'
                }`}
              >
                {isBangla ? 'মেমো/রশিদ' : 'Memo/Receipt'}
              </button>
            </div>

            {settingsSubTab === 'store' && (
              <motion.div
                key="store-settings"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start"
              >
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

                {/* About Us Card - Displayed directly inside General settings */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4 text-center w-full">
                  <div className="flex justify-center">
                    <img
                      src={logoPngWithCache}
                      onError={handleLogoError}
                      alt="হিসাব খাতা"
                      className="h-14 w-14 rounded-2xl object-cover shadow-md border border-slate-200/60"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-none">
                      {isBangla ? 'হিসাব খাতা' : 'Hisab Khata'}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1.5 font-bold">
                      {isBangla ? 'নিরাপদ ও রিয়েল-টাইম ক্লাউড ব্যাকআপ হিসাব ব্যবস্থাপনাকারী' : 'Secure & Real-time Cloud Sync Ledger Manager'}
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-3 text-left space-y-2.5 text-xs">
                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                      <span className="text-slate-500 font-bold">{isBangla ? 'ব্যবস্থাপনাকারী:' : 'Managed By:'}</span>
                      <span className="text-slate-800 font-extrabold">{isBangla ? 'জনি দত্ত' : 'Jony Datta'}</span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                      <span className="text-slate-500 font-bold">{isBangla ? 'যোগাযোগ করুন:' : 'Contact Us:'}</span>
                      <div className="flex items-center gap-3">
                        <a
                          href="https://www.facebook.com/jonydatta247"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors cursor-pointer border border-blue-100 flex items-center justify-center"
                          title="Facebook"
                        >
                          <Facebook className="h-4 w-4" />
                        </a>
                        <a
                          href="https://www.linkedin.com/in/jonydatta"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 rounded-lg transition-colors cursor-pointer border border-sky-100 flex items-center justify-center"
                          title="LinkedIn"
                        >
                          <Linkedin className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 leading-relaxed font-bold max-w-sm mx-auto">
                    {isBangla 
                      ? 'হিসাব খাতা আপনার বেচাকেনা, বাকির খাতা ও দৈনিক খরচ নিরাপদভাবে সহজে সংরক্ষণ করতে সাহায্য করে।' 
                      : 'Hisab Khata securely manages and tracks your sales, daily store expenses, and customer dues.'}
                  </div>
                </div>
              </motion.div>
            )}

            {settingsSubTab === 'sync' && (
              <motion.div
                key="sync-settings"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start max-w-4xl mx-auto"
              >
                {/* Cloud Sync Settings */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4 w-full">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                    {isBangla ? 'ব্যাকআপ অ্যাকাউন্ট' : 'Backup Account'}
                  </h3>

                  <div className="space-y-4">
                    {currentUser && currentUser.email ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between px-3 py-2 bg-teal-50/50 rounded-lg border border-teal-100/50">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                            <span className="text-[11px] text-teal-800 font-bold truncate max-w-[180px] font-sans">
                              {currentUser.email}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:bg-rose-50 px-2 py-0.5 rounded border border-rose-100"
                          >
                            {isBangla ? 'লগআউট' : 'Logout'}
                          </button>
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
                            onClick={() => toggleSyncState(currentUser.email || '')}
                            className={`px-3 py-1.5 text-[10px] font-extrabold rounded-lg border transition-colors cursor-pointer ${
                              isSyncActive
                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                            }`}
                          >
                            {isSyncActive ? (isBangla ? 'বন্ধ করুন' : 'Disable') : (isBangla ? 'চালু করুন' : 'Enable')}
                          </button>
                        </div>

                        {isSyncActive && (
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => triggerCloudSync(transactions, expenses, shopName, currentUser.email || '')}
                              disabled={isSyncing}
                              className="py-2 px-1 bg-teal-50/50 hover:bg-teal-50 border border-teal-100 rounded-xl text-[10px] sm:text-xs font-bold text-teal-700 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-3xs transition-all disabled:opacity-50"
                            >
                              <FileUp className="h-4 w-4 text-teal-600" />
                              <span className="text-center">{isBangla ? 'এখনই সিঙ্ক' : 'Sync Now'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleRestoreCloudBackup}
                              disabled={isSyncing}
                              className="py-2 px-1 bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] sm:text-xs font-bold text-indigo-700 flex flex-col items-center justify-center gap-1 cursor-pointer shadow-3xs transition-all disabled:opacity-50"
                            >
                              <FileDown className="h-4 w-4 text-indigo-600" />
                              <span className="text-center">{isBangla ? 'ব্যাকআপ রিস্টোর' : 'Restore Backup'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Tabs */}
                        <div className="flex border-b border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setAuthTab('google');
                              setAuthError('');
                            }}
                            className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                              authTab === 'google'
                                ? 'border-teal-600 text-teal-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {isBangla ? 'গুগল লগইন' : 'Google Login'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthTab('email');
                              setAuthError('');
                            }}
                            className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                              authTab === 'email'
                                ? 'border-teal-600 text-teal-700'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {isBangla ? 'ইমেইল ও পাসওয়ার্ড' : 'Email & Password'}
                          </button>
                        </div>

                        {authTab === 'google' ? (
                          <div className="space-y-4 pt-1">
                            {/* Google Sign-In Option */}
                            <button
                              type="button"
                              onClick={handleGoogleLogin}
                              disabled={isSyncing}
                              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 shadow-3xs flex items-center justify-center gap-2 transition-all cursor-pointer h-11"
                              id="settings-google-signin-btn"
                            >
                              <svg className="h-4 w-4 mr-1 shrink-0" viewBox="0 0 24 24">
                                <path
                                  fill="#EA4335"
                                  d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.99 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.89 3.02C6.18 7.55 8.87 5.04 12 5.04z"
                                />
                                <path
                                  fill="#4285F4"
                                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.61 2.8c2.11-1.95 3.78-4.83 3.78-8.43z"
                                />
                                <path
                                  fill="#FBBC05"
                                  d="M5.28 14.42c-.25-.75-.39-1.55-.39-2.42s.14-1.67.39-2.42L1.39 7.56C.5 9.36 0 11.4 0 13.5s.5 4.14 1.39 5.94l3.89-3.02z"
                                />
                                <path
                                  fill="#34A853"
                                  d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.61-2.8c-1.12.75-2.54 1.21-4.35 1.21-3.13 0-5.82-2.51-6.72-5.54l-3.89 3.02C3.37 20.35 7.35 23 12 23z"
                                />
                              </svg>
                              <span>{isBangla ? 'গুগল অ্যাকাউন্ট দিয়ে লগইন করুন' : 'Sign in with Google'}</span>
                            </button>

                            {isIframe && (
                              <p className="text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-xl leading-normal font-bold border border-amber-100">
                                ⚠️ {isBangla 
                                  ? 'আপনি প্রিভিউ ফ্রেমের ভেতরে আছেন। গুগল লগইন সফল করতে ওপরের "Open App" বাটনে ক্লিক করে নতুন ট্যাবে ওপেন করুন।' 
                                  : 'You are inside a preview frame. To log in with Google, click "Open App" at the top to open in a new tab.'}
                              </p>
                            )}
                          </div>
                        ) : (
                          <form onSubmit={handleEmailAuth} className="space-y-3 pt-1" id="settings-email-login-form">
                            {/* Segmented Control for Log In vs Register */}
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRegisterMode(false);
                                  setAuthError('');
                                }}
                                className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                                  !isRegisterMode
                                    ? 'bg-white text-teal-800 shadow-3xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {isBangla ? 'লগইন করুন (Log In)' : 'Log In'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRegisterMode(true);
                                  setAuthError('');
                                }}
                                className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                                  isRegisterMode
                                    ? 'bg-white text-teal-800 shadow-3xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {isBangla ? 'নতুন অ্যাকাউন্ট (Register)' : 'Register'}
                              </button>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                {isBangla ? 'ইমেইল এড্রেস' : 'Email Address'}
                              </label>
                              <input
                                type="email"
                                required
                                value={authEmail}
                                onChange={(e) => setAuthEmail(e.target.value)}
                                placeholder="example@mail.com"
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                                id="settings-auth-email-input"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                {isBangla ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 chars)'}
                              </label>
                              <input
                                type="password"
                                required
                                value={authPassword}
                                onChange={(e) => setAuthPassword(e.target.value)}
                                placeholder="••••••"
                                className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                                id="settings-auth-password-input"
                              />
                            </div>

                            {authError && (
                              <div className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-100 whitespace-pre-line leading-relaxed">
                                ⚠️ {authError}
                              </div>
                            )}

                            <div className="flex flex-col gap-2 pt-1">
                              <button
                                type="submit"
                                disabled={isSyncing}
                                className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer h-10 flex items-center justify-center gap-1.5"
                                id="settings-email-auth-submit-btn"
                              >
                                <span>
                                  {isRegisterMode 
                                    ? (isBangla ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Register New Account') 
                                    : (isBangla ? 'লগইন করুন' : 'Log In')
                                  }
                                </span>
                              </button>

                              {!isRegisterMode && (
                                <button
                                  type="button"
                                  onClick={handleForgotPassword}
                                  className="text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer py-1"
                                  id="settings-forgot-password-btn"
                                >
                                  {isBangla ? 'পাসওয়ার্ড ভুলে গেছেন? রিসেট লিংক পাঠান' : 'Forgot Password? Send Reset Link'}
                                </button>
                              )}
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                    {isSyncing && (
                      <div className="text-center py-1 text-xs text-indigo-600 font-bold animate-pulse flex items-center justify-center gap-1.5">
                        <span className="h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                        <span>{syncMessage}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Backup & Hard Reset Card - Moved here from 'store' settings */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4 w-full">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">
                    {isBangla ? 'ডেটা সংরক্ষণ করুন' : 'Data Backup & Restore'}
                  </h3>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="py-2.5 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <FileDown className="h-4 w-4 text-teal-600" />
                      <span>{isBangla ? 'ডাউনলোড খাতা' : 'Download JSON'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleImportClick}
                      className="py-2.5 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <FileUp className="h-4 w-4 text-indigo-600" />
                      <span>{isBangla ? 'আপলোড খাতা' : 'Upload JSON'}</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {settingsSubTab === 'history' && (
              <motion.div
                key="history-settings"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
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
                      <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 p-1 rounded-xl shadow-3xs">
                        <button
                          type="button"
                          onClick={() => changeDateByDays(-1)}
                          className="p-1.5 hover:bg-slate-200/70 text-slate-600 rounded-lg transition-all cursor-pointer active:scale-90"
                          title={isBangla ? 'আগের দিন' : 'Previous Day'}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        
                        <div className="flex items-center gap-1.5 px-1">
                          <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border-0 focus:ring-0 p-0 text-xs font-bold text-slate-700 bg-transparent focus:outline-none w-[115px]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => changeDateByDays(1)}
                          className="p-1.5 hover:bg-slate-200/70 text-slate-600 rounded-lg transition-all cursor-pointer active:scale-90"
                          title={isBangla ? 'পরের দিন' : 'Next Day'}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
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
                        {isBalancesHidden ? '৳ ••••' : formatCurrency(todaySales, isBangla)}
                      </span>
                    </div>
                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                      <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                        {isBangla ? 'নগদ জমা' : 'Cash Deposit'}
                      </span>
                      <span className="text-[17px] sm:text-lg font-black text-blue-700 block mt-1">
                        {isBalancesHidden ? '৳ ••••' : formatCurrency(todayCashDeposit, isBangla)}
                      </span>
                    </div>
                    <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
                      <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                        {isBangla ? 'বাকি লেনদেন' : 'Dues Given'}
                      </span>
                      <span className="text-[17px] sm:text-lg font-black text-amber-700 block mt-1">
                        {isBalancesHidden ? '৳ ••••' : formatCurrency(todayDueTaken, isBangla)}
                      </span>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                      <span className="text-[13px] sm:text-sm font-extrabold text-slate-600 uppercase tracking-wide block">
                        {isBangla ? 'ঐ দিনের মোট খরচ' : 'Expenses on Date'}
                      </span>
                      <span className="text-[17px] sm:text-lg font-black text-rose-700 block mt-1">
                        {isBalancesHidden ? '৳ ••••' : formatCurrency(todayExpenseTotal, isBangla)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* All Sold Products History Section */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-3xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <span>📦</span>
                        <span>{isBangla ? 'বিক্রিত মালের সম্পূর্ণ ইতিহাস' : 'Sold Products History'}</span>
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isBangla ? 'দোকানের শুরু থেকে বিক্রি হওয়া সকল পণ্যের তালিকা।' : 'All products sold from the beginning.'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100/50 px-2.5 py-1 rounded-full shrink-0">
                      <span className="text-xs font-black text-indigo-700 font-sans">
                        {isBangla ? toBanglaNumber(soldTransactions.length) : soldTransactions.length}
                      </span>
                      <span className="text-[10px] text-indigo-600/95 font-bold font-sans">
                        {isBangla ? 'টি বিক্রি' : 'sales'}
                      </span>
                    </div>
                  </div>

                  {/* Search input for History */}
                  <div className="relative w-full max-w-md mx-auto">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Search className="h-4 w-4 text-indigo-500" />
                    </span>
                    <input
                      type="text"
                      placeholder={isBangla ? 'পণ্যের নাম বা ক্রেতার নাম দিয়ে খুঁজুন...' : 'Search by product or customer name...'}
                      value={historySearchQuery}
                      onChange={(e) => {
                        setHistorySearchQuery(e.target.value);
                        setIsHistoryExpanded(false); // reset expansion when searching
                      }}
                      className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/40 font-medium"
                    />
                  </div>

                  {/* Sold products list/table */}
                  {filteredSoldTransactions.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
                      <p className="text-slate-400 text-xs font-bold">
                        {isBangla ? 'কোনো বিক্রিত মাল খুঁজে পাওয়া যায়নি।' : 'No sold products match your search.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className={`overflow-x-auto overflow-y-auto no-scrollbar border border-slate-200 rounded-xl shadow-3xs bg-white transition-all duration-300 ${
                        isHistoryExpanded ? 'max-h-[440px]' : ''
                      }`}>
                        <table className="w-full text-left border-collapse text-xs table-fixed">
                          <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200">
                            <tr className="text-slate-600 font-extrabold">
                              <th className="py-2.5 px-2">{isBangla ? 'পণ্য' : 'Product'}</th>
                              <th className="py-2.5 px-2 w-[70px] sm:w-[80px] text-center">{isBangla ? 'পেমেন্ট' : 'Payment'}</th>
                              <th className="py-2.5 px-2 text-right w-[80px] sm:w-[95px]">{isBangla ? 'পরিমাণ' : 'Amount'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                            {(isHistoryExpanded ? filteredSoldTransactions : filteredSoldTransactions.slice(0, 7)).map((tx, idx) => (
                              <tr 
                                key={tx.id || idx} 
                                className="hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="py-2 px-2">
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center flex-wrap gap-1.5">
                                      <span className="font-bold text-slate-800 text-xs sm:text-[13px] break-words whitespace-normal leading-tight">
                                        <span className="text-slate-400 mr-1.5 font-bold font-sans">
                                          {isBangla ? toBanglaNumber(idx + 1) : idx + 1}.
                                        </span>
                                        {tx.product}
                                      </span>
                                      <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 font-bold font-mono shrink-0">
                                        📅 {formatDate(tx.date, isBangla)}
                                      </span>
                                    </div>
                                    {!tx.isCash && tx.customer && (
                                      <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.2 rounded w-fit border border-rose-100/40 break-words whitespace-normal leading-tight">
                                        👤 {tx.customer}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-2 w-[70px] sm:w-[80px] text-center">
                                  {tx.isCash ? (
                                    <span className="inline-flex items-center justify-center gap-0.5 text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 w-full">
                                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                                      {isBangla ? 'নগদ' : 'Cash'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center gap-0.5 text-[9px] font-black bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100 w-full">
                                      <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                                      {isBangla ? 'বাকি' : 'Due'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-right w-[80px] sm:w-[95px]">
                                  <span className="font-extrabold text-slate-900 text-xs sm:text-[13px] font-sans">
                                    {isBalancesHidden ? '৳ ••••' : formatCurrency(tx.amount, isBangla)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Smooth See More / See Less Buttons */}
                      {filteredSoldTransactions.length > 7 && (
                        <div className="flex justify-center mt-4">
                          <button
                            type="button"
                            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                            className="px-4 py-1.5 text-xs text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-xl border border-indigo-100 transition-all font-extrabold cursor-pointer shadow-3xs flex items-center justify-center gap-1 active:scale-95"
                          >
                            {isHistoryExpanded 
                              ? (isBangla ? 'কম দেখান' : 'Show Less') 
                              : (isBangla ? 'আরো দেখুন' : 'Show More')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* About us has been rearranged into General subtab */}

            {settingsSubTab === 'memo' && (
              <Suspense fallback={
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                </div>
              }>
                <MemoTab
                  key={memoKey}
                  transactions={transactions}
                  productRates={productRates}
                  shopName={shopName}
                  isBangla={isBangla}
                  initialCustomerName={initialMemoCustomer}
                  initialItems={initialMemoItems}
                />
              </Suspense>
            )}
          </motion.div>
        )}
        </AnimatePresence>

      </main>

      {/* --- FLOATING CALC OVERLAY SIDEBAR DRAWER --- */}
      <Suspense fallback={null}>
        <Calculator
          isOpen={isCalcOpen}
          onClose={() => setIsCalcOpen(false)}
          isBangla={isBangla}
          onApplyValue={(val) => {
            setAmount(String(val));
            showToast(isBangla ? 'হিসাবটি দামের ঘরে বসানো হয়েছে!' : 'Amount pasted successfully!');
          }}
        />
      </Suspense>

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

                {/* Server Selection Segment */}
                {isCapacitor && (
                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2" id="auth-server-selector">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {isBangla ? 'কানেকশন সার্ভার (Server Connection)' : 'Connection Server'}
                    </span>
                    <div className="grid grid-cols-2 p-0.5 bg-slate-200/60 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthServerType('dev');
                          localStorage.setItem('hisab_khata_auth_server_type', 'dev');
                        }}
                        className={`py-1.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                          authServerType === 'dev'
                            ? 'bg-white text-teal-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {isBangla ? 'ডেভ সার্ভার (Dev)' : 'Dev Server'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthServerType('pre');
                          localStorage.setItem('hisab_khata_auth_server_type', 'pre');
                        }}
                        className={`py-1.5 text-[11px] font-black rounded-md transition-all cursor-pointer ${
                          authServerType === 'pre'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {isBangla ? 'লাইভ সার্ভার (Live)' : 'Live Server'}
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-400 leading-normal font-medium">
                      {isBangla 
                        ? '💡 অ্যাপ ডেভেলপমেন্ট বা টেস্টিংয়ের সময় "ডেভ" সিলেক্ট করুন। ফাইনাল শেয়ার বা রিলিজের পর "লাইভ" সিলেক্ট করুন।' 
                        : '💡 Select "Dev" during testing/development. Select "Live" for production builds.'}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {currentUser ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                        <div className="flex items-center gap-2 mb-2 text-emerald-800 font-black text-xs">
                          <Check className="h-4 w-4 bg-emerald-100 text-emerald-700 p-0.5 rounded-full" />
                          <span>{isBangla ? 'নিরাপদ অ্যাকাউন্ট সংযুক্ত' : 'Secure Account Connected'}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold break-all">
                          {isBangla ? 'ইমেইল:' : 'Email:'} <span className="text-slate-800">{currentUser.email}</span>
                        </p>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="mt-3 text-[10px] text-rose-600 hover:text-rose-800 font-extrabold cursor-pointer hover:bg-rose-50 px-2.5 py-1.5 border border-rose-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          <span>{isBangla ? 'অ্যাকাউন্ট লগআউট করুন' : 'Logout Account'}</span>
                        </button>
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
                          onClick={() => toggleSyncState(currentUser.email)}
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
                          onClick={() => triggerCloudSync(transactions, expenses, shopName, currentUser.email)}
                          disabled={isSyncing}
                          className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Cloud className="h-4 w-4 text-white" />
                          <span>{isBangla ? 'এখনই সিঙ্ক করুন (Force Sync)' : 'Sync Now (Force Sync)'}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Tabs */}
                      <div className="flex border-b border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('google');
                            setAuthError('');
                          }}
                          className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors ${
                            authTab === 'google'
                              ? 'border-teal-600 text-teal-700'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {isBangla ? 'গুগল লগইন' : 'Google Login'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthTab('email');
                            setAuthError('');
                          }}
                          className={`flex-1 pb-2 text-xs font-bold border-b-2 transition-colors ${
                            authTab === 'email'
                              ? 'border-teal-600 text-teal-700'
                              : 'border-transparent text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {isBangla ? 'ইমেইল ও পাসওয়ার্ড' : 'Email & Password'}
                        </button>
                      </div>

                      {authTab === 'google' ? (
                        <div className="space-y-4 pt-1">
                          {/* Google Sign-In Option (Recommended & Secure) */}
                          <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isSyncing}
                            className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-200 shadow-3xs flex items-center justify-center gap-2 transition-all cursor-pointer h-11"
                            id="google-signin-btn"
                          >
                            <svg className="h-4 w-4 mr-1 shrink-0" viewBox="0 0 24 24">
                              <path
                                fill="#EA4335"
                                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.99 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.89 3.02C6.18 7.55 8.87 5.04 12 5.04z"
                              />
                              <path
                                fill="#4285F4"
                                d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.66-2.33 3.48l3.61 2.8c2.11-1.95 3.78-4.83 3.78-8.43z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.28 14.42c-.25-.75-.39-1.55-.39-2.42s.14-1.67.39-2.42L1.39 7.56C.5 9.36 0 11.4 0 13.5s.5 4.14 1.39 5.94l3.89-3.02z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.61-2.8c-1.12.75-2.54 1.21-4.35 1.21-3.13 0-5.82-2.51-6.72-5.54l-3.89 3.02C3.37 20.35 7.35 23 12 23z"
                              />
                            </svg>
                            <span>{isBangla ? 'গুগল অ্যাকাউন্ট দিয়ে লগইন (নিরাপদ)' : 'Sign in with Google (Secure)'}</span>
                          </button>

                          {isIframe && (
                            <p className="text-[10px] text-amber-600 bg-amber-50 p-2.5 rounded-xl leading-normal font-bold border border-amber-100">
                              ⚠️ {isBangla 
                                ? 'আপনি প্রিভিউ ফ্রেমের ভেতরে আছেন। গুগল লগইন সফল করতে ওপরের "Open App" বাটনে ক্লিক করে নতুন ট্যাবে ওপেন করুন।' 
                                : 'You are inside a preview frame. To log in with Google, click "Open App" at the top to open in a new tab.'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
                          {/* Segmented Control for Log In vs Register */}
                          <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => {
                                setIsRegisterMode(false);
                                setAuthError('');
                              }}
                              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                                !isRegisterMode
                                  ? 'bg-white text-teal-800 shadow-3xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {isBangla ? 'লগইন করুন (Log In)' : 'Log In'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsRegisterMode(true);
                                setAuthError('');
                              }}
                              className={`flex-1 py-1.5 text-center text-[11px] font-extrabold rounded-lg transition-all cursor-pointer ${
                                isRegisterMode
                                  ? 'bg-white text-teal-800 shadow-3xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {isBangla ? 'নতুন অ্যাকাউন্ট (Register)' : 'Register'}
                            </button>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isBangla ? 'ইমেইল এড্রেস' : 'Email Address'}
                            </label>
                            <input
                              type="email"
                              required
                              value={authEmail}
                              onChange={(e) => setAuthEmail(e.target.value)}
                              placeholder="example@mail.com"
                              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              {isBangla ? 'পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'Password (min 6 chars)'}
                            </label>
                            <input
                              type="password"
                              required
                              value={authPassword}
                              onChange={(e) => setAuthPassword(e.target.value)}
                              placeholder="••••••"
                              className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-sans"
                            />
                          </div>

                          {authError && (
                            <div className="text-[11px] text-rose-600 font-bold bg-rose-50 p-2.5 rounded-lg border border-rose-100 whitespace-pre-line leading-relaxed">
                              ⚠️ {authError}
                            </div>
                          )}

                          <div className="flex flex-col gap-2 pt-1">
                            <button
                              type="submit"
                              disabled={isSyncing}
                              className="w-full py-2 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-400 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer h-10 flex items-center justify-center gap-1.5"
                            >
                              <span>
                                {isRegisterMode 
                                  ? (isBangla ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Register New Account') 
                                  : (isBangla ? 'লগইন করুন' : 'Log In')
                                }
                              </span>
                            </button>

                            {!isRegisterMode && (
                              <button
                                type="button"
                                onClick={handleForgotPassword}
                                className="text-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer py-1"
                              >
                                {isBangla ? 'পাসওয়ার্ড ভুলে গেছেন? রিসেট লিংক পাঠান' : 'Forgot Password? Send Reset Link'}
                              </button>
                            )}
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>

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

      {/* --- SYNC CONFLICT RESOLUTION MODAL OVERLAY --- */}
      <AnimatePresence>
        {syncConflictData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSyncConflictData(null)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[90vh]"
              id="sync-conflict-modal-box"
            >
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-150 shrink-0">
                <AlertCircle className="h-6 w-6 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {isBangla ? 'সিঙ্ক দ্বন্দ্ব সনাক্ত করা হয়েছে!' : 'Sync Conflict Detected!'}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isBangla 
                      ? 'ডিভাইস এবং ক্লাউড অ্যাকাউন্টে ভিন্ন ডাটা পাওয়া গেছে।' 
                      : 'Different data found on device and cloud account.'}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                <p className="text-slate-600 font-bold leading-relaxed">
                  {isBangla 
                    ? `আপনি ${syncConflictData.email} অ্যাকাউন্টে সিঙ্ক সচল করছেন। আপনার এই ডিভাইস এবং ফায়ারবেস ক্লাউডে আলাদা হিসাব সংরক্ষণ করা রয়েছে। তথ্য হারিয়ে যাওয়া রোধ করতে অনুগ্রহ করে নিচের যেকোনো একটি অপশন বেছে নিন:` 
                    : `You are enabling sync for ${syncConflictData.email}. Different store ledgers are saved on this device and on Firebase Cloud. To prevent data loss, please select which backup to preserve:`}
                </p>

                {/* Grid Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  
                  {/* Local Device Data Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[10px] uppercase tracking-wider mb-2.5">
                        {isBangla ? '১. লোকাল ডিভাইস' : '1. Local Device'}
                      </span>
                      <ul className="space-y-1.5 font-bold text-slate-700">
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'মোট বেচাকেনা:' : 'Sales:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.localData.transactions.length) : syncConflictData.localData.transactions.length}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'মোট খরচ:' : 'Expenses:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.localData.expenses.length) : syncConflictData.localData.expenses.length}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'মালের রেট:' : 'Product Rates:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.localData.productRates.length) : syncConflictData.localData.productRates.length}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'অর্ডার স্টক আউট:' : 'Out of Stock:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.localData.outOfStockItems.length) : syncConflictData.localData.outOfStockItems.length}</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="mt-4 pt-2.5 border-t border-slate-200/50 text-[10px] text-slate-400 flex flex-col font-medium">
                      <span>{isBangla ? 'সর্বশেষ আপডেট:' : 'Last Updated:'}</span>
                      <span className="text-slate-600 font-bold mt-0.5">
                        {syncConflictData.localData.lastUpdated 
                          ? new Date(syncConflictData.localData.lastUpdated).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' - ' + new Date(syncConflictData.localData.lastUpdated).toLocaleTimeString(isBangla ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                          : (isBangla ? 'কখনো না' : 'Never')
                        }
                      </span>
                    </div>
                  </div>

                  {/* Cloud Backup Data Card */}
                  <div className="p-4 rounded-xl border border-teal-150 bg-teal-50/20 flex flex-col justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 font-extrabold text-[10px] uppercase tracking-wider mb-2.5">
                        {isBangla ? '২. ক্লাউড ব্যাকআপ' : '2. Cloud Backup'}
                      </span>
                      <ul className="space-y-1.5 font-bold text-slate-700">
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'মোট বেচাকেনা:' : 'Sales:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.cloudData.transactions?.length || 0) : (syncConflictData.cloudData.transactions?.length || 0)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'মোট খরচ:' : 'Expenses:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.cloudData.expenses?.length || 0) : (syncConflictData.cloudData.expenses?.length || 0)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'মালের রেট:' : 'Product Rates:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.cloudData.productRates?.length || 0) : (syncConflictData.cloudData.productRates?.length || 0)}</span>
                        </li>
                        <li className="flex justify-between">
                          <span className="text-slate-400 font-medium">{isBangla ? 'অর্ডার স্টক আউট:' : 'Out of Stock:'}</span>
                          <span className="font-sans text-slate-900">{isBangla ? toBanglaNumber(syncConflictData.cloudData.outOfStockItems?.length || 0) : (syncConflictData.cloudData.outOfStockItems?.length || 0)}</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div className="mt-4 pt-2.5 border-t border-teal-200/40 text-[10px] text-slate-400 flex flex-col font-medium">
                      <span>{isBangla ? 'সর্বশেষ ব্যাকআপ:' : 'Last Backup:'}</span>
                      <span className="text-slate-600 font-bold mt-0.5">
                        {syncConflictData.cloudData.updatedAt 
                          ? new Date(syncConflictData.cloudData.updatedAt).toLocaleDateString(isBangla ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' - ' + new Date(syncConflictData.cloudData.updatedAt).toLocaleTimeString(isBangla ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                          : (isBangla ? 'কখনো না' : 'Never')
                        }
                      </span>
                    </div>
                  </div>

                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] text-amber-850 font-medium leading-relaxed">
                  ⚠️ <span className="font-bold">{isBangla ? 'সতর্কতা:' : 'Note:'}</span> {isBangla 
                    ? 'আপনি যে ব্যাকআপটি নির্বাচন করবেন সেটি সচল থাকবে এবং অপরটি সম্পূর্ণ প্রতিস্থাপিত (Overwrite) হয়ে যাবে।' 
                    : 'The backup you choose will be kept active, and the other backup will be permanently overwritten.'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-150 shrink-0">
                <button
                  type="button"
                  onClick={() => setSyncConflictData(null)}
                  className="px-4 py-2.5 text-xs text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer font-bold transition-all text-center"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => resolveSyncConflict('cloud')}
                  className="px-4 py-2.5 text-xs text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-xs cursor-pointer font-extrabold transition-all text-center flex items-center justify-center gap-1"
                >
                  <FileDown className="h-4 w-4 shrink-0" />
                  <span>{isBangla ? 'ক্লাউড ব্যাকআপ রিস্টোর করুন' : 'Restore Cloud Backup'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => resolveSyncConflict('local')}
                  className="px-4 py-2.5 text-xs text-slate-800 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-xs cursor-pointer font-extrabold transition-all text-center flex items-center justify-center gap-1"
                >
                  <FileUp className="h-4 w-4 shrink-0" />
                  <span>{isBangla ? 'লোকাল তথ্য ক্লাউডে আপলোড করুন' : 'Upload Local Data'}</span>
                </button>
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
                            <div 
                              className="flex items-center gap-1.5 cursor-pointer group"
                              onClick={() => setSelectedCustomerForDetail(cd.name)}
                              title={isBangla ? 'বিস্তারিত খতিয়ান দেখতে ক্লিক করুন' : 'Click to view detailed ledger'}
                            >
                              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 group-hover:bg-rose-600"></span>
                              <h4 className="text-xs sm:text-sm font-black text-slate-800 group-hover:text-rose-600 group-hover:underline truncate">{cd.name}</h4>
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold mt-1 pl-3.5">
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
                                  let val = e.target.value;
                                  if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                                    val = val.replace(/^0+/, '');
                                  }
                                  setModalDepositValue(val);
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

      {/* --- CUSTOMER DUE HISTORY DETAILS MODAL --- */}
      <AnimatePresence>
        {selectedCustomerForDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomerForDetail(null)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-5 border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-150">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base flex items-center gap-2">
                  <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                    <History className="h-4 w-4" />
                  </span>
                  <span>
                    {isBangla ? `${selectedCustomerForDetail}-এর বাকি খতিয়ান` : `${selectedCustomerForDetail}'s Due Ledger`}
                  </span>
                </h3>
                <button
                  onClick={() => setSelectedCustomerForDetail(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              {/* Total Outstanding Summary */}
              <div className="bg-rose-50 border border-rose-200/50 rounded-xl p-3.5 mb-3.5 flex justify-between items-center text-xs font-black text-rose-900">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                  {isBangla ? 'বর্তমান মোট বকেয়া পাওনা:' : 'Current Outstanding Due:'}
                </span>
                <span className="text-base sm:text-lg font-black text-rose-600">
                  {formatCurrency(selectedCustomerTotalDue, isBangla)}
                </span>
              </div>

              {/* Scrollable Ledger Details */}
              <div className="overflow-y-auto flex-1 pr-1 space-y-2.5 max-h-[45vh]">
                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  {isBangla ? 'লেনদেনের বিবরণী (নতুন থেকে পুরাতন)' : 'Transaction History (Newest to Oldest)'}
                </h4>

                {selectedCustomerTxHistory.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    {isBangla ? 'কোনো লেনদেনের তথ্য পাওয়া যায়নি' : 'No transactions recorded for this customer'}
                  </div>
                ) : (
                  selectedCustomerTxHistory.map((tx) => {
                    const isDuePurchase = !tx.isCash;
                    return (
                      <div
                        key={tx.id}
                        className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                          isDuePurchase 
                            ? 'border-rose-100 bg-rose-50/5 hover:bg-rose-50/10' 
                            : 'border-emerald-100 bg-emerald-50/5 hover:bg-emerald-50/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {/* Product Name / Activity Description */}
                            <p className="text-xs font-bold text-slate-800 leading-tight">
                              {tx.product}
                            </p>
                            
                            {/* Date & Time */}
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mt-1">
                              <span className="flex items-center gap-0.5">
                                <Calendar className="h-2.5 w-2.5" />
                                <span className="font-mono">{formatDate(tx.date, isBangla)}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                <span className="font-mono">{formatTimeStr(tx.time, isBangla)}</span>
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            {/* Type Badge */}
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md tracking-wider ${
                              isDuePurchase 
                                ? 'bg-rose-100 text-rose-700' 
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isDuePurchase 
                                ? (isBangla ? 'বাকি নিয়েছেন' : 'Took Due') 
                                : (isBangla ? 'জমা দিয়েছেন' : 'Paid/Deposit')}
                            </span>

                            {/* Price / Amount */}
                            <span className={`text-xs sm:text-sm font-black ${
                              isDuePurchase ? 'text-rose-600' : 'text-emerald-600'
                            }`}>
                              {isDuePurchase ? '+' : '-'}{formatCurrency(tx.amount, isBangla)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end pt-3 mt-4 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForDetail(null)}
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
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                        val = val.replace(/^0+/, '');
                      }
                      setExpenseAmount(val);
                    }}
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

      {/* --- ADD CUSTOMER DUE MODAL --- */}
      <AnimatePresence>
        {isAddDueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddDueModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="add-due-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></span>
                  {isBangla ? 'নতুন বকেয়া বাকি হিসাব যোগ' : 'Add Customer Outstanding Due'}
                </h3>
                <button
                  onClick={() => setIsAddDueModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddDue} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'ক্রেতা বা গ্রাহকের নাম' : 'Customer Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isBangla ? 'যেমন: রহিম মিয়া, জসিম ভাই' : 'e.g. Rahim Miah, Jashim'}
                    value={addDueCustomerName}
                    onChange={(e) => setAddDueCustomerName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    id="add-due-customer-name"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'বকেয়া বাকি টাকা (৳)' : 'Due Amount (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={isBangla ? 'যেমন: ৫০০' : 'e.g. 500'}
                    value={addDueAmount}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                        val = val.replace(/^0+/, '');
                      }
                      setAddDueAmount(val);
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans"
                    id="add-due-amount"
                  />
                </div>

                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'মালের নাম বা বিবরণ (ঐচ্ছিক)' : 'Details / Product (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBangla ? 'যেমন: পূর্বের বাকি বা পণ্য ক্রয়ের বিবরণ' : 'e.g. Previous dues or details'}
                    value={addDueProduct}
                    onChange={(e) => setAddDueProduct(e.target.value)}
                    onFocus={() => setShowAddDueProductSuggestions(true)}
                    onBlur={() => setShowAddDueProductSuggestions(false)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    id="add-due-product-details"
                  />
                  {showAddDueProductSuggestions && filteredAddDueProductSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-md z-50 max-h-48 overflow-y-auto">
                      {filteredAddDueProductSuggestions.map((item, index) => (
                        <div
                          key={index}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectAddDueProductSuggestion(item.name);
                          }}
                          className="px-3 py-2 hover:bg-rose-50/50 cursor-pointer border-b border-slate-50 last:border-b-0 flex items-center justify-between transition-all"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800">{item.name}</span>
                          </div>
                          <span className="text-[10px] text-rose-600 font-bold">
                            {isBangla ? 'বসান' : 'Apply'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddDueModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs text-white font-bold bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm cursor-pointer"
                    id="add-due-submit-btn"
                  >
                    {isBangla ? 'হিসাবভুক্ত করুন' : 'Add Due'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD OUT OF STOCK ITEM MODAL --- */}
      <AnimatePresence>
        {isOutOfStockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOutOfStockModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="oos-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  {isBangla ? 'দোকানে যে মাল নেই তা লিখুন' : 'Add Out Of Stock Item'}
                </h3>
                <button
                  onClick={() => setIsOutOfStockModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddOutOfStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'মালের নাম' : 'Goods Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isBangla ? 'যেমন: লাক্স সাবান, সয়াবিন ১ লিটার' : 'e.g. Lux Soap, Soybean 1L'}
                    value={oosItemName}
                    onChange={(e) => setOosItemName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    id="oos-item-name-input"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsOutOfStockModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs text-white font-bold bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm cursor-pointer"
                    id="oos-submit-btn"
                  >
                    {isBangla ? 'তালিকায় যোগ করুন' : 'Add to List'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- ADD PRODUCT RATE MODAL --- */}
      <AnimatePresence>
        {isProductRateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductRateModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="product-rate-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-pulse"></span>
                  {isBangla ? 'মালের রেট ও কেনা দাম' : 'Add Product Buying Rate'}
                </h3>
                <button
                  onClick={() => setIsProductRateModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddProductRate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'মালের নাম' : 'Product Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isBangla ? 'যেমন: পেঁয়াজ (১ কেজি), মিনিকেট চাল ৫০ কেজি' : 'e.g. Onion (1kg), Rice 50kg'}
                    value={rateItemName}
                    onChange={(e) => setRateItemName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    id="rate-item-name-input"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'কেনা দাম (টাকা)' : 'Buying Price (৳)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder={isBangla ? 'যেমন: ১২০' : 'e.g. 120'}
                    value={rateItemPrice}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                        val = val.replace(/^0+/, '');
                      }
                      setRateItemPrice(val);
                    }}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                    id="rate-item-price-input"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {isBangla ? 'কীওয়ার্ড / ট্যাগ (কমা দিয়ে আলাদা করুন)' : 'Keywords / Tags (comma separated)'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBangla ? 'যেমন: আলু, লাল আলু, potato' : 'e.g. potato, red potato'}
                    value={rateItemKeywords}
                    onChange={(e) => setRateItemKeywords(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    id="rate-item-keywords-input"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsProductRateModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs text-white font-bold bg-sky-600 hover:bg-sky-500 rounded-lg shadow-sm cursor-pointer"
                    id="rate-submit-btn"
                  >
                    {isBangla ? 'সংরক্ষণ করুন' : 'Save Rate'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PRODUCT PROFIT CALCULATOR MODAL --- */}
      <AnimatePresence>
        {activeProfitCalcProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveProfitCalcProduct(null)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="profit-calc-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  {isBangla ? 'লাভ ও বিক্রয় মূল্য হিসাব' : 'Profit & Selling Price Calc'}
                </h3>
                <button
                  onClick={() => setActiveProfitCalcProduct(null)}
                  className="text-slate-400 hover:text-slate-650 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Product Name (Loaded automatically) */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isBangla ? 'পণ্যের নাম' : 'Product Name'}
                  </span>
                  <div className="text-xs font-extrabold text-slate-800 mt-0.5 p-2 bg-slate-50 rounded-lg">
                    {activeProfitCalcProduct.name}
                  </div>
                </div>

                {/* Buying Price (Loaded automatically) */}
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {isBangla ? 'কিনা দাম' : 'Buying Price (Cost)'}
                  </span>
                  <div className="text-sm font-black text-slate-950 font-sans mt-0.5 p-2.5 bg-sky-50/50 text-sky-900 border border-sky-100 rounded-xl flex items-center justify-between">
                    <span>{formatCurrency(activeProfitCalcProduct.buyingPrice, isBangla)}</span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full uppercase">
                      {isBangla ? 'স্বয়ংক্রিয়' : 'Auto'}
                    </span>
                  </div>
                </div>

                {/* Profit Amount Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex justify-between items-center">
                    <span>{isBangla ? 'লাভের টাকা (বসুন)' : 'Profit Amount (Input)'}</span>
                    <span className="text-[10px] text-emerald-600 font-bold">
                      {isBangla ? '+ লাভ যোগ' : '+ Add Profit'}
                    </span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-sans text-xs font-bold">৳</span>
                    <input
                      type="number"
                      step="any"
                      placeholder={isBangla ? 'লাভের পরিমাণ বসান...' : 'Enter profit amount...'}
                      value={profitInput}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                          val = val.replace(/^0+/, '');
                        }
                        setProfitInput(val);
                      }}
                      className="w-full text-xs pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold font-sans"
                      id="profit-amount-input"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Selling Price Calculation Result Card */}
                {(() => {
                  const profitVal = parseFloat(profitInput) || 0;
                  const buyingPriceVal = activeProfitCalcProduct.buyingPrice;
                  const totalSellingPrice = buyingPriceVal + profitVal;
                  const profitPercent = buyingPriceVal > 0 ? (profitVal / buyingPriceVal) * 100 : 0;

                  return (
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold border-b border-dashed border-emerald-100 pb-2">
                        <span>{isBangla ? 'কিনা দাম:' : 'Cost Price:'}</span>
                        <span className="font-sans font-bold text-slate-800">{formatCurrency(buyingPriceVal, isBangla)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600 font-semibold border-b border-dashed border-emerald-100 pb-2">
                        <span>{isBangla ? 'লাভের টাকা:' : 'Profit:'}</span>
                        <span className="font-sans font-bold text-emerald-700">
                          {profitVal > 0 ? `+ ${formatCurrency(profitVal, isBangla)}` : formatCurrency(0, isBangla)}
                        </span>
                      </div>
                      {profitVal > 0 && (
                        <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600">
                          <span>{isBangla ? 'লাভের শতকরা হার:' : 'Profit Percentage:'}</span>
                          <span className="font-sans bg-emerald-100/60 px-2 py-0.5 rounded-full">
                            {isBangla ? toBanglaNumber(profitPercent.toFixed(1)) : profitPercent.toFixed(1)}%
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-extrabold text-slate-800">{isBangla ? 'বিক্রয় মূল্য (কাস্টমার রেট):' : 'Selling Price:'}</span>
                        <span className="text-base font-black text-emerald-800 font-sans">
                          {formatCurrency(totalSellingPrice, isBangla)}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Close Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveProfitCalcProduct(null)}
                    className="w-full py-2.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors font-bold rounded-xl cursor-pointer text-center"
                  >
                    {isBangla ? 'বন্ধ করুন' : 'Close'}
                  </button>
                </div>
              </div>
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
                        topSellingProducts.find(p => p.name.toLowerCase() === selectedProductForDetail.toLowerCase())?.amount || 0,
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
                        ? `${toBanglaNumber(topSellingProducts.find(p => p.name.toLowerCase() === selectedProductForDetail.toLowerCase())?.count || 0)} বার`
                        : `${topSellingProducts.find(p => p.name.toLowerCase() === selectedProductForDetail.toLowerCase())?.count || 0} times`}
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

      {/* --- RESTORE CHOICE MODAL OVERLAY --- */}
      <AnimatePresence>
        {isRestoreChoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRestoreChoiceModalOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden"
              id="restore-choice-modal"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <FileUp className="h-4.5 w-4.5 text-indigo-600" />
                  <span>{isBangla ? 'ব্যাকআপ রিস্টোর করুন' : 'Restore Backup'}</span>
                </h3>
                <button
                  onClick={() => setIsRestoreChoiceModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  {isBangla 
                    ? 'আপনার ফোনে পূর্বে সংরক্ষণ করা একটি লোকাল ব্যাকআপ পাওয়া গেছে। আপনি কিভাবে ডাটা রিস্টোর করতে চান?' 
                    : 'A previously saved local backup was found on your phone memory. How would you like to restore?'}
                </p>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleRestoreFromLocalMemory}
                    className="w-full py-3 px-4 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                  >
                    <Smartphone className="h-4 w-4 text-teal-600" />
                    <span>{isBangla ? 'ফোনের মেমোরি ব্যাকআপ থেকে রিস্টোর' : 'Restore from Phone Memory'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-3 px-4 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
                  >
                    <FileJson className="h-4 w-4 text-indigo-600" />
                    <span>{isBangla ? 'ব্যাকআপ ফাইল (.json) আপলোড' : 'Upload JSON Backup File'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRestoreChoiceModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer font-bold"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                </div>
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
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/60 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 py-2 pb-4">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1.5 text-center">
          <button
            onClick={() => setCurrentNavTab('home')}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 py-2 px-1 rounded-2xl cursor-pointer w-full border ${
              currentNavTab === 'home'
                ? 'text-indigo-600 bg-indigo-50 border-indigo-100 shadow-3xs font-bold scale-102'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent'
            }`}
          >
            <Home className={`h-5 w-5 transition-transform duration-300 ${currentNavTab === 'home' ? 'scale-105 stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] font-black truncate w-full text-center">
              {isBangla ? 'হোম' : 'Home'}
            </span>
          </button>

          <button
            onClick={() => setCurrentNavTab('info')}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 py-2 px-1 rounded-2xl cursor-pointer w-full border ${
              currentNavTab === 'info'
                ? 'text-amber-600 bg-amber-50 border-amber-100 shadow-3xs font-bold scale-102'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent'
            }`}
            id="info-nav-tab"
          >
            <Info className={`h-5 w-5 transition-transform duration-300 ${currentNavTab === 'info' ? 'scale-105 stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] font-black truncate w-full text-center">
              {isBangla ? 'সার্ভিস' : 'Service'}
            </span>
          </button>

          <button
            onClick={() => setCurrentNavTab('monthly')}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 py-2 px-1 rounded-2xl cursor-pointer w-full border ${
              currentNavTab === 'monthly'
                ? 'text-emerald-600 bg-emerald-50 border-emerald-100 shadow-3xs font-bold scale-102'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent'
            }`}
          >
            <Database className={`h-5 w-5 transition-transform duration-300 ${currentNavTab === 'monthly' ? 'scale-105 stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] font-black truncate w-full text-center">
              {isBangla ? 'রিপোর্ট' : 'Report'}
            </span>
          </button>

          <button
            onClick={() => setCurrentNavTab('settings')}
            className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 py-2 px-1 rounded-2xl cursor-pointer w-full border ${
              currentNavTab === 'settings'
                ? 'text-rose-600 bg-rose-50 border-rose-100 shadow-3xs font-bold scale-102'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border-transparent'
            }`}
          >
            <SettingsIcon className={`h-5 w-5 transition-transform duration-300 ${currentNavTab === 'settings' ? 'scale-105 stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] font-black truncate w-full text-center">
              {isBangla ? 'সেটিংস' : 'Settings'}
            </span>
          </button>
        </div>
      </div>

      {/* Footer credits and copyright */}
      <footer className="bg-white border-t border-slate-200/80 py-5 text-center mt-auto">
        <p className="text-xs text-slate-400">
          {isBangla 
            ? 'হিসাব খাতা © ২০২৬ • ব্যবস্থাপনাকারী: জনি দত্ত' 
            : 'Hisab Khata © 2026 • Managed by: Jony Datta'}
        </p>
      </footer>

      {/* --- CUSTOM CONFIRMATION MODAL --- */}
      <AnimatePresence>
        {confirmModal && confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal(null)}
              className="fixed inset-0 bg-black shadow-lg"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden border border-slate-100 p-6 flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <RotateCcw className="h-5 w-5 animate-[spin_3s_linear_infinite]" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-none">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  {isBangla ? 'না' : 'No'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  {isBangla ? 'হ্যাঁ' : 'Yes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

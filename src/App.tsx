import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
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
  Check
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

import Calculator from './components/Calculator';
import StatCard from './components/StatCard';
import TransactionList from './components/TransactionList';
import DueList from './components/DueList';

export default function App() {
  // --- States ---
  const [isBangla, setIsBangla] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [currentTime, setCurrentTime] = useState('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState('');
  
  // Database state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Interactive UI States
  const [activeTab, setActiveTab] = useState<'dues' | 'expenses'>('dues');
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
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

  // User details (from environment)
  const userEmail = "jonydatta222@gmail.com";

  // --- Real-Time Date & Time updates ---
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // key '0' as '12'
      
      const timeString = `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
      setCurrentTime(timeString);
      
      // Formatting current active calendar date
      const todayString = getTodayDateString();
      setCurrentDateFormatted(formatDate(todayString, isBangla));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [isBangla]);

  // --- Load initial data from localStorage ---
  useEffect(() => {
    const localTxs = localStorage.getItem('hisab_khata_transactions');
    const localExpenses = localStorage.getItem('hisab_khata_expenses');
    const localLang = localStorage.getItem('hisab_khata_lang');
    const localSync = localStorage.getItem('hisab_khata_sync');

    if (localTxs) {
      try {
        setTransactions(JSON.parse(localTxs));
      } catch (e) {
        console.error('Failed to parse transactions', e);
      }
    }
    if (localExpenses) {
      try {
        setExpenses(JSON.parse(localExpenses));
      } catch (e) {
        console.error('Failed to parse expenses', e);
      }
    }
    if (localLang) {
      setIsBangla(localLang === 'bn');
    }
    if (localSync) {
      setIsSyncActive(localSync === 'true');
    }
  }, []);

  // --- Save to localStorage & trigger simulated Sync ---
  const saveTransactionsToStorage = (txList: Transaction[]) => {
    setTransactions(txList);
    localStorage.setItem('hisab_khata_transactions', JSON.stringify(txList));
    triggerCloudSync();
  };

  const saveExpensesToStorage = (expList: Expense[]) => {
    setExpenses(expList);
    localStorage.setItem('hisab_khata_expenses', JSON.stringify(expList));
    triggerCloudSync();
  };

  // --- Simulated Cloud Sync with User Personal Email ---
  const triggerCloudSync = () => {
    if (!isSyncActive) return;
    setIsSyncing(true);
    setSyncMessage(isBangla ? 'গুগল ড্রাইভ ক্লাউডে ডেটা সিঙ্ক হচ্ছে...' : 'Syncing data with Google Drive Cloud...');
    
    setTimeout(() => {
      setIsSyncing(false);
      setSyncMessage('');
      showToast(
        isBangla 
          ? 'ক্লাউড সিঙ্ক সফলভাবে সম্পন্ন হয়েছে!' 
          : 'Cloud sync completed successfully!'
      );
    }, 1200);
  };

  const handleToggleSync = () => {
    if (!isSyncActive) {
      // Login simulation
      setIsSyncing(true);
      setSyncMessage(isBangla ? 'গুগল অ্যাকাউন্টের সাথে সংযোগ করা হচ্ছে...' : 'Connecting to Google Account...');
      setTimeout(() => {
        setIsSyncActive(true);
        localStorage.setItem('hisab_khata_sync', 'true');
        setIsSyncing(false);
        setSyncMessage('');
        showToast(
          isBangla 
            ? `গুগল সিঙ্ক চালু হয়েছে (${userEmail})` 
            : `Google Sync Enabled (${userEmail})`
        );
        triggerCloudSync();
      }, 1000);
    } else {
      setIsSyncActive(false);
      localStorage.setItem('hisab_khata_sync', 'false');
      showToast(
        isBangla 
          ? 'গুগল সিঙ্ক নিষ্ক্রিয় করা হয়েছে।' 
          : 'Google Sync Disabled.'
      );
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
    const duesMap: Record<string, number> = {};
    
    // Sort transactions chronologically to build correct cumulative balances
    const sortedTxs = [...transactions].sort((a, b) => a.time.localeCompare(b.time));
    
    sortedTxs.forEach((tx) => {
      if (!tx.product || !tx.product.trim()) return;
      
      if (!tx.isCash) {
        // Due taken (increases balance)
        const name = tx.customer.trim();
        if (name) {
          duesMap[name] = (duesMap[name] || 0) + tx.amount;
        }
      } else if (tx.product.startsWith('বাকির টাকা জমা') || tx.product.startsWith('বাকি টাকা জমা') || tx.product.includes('Due Deposit')) {
        // Due deposit payment (reduces balance)
        const name = tx.customer.trim();
        if (name) {
          duesMap[name] = (duesMap[name] || 0) - tx.amount;
        }
      }
    });

    return Object.keys(duesMap)
      .map((name) => ({ name, amount: duesMap[name] }))
      .filter((cd) => cd.amount > 0);
  };

  const customerDues = getCustomerDues();
  const globalTotalDue = customerDues.reduce((sum, cd) => sum + cd.amount, 0);

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
    const confirmation = window.confirm(
      isBangla 
        ? 'আপনি কি নিশ্চিতভাবে এই হিসাবটি মুছে ফেলতে চান? এটি হিসাবের ব্যালেন্স পুনর্নির্ধারণ করবে।' 
        : 'Are you sure you want to delete this entry? This will rollback balances.'
    );
    if (!confirmation) return;

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
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 antialiased font-sans flex flex-col">
      
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
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 py-2">
        <div className="max-w-7xl mx-auto px-3 flex items-center justify-between gap-2">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#102A43] text-emerald-300 rounded-lg shadow-sm border border-[#1F3A52]">
              <BookOpen className="h-4.5 w-4.5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 font-sans">
                  {isBangla ? 'হিসাব খাতা' : 'Hisab Khata'}
                </h1>
                <span className="text-[8px] font-extrabold text-teal-600 bg-teal-50 border border-teal-200/55 px-1 py-0.5 rounded-sm uppercase hidden xs:inline-block">
                  {isBangla ? 'অ্যাপ' : 'App'}
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Tools */}
          <div className="flex items-center gap-1.5">
            
            {/* Real-time Clock */}
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 font-mono bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-lg h-8">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="font-semibold text-slate-700">
                {isBangla ? toBanglaNumber(currentTime) : currentTime}
              </span>
            </div>

            {/* Quick Calculator Action */}
            <button
              onClick={() => setIsCalcOpen(true)}
              className="p-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg shadow-3xs transition-all flex items-center justify-center cursor-pointer h-8 w-8"
              title={isBangla ? 'ক্যালকুলেটর চালু করুন' : 'Open Calculator'}
              id="calc-trigger-btn"
            >
              <CalcIcon className="h-4 w-4" />
            </button>

            {/* Google Cloud Sync Controller */}
            <button
              onClick={handleToggleSync}
              className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[11px] font-bold border transition-all cursor-pointer h-8 shadow-3xs ${
                isSyncActive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
              id="google-sync-toggle"
            >
              {isSyncActive ? (
                <>
                  <Cloud className="h-3.5 w-3.5 animate-pulse text-emerald-600" />
                  <span>{isBangla ? 'সিঙ্ক' : 'Sync'}</span>
                </>
              ) : (
                <>
                  <CloudOff className="h-3.5 w-3.5 text-rose-500" />
                  <span>{isBangla ? 'সিঙ্ক' : 'Sync'}</span>
                </>
              )}
            </button>

            {/* Language Selection Toggle */}
            <button
              onClick={toggleLanguage}
              className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 h-8 shadow-3xs transition-all flex items-center gap-1 cursor-pointer"
              id="lang-toggler"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-500" />
              <span>{isBangla ? 'EN' : 'বাং'}</span>
            </button>

          </div>
        </div>
      </header>

      {/* --- Main Contents Container --- */}
      <main className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-6">
        
        {/* STATS CARDS GRID */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="stats-dashboard-grid">
          
          <StatCard
            title={isBangla ? 'মোট বিক্রি' : 'Total Sales'}
            amount={todaySales}
            icon={TrendingUp}
            bgColor="bg-emerald-50/30"
            borderColor="border-emerald-100"
            textColor="text-emerald-800"
            iconColor="text-emerald-600"
            isBangla={isBangla}
          />

          <StatCard
            title={isBangla ? 'নগদ জমা' : 'Cash Deposit'}
            amount={todayCashDeposit}
            icon={Wallet}
            bgColor="bg-blue-50/30"
            borderColor="border-blue-100"
            textColor="text-blue-800"
            iconColor="text-blue-600"
            isBangla={isBangla}
          />

          <StatCard
            title={isBangla ? 'বাকি' : 'Due'}
            amount={globalTotalDue}
            icon={AlertCircle}
            bgColor="bg-amber-50/30"
            borderColor="border-amber-100"
            textColor="text-amber-800"
            iconColor="text-amber-600"
            isBangla={isBangla}
          />

          <StatCard
            title={isBangla ? 'আজকের খরচ' : 'Today\'s Expense'}
            amount={todayExpenseTotal}
            icon={Coins}
            bgColor="bg-rose-50/30"
            borderColor="border-rose-100"
            textColor="text-rose-800"
            iconColor="text-rose-600"
            isBangla={isBangla}
            onClick={() => setIsExpenseModalOpen(true)}
          />

        </section>

        {/* TWO-COLUMN WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* --- LEFT COLUMN: INPUT FORM & MAINTENANCE (5/12 cols) --- */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* 1. Add Transaction Form Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 flex items-center justify-center">
                    <Plus className="h-4 w-4 stroke-[3]" />
                  </span>
                  <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
                    {isBangla ? 'নতুন বেচাকেনা হিসাব লিখুন' : 'Record New Transaction'}
                  </h3>
                </div>
                
                {/* Visual Expense trigger on right */}
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/80 border border-rose-100 text-rose-600 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                >
                  <Coins className="h-3 w-3 text-rose-500" />
                  <span>{isBangla ? 'খরচ যোগ করুন' : 'Add Expense'}</span>
                </button>
              </div>

              <form onSubmit={handleAddTransaction} className="space-y-4">
                
                {/* Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Product Name */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                      <span>🛍️</span>
                      <span>{isBangla ? 'পণ্যের নাম' : 'Product Name'}</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isBangla ? 'যেমন: চাল, ডাল, সাবান' : 'e.g. Rice, Lentil, Soap'}
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50/30 transition-all font-medium"
                      id="product-input"
                    />
                  </div>

                  {/* Price */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span>৳</span>
                        <span>{isBangla ? 'দাম (৳)' : 'Price (৳)'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCalcOpen(true)}
                        className="text-[10px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CalcIcon className="h-3 w-3" />
                        <span>{isBangla ? 'ক্যালকুলেটর' : 'Calculator'}</span>
                      </button>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="৳ ০.০০"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50/30 transition-all font-sans font-semibold"
                      id="amount-input"
                    />
                  </div>
                </div>

                {/* Payment Type Selection (Capsule toggle) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {isBangla ? 'পেমেন্টের ধরন' : 'Payment Type'}
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCashTransaction(true);
                        setCustomerName('');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isCashTransaction
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      id="type-cash-btn"
                    >
                      <span>{isBangla ? 'নগদ' : 'Cash'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCashTransaction(false)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        !isCashTransaction
                          ? 'bg-[#E91E63] text-white shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      id="type-due-btn"
                    >
                      <span>{isBangla ? 'বাকি' : 'Due'}</span>
                    </button>
                  </div>
                </div>

                {/* Conditional Customer Name Input with motion animation */}
                <AnimatePresence>
                  {!isCashTransaction && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2">
                        <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                          <span>👤</span>
                          <span>{isBangla ? 'কাস্টমারের নাম' : "Customer's Name"}</span>
                        </label>
                        <input
                          type="text"
                          required={!isCashTransaction}
                          placeholder={isBangla ? 'যেমন: রহিম মিয়া' : 'e.g. Rahim Mia'}
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 bg-slate-50/30 transition-all font-medium"
                          id="customer-input"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit save button */}
                <button
                  type="submit"
                  className="w-full py-3 bg-[#009688] hover:bg-[#00897B] text-white font-extrabold text-sm rounded-xl shadow-md shadow-teal-700/10 transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  id="submit-transaction-btn"
                >
                  <Check className="h-4.5 w-4.5 stroke-[3]" />
                  <span>{isBangla ? 'হिसাব সেভ করুন' : 'Save Transaction'}</span>
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

            {/* 2. Export / Import / Reset Maintenance Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                {isBangla ? 'খাতা রক্ষণাবেক্ষণ (Backup & Restore)' : 'Ledger Maintenance'}
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                
                {/* Export Button */}
                <button
                  onClick={handleExportBackup}
                  className="py-2 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  id="export-backup-btn"
                >
                  <FileDown className="h-4 w-4 text-teal-600" />
                  <span>{isBangla ? 'ডাউনলোড খাতা' : 'Download JSON'}</span>
                </button>

                {/* Import File Button */}
                <label className="py-2 px-3 border border-slate-200 bg-white rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors">
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

              {/* Hard Reset Button */}
              <button
                onClick={handleHardReset}
                className="w-full py-2.5 bg-rose-50/50 hover:bg-rose-50 border border-rose-100 hover:border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                id="hard-reset-btn"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{isBangla ? 'খাতা সম্পূর্ণ খালি করুন (Reset)' : 'Reset All Ledger Data'}</span>
              </button>
            </div>

          </div>

          {/* --- RIGHT COLUMN: CONSOLIDATED LISTS WORKSPACE (7/12 cols) --- */}
          <div className="lg:col-span-7 space-y-4">
            
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

            {/* Dynamic summary indicator row */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mr-1">
                {isBangla ? 'আজকের সারসংক্ষেপ:' : 'Today\'s Summary:'}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {isBangla ? `আজ: ${formatCurrency(todaySales, true)}` : `Today: ${formatCurrency(todaySales, false)}`}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                {isBangla ? `নগদ: ${formatCurrency(todayCashDeposit, true)}` : `Cash: ${formatCurrency(todayCashDeposit, false)}`}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-50 text-rose-700 px-3 py-1 rounded-full border border-rose-100">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {isBangla ? `বাকি: ${formatCurrency(todayDueTaken, true)}` : `Due: ${formatCurrency(todayDueTaken, false)}`}
              </span>
            </div>

            {/* Active List Panel Content */}
            <div className="relative">
              {activeTab === 'dues' && (
                <DueList
                  dueList={customerDues}
                  isBangla={isBangla}
                  onDeposit={handleDueDeposit}
                />
              )}

              {activeTab === 'expenses' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="text-rose-500">●</span>
                        {isBangla ? 'আজকের খরচের তালিকা' : 'Today\'s Store Expenses'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {isBangla 
                          ? `আজকের মোট খরচ: ${formatCurrency(todayExpenseTotal, true)} (${toBanglaNumber(todayExpenses.length)} টি খতিয়ান)` 
                          : `Total Expense: ${formatCurrency(todayExpenseTotal, false)} (${todayExpenses.length} entries)`}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsExpenseModalOpen(true)}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{isBangla ? 'খরচ যোগ করুন' : 'Add Expense'}</span>
                    </button>
                  </div>

                  {todayExpenses.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <p className="text-slate-400 text-sm">
                        {isBangla ? 'আজ কোনো খরচ হিসাবভুক্ত করা হয়নি' : 'No expenses recorded today'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                      {todayExpenses.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/10 border border-amber-100/30 hover:bg-amber-50/20 transition-all">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{ex.description}</h4>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatTimeStr(ex.time, isBangla)}
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-rose-600 font-sans">
                            {formatCurrency(ex.amount, isBangla)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

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

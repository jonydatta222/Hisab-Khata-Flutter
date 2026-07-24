import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Landmark, Coins, X, Check, Edit2, Trash2, Clock, User, History, Calendar } from 'lucide-react';
import { CustomerDue, Transaction } from '../types';
import { formatCurrency, toBanglaNumber, formatDate, formatTimeStr, toEnglishNumber, isTransactionRepayment } from '../utils';

interface DueListProps {
  dueList: CustomerDue[];
  isBangla: boolean;
  onDeposit: (customerName: string, amount: number) => void;
  onDelete: (customerName: string) => void;
  onRename: (oldName: string, newName: string, newAmount?: number) => void;
  onViewDetail?: (customerName: string) => void;
  transactions?: Transaction[];
  onDeleteTransaction?: (id: string) => void;
}

function DueList({ 
  dueList, 
  isBangla, 
  onDeposit, 
  onDelete, 
  onRename, 
  onViewDetail,
  transactions = [],
  onDeleteTransaction
}: DueListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'history'>('customers');
  const [depositingCustomer, setDepositingCustomer] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [newNameValue, setNewNameValue] = useState<string>('');
  const [newAmountValue, setNewAmountValue] = useState<string>('');
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null);
  const [deletingDepositId, setDeletingDepositId] = useState<string | null>(null);

  // Pagination / slice sizes to optimize DOM and rendering
  const [visibleDuesCount, setVisibleDuesCount] = useState(20);
  const [visibleDepositsCount, setVisibleDepositsCount] = useState(20);

  // Reset pagination counters on tab or search input modifications to maintain snappiness
  React.useEffect(() => {
    setVisibleDuesCount(20);
    setVisibleDepositsCount(20);
  }, [searchTerm, activeSubTab]);

  // --- Prevent background scroll when any local overlay modal is open ---
  React.useEffect(() => {
    const isLocalModalOpen = !!depositingCustomer || !!editingCustomer || !!deletingCustomer || !!deletingDepositId;
    if (isLocalModalOpen) {
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
  }, [depositingCustomer, editingCustomer, deletingCustomer, deletingDepositId]);

  const filteredDues = dueList.filter((cd) => 
    cd.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstandingDue = dueList.reduce((sum, item) => sum + item.amount, 0);

  // Extract all baki deposit transactions
  const depositTxs = React.useMemo(() => {
    return (transactions || [])
      .filter((tx) => isTransactionRepayment(tx))
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });
  }, [transactions]);

  const filteredDeposits = React.useMemo(() => {
    return depositTxs.filter((tx) => 
      tx.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.product.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [depositTxs, searchTerm]);

  const totalDeposited = depositTxs.reduce((sum, item) => sum + item.amount, 0);

  const startDeposit = (customer: CustomerDue) => {
    setDepositingCustomer(customer.name);
    setEditingCustomer(null);
    setDeletingCustomer(null);
    setDepositAmount('');
    setErrorMsg('');
  };

  const cancelDeposit = () => {
    setDepositingCustomer(null);
    setDepositAmount('');
    setErrorMsg('');
  };

  const startRename = (customer: CustomerDue) => {
    setEditingCustomer(customer.name);
    setNewNameValue(customer.name);
    setNewAmountValue(customer.amount.toString());
    setDepositingCustomer(null);
    setDeletingCustomer(null);
  };

  const cancelRename = () => {
    setEditingCustomer(null);
    setNewNameValue('');
    setNewAmountValue('');
  };

  const handleRenameSubmit = (oldName: string) => {
    if (!newNameValue.trim()) return;
    const parsedAmount = parseFloat(toEnglishNumber(newAmountValue));
    onRename(oldName, newNameValue.trim(), isNaN(parsedAmount) ? undefined : parsedAmount);
    setEditingCustomer(null);
    setNewNameValue('');
    setNewAmountValue('');
  };

  const startDeleteConfirm = (customer: CustomerDue) => {
    setDeletingCustomer(customer.name);
    setDepositingCustomer(null);
    setEditingCustomer(null);
  };

  const handleDepositSubmit = (customerName: string, maxDue: number) => {
    const amt = parseFloat(toEnglishNumber(depositAmount));
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg(isBangla ? 'সঠিক টাকা লিখুন' : 'Enter a valid amount');
      return;
    }
    if (amt > maxDue) {
      setErrorMsg(
        isBangla 
          ? `সর্বোচ্চ ${formatCurrency(maxDue, true)} জমা করা যাবে` 
          : `Cannot deposit more than ${formatCurrency(maxDue, false)}`
      );
      return;
    }

    onDeposit(customerName, amt);
    cancelDeposit();
  };

  const headerTitle = activeSubTab === 'customers'
    ? ''
    : (isBangla ? 'বকেয়া জমার খতিয়ান (ইতিহাস)' : 'Due Deposit History Ledger');

  const headerSubtext = activeSubTab === 'customers'
    ? (isBangla 
        ? `সর্বমোট বকেয়া: ${formatCurrency(totalOutstandingDue, true)} (${toBanglaNumber(filteredDues.length)} জন ক্রেতা)` 
        : `Total Outstanding: ${formatCurrency(totalOutstandingDue, false)} (${filteredDues.length} customers)`)
    : (isBangla
        ? `সর্বমোট জমা: ${formatCurrency(totalDeposited, true)} (${toBanglaNumber(depositTxs.length)} বার জমা)`
        : `Total Deposited: ${formatCurrency(totalDeposited, false)} (${depositTxs.length} payments)`);

  const searchPlaceholder = activeSubTab === 'customers'
    ? (isBangla ? 'ক্রেতার নাম খুঁজুন...' : 'Search customer...')
    : (isBangla ? 'ক্রেতার নাম বা বিবরণ খুঁজুন...' : 'Search by name or desc...');

  return (
    <div className="flex-1 flex flex-col justify-between space-y-3">
      {/* Search Input matching 'পণ্য আছে/নেই' style */}
      <div>
        <input
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
        />
      </div>

      {/* Sub-Tabs Segmented Toggle Bar matching 'পণ্য আছে/নেই' style */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[10px] sm:text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('customers');
            setSearchTerm('');
          }}
          className={`flex-1 py-1.5 px-2 rounded-md text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'customers'
              ? 'bg-white dark:bg-slate-700 text-rose-900 dark:text-rose-200 shadow-3xs font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>{isBangla ? '১. গ্রাহকদের বাকির তালিকা' : '1. Customer Due List'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
            activeSubTab === 'customers' ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {isBangla ? toBanglaNumber(dueList.length) : dueList.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('history');
            setSearchTerm('');
          }}
          className={`flex-1 py-1.5 px-2 rounded-md text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-slate-700 text-emerald-900 dark:text-emerald-200 shadow-3xs font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>{isBangla ? '২. বকেয়া জমার ইতিহাস' : '2. Deposit History'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
            activeSubTab === 'history' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {isBangla ? toBanglaNumber(depositTxs.length) : depositTxs.length}
          </span>
        </button>
      </div>

      {/* Summary Row */}
      <div className="flex items-center justify-between text-xs px-1 font-bold text-slate-500 dark:text-slate-400">
        {activeSubTab === 'customers' ? (
          <>
            <span>{isBangla ? 'সর্বমোট বাকি:' : 'Total Outstanding:'}</span>
            <span className="text-rose-600 dark:text-rose-400 font-black font-sans">{formatCurrency(totalOutstandingDue, isBangla)}</span>
          </>
        ) : (
          <>
            <span>{isBangla ? 'সর্বমোট জমা:' : 'Total Deposited:'}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black font-sans">{formatCurrency(totalDeposited, isBangla)}</span>
          </>
        )}
      </div>

      {activeSubTab === 'customers' ? (
        filteredDues.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 flex-1 text-slate-400 dark:text-slate-500">
            <User className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold">
              {isBangla ? 'কোনো বকেয়া হিসাব পাওয়া যায়নি!' : 'No dues listed!'}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-1 no-scrollbar">
              {filteredDues.slice(0, visibleDuesCount).map((cd) => {
                const isPaidOff = cd.amount <= 0;
                return (
                  <div
                    key={cd.name}
                    onClick={() => onViewDetail?.(cd.name)}
                    title={isBangla ? 'বিস্তারিত খতিয়ান দেখতে ক্লিক করুন' : 'Click to view ledger'}
                    className={`flex items-center justify-between py-1 px-2 rounded-md border transition-all duration-150 cursor-pointer ${
                      isPaidOff
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-700/60'
                        : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800/40 hover:bg-rose-50/80 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-700/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h4 
                          className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 break-words whitespace-normal leading-tight group-hover:text-rose-600 dark:group-hover:text-rose-400"
                        >
                          {cd.name}
                        </h4>
                        {isPaidOff ? (
                          <span className="px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[7.5px] leading-none">
                            {isBangla ? 'পরিশোধিত' : 'Paid'}
                          </span>
                        ) : (
                          <span className="px-1 py-0.2 rounded bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 font-extrabold text-[7.5px] leading-none">
                            {isBangla ? 'বাকি' : 'Due'}
                          </span>
                        )}
                      </div>
                      <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-sans block mt-0.5">
                        {cd.lastDate ? `${isBangla ? 'সর্বশেষ: ' : 'Last: '}${formatDate(cd.lastDate, isBangla)}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`px-1.5 py-0.5 rounded font-mono text-[11px] font-black ${
                        isPaidOff 
                          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/60' 
                          : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-700/60'
                      }`}>
                        {formatCurrency(cd.amount, isBangla)}
                      </span>

                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        {!isPaidOff && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startDeposit(cd);
                            }}
                            className="px-1.5 py-0.5 rounded bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold text-[9.5px] flex items-center gap-0.5 transition-all cursor-pointer shadow-3xs active:scale-95"
                            title={isBangla ? 'জমা করুন' : 'Deposit'}
                          >
                            <Coins className="h-2.5 w-2.5" />
                            <span>{isBangla ? 'জমা' : 'Deposit'}</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(cd);
                          }}
                          className="p-0.5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                          title={isBangla ? 'সম্পাদনা' : 'Edit'}
                        >
                          <Edit2 className="h-2.5 w-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startDeleteConfirm(cd);
                          }}
                          className="p-0.5 hover:bg-rose-100/50 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                          title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDues.length > visibleDuesCount && (
              <div className="flex justify-center pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                <button
                  type="button"
                  onClick={() => setVisibleDuesCount(prev => prev + 20)}
                  className="px-4 py-1.5 text-xs font-bold text-rose-800 dark:text-rose-300 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 rounded-xl border border-rose-200/50 dark:border-rose-800/50 flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs active:scale-95 bg-white dark:bg-slate-800"
                >
                  <span>{isBangla ? 'আরও দেখুন' : 'See More'}</span>
                </button>
              </div>
            )}
          </div>
        )
      ) : (
        // DEPOSIT HISTORY VIEW
        filteredDeposits.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 flex-1 text-slate-400 dark:text-slate-500">
            <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold">
              {isBangla ? 'কোনো জমার হিসাব পাওয়া যায়নি!' : 'No deposits listed!'}
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div className="max-h-[380px] overflow-y-auto pr-1 space-y-1 no-scrollbar">
              {filteredDeposits.slice(0, visibleDepositsCount).map((tx) => {
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-1 px-2 rounded-md border transition-all duration-150 bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30 hover:border-emerald-200 dark:hover:border-emerald-700/60"
                  >
                    <div className="min-w-0 flex-1 pr-1.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        <h4 className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 break-words whitespace-normal leading-tight">{tx.customer}</h4>
                        <span className="px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[7.5px] leading-none">
                          {isBangla ? 'জমা' : 'Deposit'}
                        </span>
                      </div>
                      <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-sans block mt-0.5">
                        {formatDate(tx.date, isBangla)} • {formatTimeStr(tx.time, isBangla)} {tx.product ? `(${tx.product})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/60 font-mono text-[11px] font-black">
                        +{formatCurrency(tx.amount, isBangla)}
                      </span>

                      {onDeleteTransaction && (
                        <button
                          onClick={() => setDeletingDepositId(tx.id)}
                          className="p-0.5 hover:bg-rose-100/50 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                          title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredDeposits.length > visibleDepositsCount && (
              <div className="flex justify-center pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
                <button
                  type="button"
                  onClick={() => setVisibleDepositsCount(prev => prev + 20)}
                  className="px-4 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs active:scale-95 bg-white dark:bg-slate-800"
                >
                  <span>{isBangla ? 'আরও দেখুন' : 'See More'}</span>
                </button>
              </div>
            )}
          </div>
        )
      )}

      {/* Screen-level Overlay Modals for Smooth Popups */}
      <AnimatePresence>
        {/* 1. DEPOSIT MODAL */}
        {depositingCustomer && (() => {
          const cust = dueList.find(c => c.name === depositingCustomer);
          if (!cust) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={cancelDeposit}
                className="fixed inset-0 bg-black"
              />
              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 text-left space-y-4"
              >
                <button
                  onClick={cancelDeposit}
                  className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Coins className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                      {isBangla ? 'বকেয়া টাকা জমা করুন' : 'Record Due Payment'}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {isBangla ? `${cust.name}-এর হিসাব পরিশোধ জমা` : `Record deposit for ${cust.name}`}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-150 dark:border-slate-700/60 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {isBangla ? 'বর্তমান বকেয়া বাকি:' : 'Current Outstanding Due:'}
                  </span>
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400">
                    {formatCurrency(cust.amount, isBangla)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    {isBangla ? 'জমা টাকার পরিমাণ লিখুন' : 'Enter Deposit Amount'}
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-black text-slate-400 dark:text-slate-500 pointer-events-none">
                      {isBangla ? '৳' : '$'}
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={depositAmount}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                          val = val.replace(/^0+/, '');
                        }
                        setDepositAmount(val);
                        setErrorMsg('');
                      }}
                      autoFocus
                      className="w-full pl-8 pr-4 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-3xs"
                    />
                  </div>
                  {errorMsg && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-1">
                      <span>●</span> {errorMsg}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={cancelDeposit}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDepositSubmit(cust.name, cust.amount)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                  >
                    {isBangla ? 'জমা নিশ্চিত করুন' : 'Confirm Deposit'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}

        {/* 2. RENAME (EDIT) MODAL */}
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={cancelRename}
              className="fixed inset-0 bg-black"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 text-left space-y-4"
            >
              <button
                onClick={cancelRename}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Edit2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {isBangla ? 'ক্রেতার তথ্য সংশোধন' : 'Edit Customer Info'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {isBangla ? 'ক্রেতার নাম এবং বকেয়া টাকার পরিমাণ সংশোধন করুন' : 'Modify customer name and outstanding due amount'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    {isBangla ? 'নতুন নাম লিখুন' : 'Enter New Name'}
                  </label>
                  <input
                    type="text"
                    placeholder={isBangla ? 'ক্রেতার নাম লিখুন' : 'Customer name'}
                    value={newNameValue}
                    onChange={(e) => setNewNameValue(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-3xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    {isBangla ? 'বকেয়া টাকার পরিমাণ (৳)' : 'Outstanding Due Amount ($)'}
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={newAmountValue}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                        val = val.replace(/^0+/, '');
                      }
                      setNewAmountValue(val);
                    }}
                    className="w-full px-4 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-3xs font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelRename}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98"
                >
                  {isBangla ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => handleRenameSubmit(editingCustomer)}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                >
                  {isBangla ? 'সংরক্ষণ করুন' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. DELETE CONFIRMATION MODAL */}
        {deletingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingCustomer(null)}
              className="fixed inset-0 bg-black"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl z-50 text-left space-y-4"
            >
              <div className="flex justify-center">
                <span className="p-3.5 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-full">
                  <Trash2 className="h-6 w-6" />
                </span>
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                  {isBangla ? 'হিসাব মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Account Deletion'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed px-2">
                  {isBangla 
                    ? `আপনি কি নিশ্চিতভাবে "${deletingCustomer}"-এর সকল বকেয়া হিসাব মুছে ফেলতে চান? এই অ্যাকশনটি ফিরিয়ে নেওয়া যাবে না।` 
                    : `Are you sure you want to delete all outstanding dues for "${deletingCustomer}"? This action cannot be undone.`}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingCustomer(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98"
                >
                  {isBangla ? 'না, রাখুন' : 'No, Keep It'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(deletingCustomer);
                    setDeletingCustomer(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                >
                  {isBangla ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 4. DEPOSIT DELETE CONFIRMATION MODAL */}
        {deletingDepositId && (() => {
          const tx = depositTxs.find(t => t.id === deletingDepositId);
          if (!tx) return null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeletingDepositId(null)}
                className="fixed inset-0 bg-black"
              />
              {/* Modal Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl z-50 text-left space-y-4"
              >
                <div className="flex justify-center">
                  <span className="p-3.5 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 rounded-full">
                    <Trash2 className="h-6 w-6" />
                  </span>
                </div>

                <div className="text-center space-y-1.5">
                  <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                    {isBangla ? 'জমার হিসাব মুছে ফেলার নিশ্চিতকরণ' : 'Confirm Deposit Deletion'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed px-2">
                    {isBangla 
                      ? `আপনি কি নিশ্চিতভাবে "${tx.customer}"-এর ${formatCurrency(tx.amount, true)}-এর এই জমার হিসাবটি মুছে ফেলতে চান? এটি মুছে ফেললে বকেয়া বাকি টাকার পরিমাণ বৃদ্ধি পাবে।` 
                      : `Are you sure you want to delete the deposit of ${formatCurrency(tx.amount, false)} for "${tx.customer}"? This will increase their outstanding due balance.`}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeletingDepositId(null)}
                    className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteTransaction) {
                        onDeleteTransaction(deletingDepositId);
                      }
                      setDeletingDepositId(null);
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-98 shadow-sm"
                  >
                    {isBangla ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

const DueListMemo = React.memo(DueList);
export default DueListMemo;

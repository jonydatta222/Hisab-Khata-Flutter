import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Edit2, Trash2, Coins, Search, Wallet } from 'lucide-react';
import { Expense } from '../types';
import { formatCurrency, formatTimeStr, toBanglaNumber, isShopRentExpense } from '../utils';

interface ExpenseListProps {
  expenses: Expense[];
  isBangla: boolean;
  onDelete: (id: string) => void;
  onUpdate: (updated: Expense) => void;
  todayExpenseTotal: number;
}

function ExpenseList({
  expenses,
  isBangla,
  onDelete,
  onUpdate,
  todayExpenseTotal,
}: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'rent'>('all');
  const [visibleCount, setVisibleCount] = useState(20);

  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState<string>('');

  // Lock body scroll when a modal is open
  useEffect(() => {
    const isModalOpen = editingId !== null || deletingId !== null;
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.style.overflow = '';
      document.body.classList.remove('overflow-hidden');
    }
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('overflow-hidden');
    };
  }, [editingId, deletingId]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      const matchesSearch = ex.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (expenseFilter === 'rent') {
        return isShopRentExpense(ex.description);
      }
      return true;
    });
  }, [expenses, searchTerm, expenseFilter]);

  const nonDeductedCount = useMemo(() => {
    return expenses.filter(ex => isShopRentExpense(ex.description)).length;
  }, [expenses]);

  const startEditing = (ex: Expense) => {
    setEditingId(ex.id);
    setEditDesc(ex.description);
    setEditAmount(String(ex.amount));
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const handleUpdateSubmit = (id: string) => {
    const amt = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amt) || amt <= 0) return;
    const original = expenses.find((ex) => ex.id === id);
    if (!original) return;

    onUpdate({
      ...original,
      description: editDesc.trim(),
      amount: amt,
    });
    setEditingId(null);
  };

  return (
    <div className="flex-1 flex flex-col justify-between space-y-3">
      {/* Search Bar matching 'পণ্য আছে/নেই' style */}
      <div>
        <input
          type="text"
          placeholder={isBangla ? ' খরচের বিবরণ দিয়ে খুঁজুন...' : 'Search expenses...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
        />
      </div>

      {/* Filter Toggle Buttons matching 'পণ্য আছে/নেই' style */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[10px] sm:text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setExpenseFilter('all');
          }}
          className={`flex-1 py-1.5 px-2 rounded-md text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            expenseFilter === 'all'
              ? 'bg-white dark:bg-slate-700 text-emerald-900 dark:text-emerald-200 shadow-3xs font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Coins className="h-3.5 w-3.5" />
          <span>{isBangla ? '১. সকল খরচ' : '1. All Expenses'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
            expenseFilter === 'all' ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {isBangla ? toBanglaNumber(expenses.length) : expenses.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setExpenseFilter('rent');
          }}
          className={`flex-1 py-1.5 px-2 rounded-md text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            expenseFilter === 'rent'
              ? 'bg-white dark:bg-slate-700 text-amber-900 dark:text-amber-200 shadow-3xs font-extrabold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="h-3.5 w-3.5" />
          <span>{isBangla ? '২. বিয়োগ-মুক্ত খরচ' : '2. Non-Deducted'}</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
            expenseFilter === 'rent' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
          }`}>
            {isBangla ? toBanglaNumber(nonDeductedCount) : nonDeductedCount}
          </span>
        </button>
      </div>

      {/* Summary Row */}
      <div className="flex items-center justify-between text-xs px-1 font-bold text-slate-500 dark:text-slate-400">
        <span>{isBangla ? 'আজকের সর্বমোট খরচ:' : "Today's Total Expense:"}</span>
        <span className="text-rose-600 dark:text-rose-400 font-black font-sans">{formatCurrency(todayExpenseTotal, isBangla)}</span>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12 flex-1 text-slate-400 dark:text-slate-500">
          <Coins className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-semibold">
            {isBangla ? 'আজ কোনো খরচের হিসাব পাওয়া যায়নি!' : 'No expenses recorded today!'}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          <div className="max-h-[380px] overflow-y-auto pr-1 space-y-1 no-scrollbar">
            {filteredExpenses.slice(0, visibleCount).map((ex) => {
              const isNonDeducted = isShopRentExpense(ex.description);
              return (
                <div
                  key={ex.id}
                  className={`flex items-center justify-between py-1 px-2 rounded-md border transition-all duration-150 ${
                    isNonDeducted
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-100 dark:border-amber-800/40 hover:bg-amber-50/80 dark:hover:bg-amber-900/30 hover:border-amber-200 dark:hover:border-amber-700/60'
                      : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800/40 hover:bg-rose-50/80 dark:hover:bg-rose-900/30 hover:border-rose-200 dark:hover:border-rose-700/60'
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-1.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <h4 className="text-[11.5px] font-bold text-slate-800 dark:text-slate-100 break-words whitespace-normal leading-tight">
                        {ex.description}
                      </h4>
                      {isNonDeducted && (
                        <span className="px-1 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-extrabold text-[7.5px] leading-none">
                          {isBangla ? 'বিয়োগ-মুক্ত' : 'Non-deducted'}
                        </span>
                      )}
                    </div>
                    <span className="text-[8.5px] text-slate-400 dark:text-slate-500 font-sans block mt-0.5">
                      {isBangla ? 'সময়: ' : 'Time: '} {formatTimeStr(ex.time, isBangla)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-700/60 font-mono text-[11px] font-black">
                      {formatCurrency(ex.amount, isBangla)}
                    </span>

                    <button
                      onClick={() => startEditing(ex)}
                      className="p-0.5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors cursor-pointer"
                      title={isBangla ? 'সম্পাদনা' : 'Edit'}
                    >
                      <Edit2 className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(ex.id)}
                      className="p-0.5 hover:bg-rose-100/50 dark:hover:bg-rose-950/50 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors cursor-pointer"
                      title={isBangla ? 'মুছে ফেলুন' : 'Delete'}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredExpenses.length > visibleCount && (
            <div className="flex justify-center pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
              <button
                type="button"
                onClick={() => setVisibleCount(prev => prev + 20)}
                className="px-4 py-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs active:scale-95 bg-white dark:bg-slate-800"
              >
                <span>{isBangla ? 'আরও দেখুন' : 'See More'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- EDIT EXPENSE MODAL --- */}
      <AnimatePresence>
        {editingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={cancelEditing}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 text-left"
              id="edit-expense-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  {isBangla ? 'খরচ পরিবর্তন করুন' : 'Edit Expense Details'}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {isBangla ? 'খরচের বিবরণ' : 'Expense Description'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {isBangla ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}
                  </label>
                  <input
                    type="number"
                    required
                    value={editAmount}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                        val = val.replace(/^0+/, '');
                      }
                      setEditAmount(val);
                    }}
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 transition-all font-sans font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="px-4 py-2 text-xs font-black text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    {isBangla ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateSubmit(editingId!)}
                    className="px-5 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm cursor-pointer"
                  >
                    {isBangla ? 'সংরক্ষণ' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DELETE EXPENSE MODAL --- */}
      <AnimatePresence>
        {deletingId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 border border-slate-100 dark:border-slate-800 overflow-hidden z-50 text-left"
              id="delete-expense-modal-box"
            >
              <div className="flex items-start gap-3">
                <span className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-none">
                    {isBangla ? 'খরচ ডিলিট করুন' : 'Delete Expense'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    {isBangla 
                      ? 'আপনি কি নিশ্চিতভাবে এই খরচের হিসাবটি মুছে ফেলতে চান?' 
                      : 'Are you sure you want to delete this expense record?'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  {isBangla ? 'না' : 'No'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(deletingId!);
                    setDeletingId(null);
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

const ExpenseListMemo = React.memo(ExpenseList);
export default ExpenseListMemo;

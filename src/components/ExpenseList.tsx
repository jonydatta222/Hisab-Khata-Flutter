import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Edit2, Trash2, Check, X, Coins } from 'lucide-react';
import { Expense } from '../types';
import { formatCurrency, formatTimeStr, toBanglaNumber } from '../utils';

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
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState<string>('');

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
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-3xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-rose-500">●</span>
            {isBangla ? 'আজকের খরচের তালিকা' : "Today's Store Expenses"}
          </h3>
          <p className="text-xs text-slate-500">
            {isBangla
              ? `আজকের মোট খরচ: ${formatCurrency(todayExpenseTotal, true)} (${toBanglaNumber(expenses.length)} টি খতিয়ান)`
              : `Total Expense: ${formatCurrency(todayExpenseTotal, false)} (${expenses.length} entries)`}
          </p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
          <p className="text-slate-400 text-sm">
            {isBangla ? 'আজ কোনো খরচ হিসাবভুক্ত করা হয়নি' : 'No expenses recorded today'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {expenses.map((ex) => {
              return (
                <motion.div
                  key={ex.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3 rounded-xl border transition-all bg-amber-50/10 border-amber-100/30 hover:bg-amber-50/20"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                        <Coins className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate text-left" title={ex.description}>
                          {ex.description}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3 text-slate-300 animate-pulse" />
                          {formatTimeStr(ex.time, isBangla)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto sm:ml-0 shrink-0">
                      <span className="text-xs sm:text-sm font-extrabold text-rose-600 font-sans">
                        {formatCurrency(ex.amount, isBangla)}
                      </span>

                      <div className="flex items-center gap-1 border-l border-amber-100/60 pl-2">
                        <button
                          onClick={() => startEditing(ex)}
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          title={isBangla ? 'খরচ পরিবর্তন' : 'Edit Expense'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(ex.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title={isBangla ? 'খরচ মুছুন' : 'Delete Expense'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
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
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden z-50 text-left"
              id="edit-expense-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  {isBangla ? 'খরচ পরিবর্তন করুন' : 'Edit Expense Details'}
                </h3>
                <button
                  onClick={cancelEditing}
                  className="text-slate-400 hover:text-slate-650 transition-colors cursor-pointer text-xs font-bold p-1 hover:bg-slate-100 rounded-full"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {isBangla ? 'খরচের বিবরণ' : 'Expense Description'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 hover:bg-white focus:bg-white transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
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
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-slate-50 hover:bg-white focus:bg-white transition-all font-sans font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="px-4 py-2 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
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
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 border border-slate-100 overflow-hidden z-50 text-left"
              id="delete-expense-modal-box"
            >
              <div className="flex items-start gap-3">
                <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-none">
                    {isBangla ? 'খরচ ডিলিট করুন' : 'Delete Expense'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {isBangla 
                      ? 'আপনি কি নিশ্চিতভাবে এই খরচের হিসাবটি মুছে ফেলতে চান?' 
                      : 'Are you sure you want to delete this expense record?'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
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

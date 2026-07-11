import React, { useState } from 'react';
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

export default function ExpenseList({
  expenses,
  isBangla,
  onDelete,
  onUpdate,
  todayExpenseTotal,
}: ExpenseListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
              const isEditing = editingId === ex.id;

              return (
                <motion.div
                  key={ex.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3 rounded-xl border transition-all ${
                    isEditing
                      ? 'border-amber-500 bg-amber-50/10 shadow-inner'
                      : 'bg-amber-50/10 border-amber-100/30 hover:bg-amber-50/20'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            {isBangla ? 'খরচের বিবরণ' : 'Expense Description'}
                          </label>
                          <input
                            type="text"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            {isBangla ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}
                          </label>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => {
                              let val = e.target.value;
                              if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                                val = val.replace(/^0+/, '');
                              }
                              setEditAmount(val);
                            }}
                            className="w-full text-xs p-2 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white font-sans font-bold"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-amber-100">
                        <button
                          onClick={cancelEditing}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-150 rounded flex items-center gap-1 border border-slate-200 bg-white cursor-pointer font-bold"
                        >
                          <X className="h-3 w-3" />
                          <span>{isBangla ? 'বাতিল' : 'Cancel'}</span>
                        </button>
                        <button
                          onClick={() => handleUpdateSubmit(ex.id)}
                          className="px-2.5 py-1 text-xs text-white bg-amber-600 hover:bg-amber-500 rounded flex items-center gap-1 cursor-pointer font-bold"
                        >
                          <Check className="h-3 w-3" />
                          <span>{isBangla ? 'সংরক্ষণ' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                          <Coins className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={ex.description}>
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
                          {deletingId === ex.id ? (
                            <div className="flex items-center justify-center gap-0.5 bg-rose-50 border border-rose-100 p-0.5 px-1 rounded-md shrink-0 animate-pulse">
                              <span className="text-[9px] text-rose-700 font-black">{isBangla ? 'মুছবেন?' : 'Sure?'}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  onDelete(ex.id);
                                  setDeletingId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black rounded cursor-pointer shrink-0"
                              >
                                {isBangla ? 'হ্যাঁ' : 'Yes'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingId(null)}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-black rounded cursor-pointer shrink-0"
                              >
                                {isBangla ? 'না' : 'No'}
                              </button>
                            </div>
                          ) : (
                            <>
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
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Trash2, Edit2, Check, X, Tag, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatTimeStr } from '../utils';

interface TransactionListProps {
  transactions: Transaction[];
  isBangla: boolean;
  onDelete: (id: string) => void;
  onUpdate: (updated: Transaction) => void;
}

export default function TransactionList({
  transactions,
  isBangla,
  onDelete,
  onUpdate,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Edit form states
  const [editProduct, setEditProduct] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editIsCash, setEditIsCash] = useState(true);
  const [editCustomer, setEditCustomer] = useState('');

  const filteredTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const productMatch = tx.product.toLowerCase().includes(term);
    const customerMatch = tx.customer ? tx.customer.toLowerCase().includes(term) : false;
    return productMatch || customerMatch;
  });

  const startEditing = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditProduct(tx.product);
    setEditAmount(tx.amount);
    setEditIsCash(tx.isCash);
    setEditCustomer(tx.customer || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    if (!editProduct.trim() || editAmount <= 0) return;
    if (!editIsCash && !editCustomer.trim()) return;

    const original = transactions.find((t) => t.id === id);
    if (!original) return;

    onUpdate({
      ...original,
      product: editProduct,
      amount: editAmount,
      isCash: editIsCash,
      customer: editIsCash ? '' : editCustomer,
    });
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-3xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">
            {isBangla ? 'আজকের বিক্রির তালিকা' : "Today's Sales"}
          </h3>
          <p className="text-xs text-slate-500">
            {isBangla 
              ? `মোট ${filteredTransactions.length} টি হিসাব পাওয়া গেছে` 
              : `Found ${filteredTransactions.length} ledger records`}
          </p>
        </div>

        {/* Search input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder={isBangla ? 'পণ্য বা ক্রেতার নাম খুঁজুন...' : 'Search product or customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-60 pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50"
          />
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
          <p className="text-slate-400 text-sm">
            {isBangla ? 'কোনো হিসাব খুঁজে পাওয়া যায়নি' : 'No entries match your search'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto border border-slate-150 rounded-xl shadow-3xs bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/80 sticky top-0 z-10">
                <th className="py-3 px-3 text-slate-600 font-extrabold">{isBangla ? 'পণ্য' : 'Product'}</th>
                <th className="py-3 px-3 text-slate-600 font-extrabold">{isBangla ? 'পেমেন্ট' : 'Payment'}</th>
                <th className="py-3 px-3 text-slate-600 font-extrabold text-right">{isBangla ? 'পরিমাণ' : 'Amount'}</th>
                <th className="py-3 px-3 text-slate-600 font-extrabold text-center">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <AnimatePresence initial={false}>
                {filteredTransactions.map((tx) => {
                  const isEditing = editingId === tx.id;

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        isEditing ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      {isEditing ? (
                        /* Inline Edit Interface inside Table */
                        <td colSpan={4} className="p-3">
                          <div className="flex flex-col gap-2.5 bg-slate-50 p-3 rounded-lg border border-teal-150">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-0.5">
                                  {isBangla ? 'পণ্যের বিবরণ' : 'Product Details'}
                                </label>
                                <input
                                  type="text"
                                  value={editProduct}
                                  onChange={(e) => setEditProduct(e.target.value)}
                                  className="w-full text-xs p-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white font-medium"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black text-slate-500 mb-0.5">
                                  {isBangla ? 'দাম (৳)' : 'Price (৳)'}
                                </label>
                                <input
                                  type="number"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                                  className="w-full text-xs p-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white font-bold"
                                />
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100">
                              <div className="flex items-center gap-3">
                                <label className="flex items-center text-[11px] gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`edit-type-${tx.id}`}
                                    checked={editIsCash}
                                    onChange={() => setEditIsCash(true)}
                                    className="text-teal-600 focus:ring-teal-500"
                                  />
                                  <span>{isBangla ? 'নগদ' : 'Cash'}</span>
                                </label>
                                <label className="flex items-center text-[11px] gap-1 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`edit-type-${tx.id}`}
                                    checked={!editIsCash}
                                    onChange={() => setEditIsCash(false)}
                                    className="text-teal-600 focus:ring-teal-500"
                                  />
                                  <span>{isBangla ? 'বাকি' : 'Due'}</span>
                                </label>

                                {!editIsCash && (
                                  <input
                                    type="text"
                                    placeholder={isBangla ? 'ক্রেতার নাম' : 'Customer Name'}
                                    value={editCustomer}
                                    onChange={(e) => setEditCustomer(e.target.value)}
                                    className="text-xs p-1 px-2 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white font-medium min-w-[110px]"
                                  />
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={cancelEditing}
                                  className="px-2.5 py-1 text-[10px] text-slate-500 hover:bg-slate-200 rounded flex items-center gap-1 border border-slate-200 bg-white font-bold cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                  <span>{isBangla ? 'বাতিল' : 'Cancel'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(tx.id)}
                                  className="px-2.5 py-1 text-[10px] text-white bg-teal-600 hover:bg-teal-500 rounded flex items-center gap-1 font-bold cursor-pointer"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>{isBangla ? 'সেভ' : 'Save'}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      ) : (
                        /* Normal Table Row */
                        <>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="font-bold text-slate-800 text-xs sm:text-[13px]">{tx.product}</span>
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 font-bold font-mono">
                                  <Clock className="h-2.5 w-2.5 shrink-0" />
                                  {tx.time}
                                </span>
                              </div>
                              {!tx.isCash && tx.customer && (
                                <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.2 rounded w-fit border border-rose-100/40">
                                  👤 {tx.customer}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {tx.isCash ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {isBangla ? 'নগদ' : 'Cash'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-black bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100">
                                <AlertCircle className="h-2.5 w-2.5" />
                                {isBangla ? 'বাকি' : 'Due'}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-[13px] font-sans">
                              {formatCurrency(tx.amount, isBangla)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              {deletingId === tx.id ? (
                                <div className="flex items-center gap-1 bg-rose-50 border border-rose-100 p-1 rounded-lg">
                                  <span className="text-[9px] text-rose-700 font-bold">{isBangla ? 'মুছবেন?' : 'Sure?'}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onDelete(tx.id);
                                      setDeletingId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-bold rounded cursor-pointer"
                                  >
                                    {isBangla ? 'হ্যাঁ' : 'Yes'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingId(null)}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[9px] font-bold rounded cursor-pointer"
                                  >
                                    {isBangla ? 'না' : 'No'}
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditing(tx)}
                                    className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                                    title={isBangla ? 'হিসাব পরিবর্তন' : 'Edit'}
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingId(tx.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                    title={isBangla ? 'হিসাব মুছুন' : 'Delete'}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

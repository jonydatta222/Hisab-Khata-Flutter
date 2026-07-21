import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Trash2, Edit2, Check, X, Tag, User, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatTimeStr, toBanglaNumber } from '../utils';

interface TransactionListProps {
  transactions: Transaction[];
  isBangla: boolean;
  onDelete: (id: string) => void;
  onUpdate: (updated: Transaction) => void;
}

function TransactionList({
  transactions,
  isBangla,
  onDelete,
  onUpdate,
}: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
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
  
  // Edit form states
  const [editProduct, setEditProduct] = useState('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editIsCash, setEditIsCash] = useState(true);
  const [editCustomer, setEditCustomer] = useState('');

  const filteredTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const productMatch = tx.product.toLowerCase().includes(term);
    const customerMatch = tx.customer ? tx.customer.toLowerCase().includes(term) : false;
    return productMatch || customerMatch;
  });

  const displayedTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, 8);

  const startEditing = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditProduct(tx.product);
    setEditAmount(String(tx.amount));
    setEditIsCash(tx.isCash);
    setEditCustomer(tx.customer || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEdit = (id: string) => {
    const amt = parseFloat(editAmount);
    if (!editProduct.trim() || isNaN(amt) || amt <= 0) return;
    if (!editIsCash && !editCustomer.trim()) return;

    const original = transactions.find((t) => t.id === id);
    if (!original) return;

    onUpdate({
      ...original,
      product: editProduct,
      amount: amt,
      isCash: editIsCash,
      customer: editIsCash ? '' : editCustomer,
    });
    setEditingId(null);
  };

  return (
    <div className="w-full px-3 sm:px-4">
      <div className="flex flex-col items-center justify-center gap-2 mb-4">
        <div className="text-center">
          <h3 className="text-xs sm:text-sm font-black text-slate-700 tracking-tight">
            {isBangla ? 'আজকের বিক্রির তালিকা' : "Today's Sales"}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold">
            {isBangla 
              ? `মোট ${toBanglaNumber(filteredTransactions.length)} টি হিসাব পাওয়া গেছে` 
              : `Found ${filteredTransactions.length} ledger records`}
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full max-w-sm">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </span>
          <input
            type="text"
            placeholder={isBangla ? 'পণ্য বা ক্রেতার নাম খুঁজুন...' : 'Search product or customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50 font-medium"
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
        <div className="overflow-x-auto max-h-[440px] overflow-y-auto no-scrollbar border border-slate-200 rounded-xl shadow-3xs bg-white">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200">
              <tr className="text-slate-600 font-extrabold">
                <th className="py-2.5 px-2">{isBangla ? 'পণ্য' : 'Product'}</th>
                <th className="py-2.5 px-2 w-[65px] min-w-[65px] text-center">{isBangla ? 'পেমেন্ট' : 'Payment'}</th>
                <th className="py-2.5 px-2 text-right w-[75px] min-w-[75px]">{isBangla ? 'পরিমাণ' : 'Amount'}</th>
                <th className="py-2.5 px-2 text-center w-[85px] min-w-[85px]">{isBangla ? 'অ্যাকশন' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              <AnimatePresence initial={false}>
                {displayedTransactions.map((tx) => {
                  const paidAmount = !tx.isCash
                    ? transactions.filter(t => t.parentDueId === tx.id).reduce((sum, t) => sum + t.amount, 0)
                    : 0;
                  const remainingDue = !tx.isCash ? Math.max(0, tx.amount - paidAmount) : 0;
                  const isPaidOff = !tx.isCash ? remainingDue === 0 : false;

                  return (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="py-2.5 px-2">
                        <div className="flex flex-col gap-0.5 text-left">
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="font-bold text-slate-800 text-xs sm:text-[13px] break-words whitespace-normal leading-tight">{tx.product}</span>
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 font-bold font-mono shrink-0">
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              {tx.time}
                            </span>
                          </div>
                          {!tx.isCash && tx.customer && (
                            <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.2 rounded w-fit border border-rose-100/40 break-words whitespace-normal leading-tight">
                              👤 {tx.customer}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 w-[65px] min-w-[65px] text-center">
                        {tx.isCash ? (
                          <span className="inline-flex items-center justify-center gap-0.5 text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                            {isBangla ? 'নগদ' : 'Cash'}
                          </span>
                        ) : isPaidOff ? (
                          <span className="inline-flex items-center justify-center gap-0.5 text-[9px] font-black bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100">
                            <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                            {isBangla ? 'পরিশোধিত' : 'Paid'}
                          </span>
                        ) : paidAmount > 0 ? (
                          <span className="inline-flex items-center justify-center gap-0.5 text-[9px] font-black bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100">
                            <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                            {isBangla ? 'আংশিক' : 'Partial'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-0.5 text-[9px] font-black bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100">
                            <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                            {isBangla ? 'বাকি' : 'Due'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right w-[75px] min-w-[75px]">
                        <div className="flex flex-col items-end">
                          <span className="font-extrabold text-slate-900 text-xs sm:text-[13px] font-sans">
                            {formatCurrency(tx.amount, isBangla)}
                          </span>
                          {!tx.isCash && paidAmount > 0 && (
                            <span className="text-[8px] text-slate-400 font-bold">
                              {isBangla ? `বাকি: ${formatCurrency(remainingDue, true)}` : `Due: ${formatCurrency(remainingDue, false)}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 w-[85px] min-w-[85px] text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => startEditing(tx)}
                            className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors cursor-pointer shrink-0"
                            title={isBangla ? 'হিসাব পরিবর্তন' : 'Edit'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(tx.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                            title={isBangla ? 'হিসাব মুছুন' : 'Delete'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {filteredTransactions.length > 8 && (
        <div className="flex justify-center mt-4">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-1.5 text-xs text-teal-700 hover:text-white bg-teal-50 hover:bg-teal-600 rounded-xl border border-teal-100 transition-all font-extrabold cursor-pointer shadow-3xs flex items-center justify-center gap-1 active:scale-95"
          >
            {showAll 
              ? (isBangla ? 'কম দেখান' : 'Show Less') 
              : (isBangla ? 'আরো দেখুন' : 'Show More')}
          </button>
        </div>
      )}

      {/* --- EDIT TRANSACTION MODAL --- */}
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
              id="edit-transaction-modal-box"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-pulse"></span>
                  {isBangla ? 'বিক্রির বিবরণ পরিবর্তন' : 'Edit Sale Details'}
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
                    {isBangla ? 'পণ্যের বিবরণ' : 'Product Details'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editProduct}
                    onChange={(e) => setEditProduct(e.target.value)}
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 hover:bg-white focus:bg-white transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    {isBangla ? 'দাম (টাকা)' : 'Price (৳)'}
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
                    className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 hover:bg-white focus:bg-white transition-all font-sans font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    {isBangla ? 'পেমেন্ট ধরন' : 'Payment Type'}
                  </label>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 mb-2 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setEditIsCash(true)}
                      className={`flex-1 py-2 px-2 rounded-md text-center transition-all cursor-pointer ${
                        editIsCash
                          ? 'bg-white text-teal-800 shadow-3xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isBangla ? '💸 নগদ' : '💸 Cash'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIsCash(false)}
                      className={`flex-1 py-2 px-2 rounded-md text-center transition-all cursor-pointer ${
                        !editIsCash
                          ? 'bg-rose-50 text-rose-700 shadow-3xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {isBangla ? '👤 বাকি' : '👤 Due'}
                    </button>
                  </div>
                </div>

                {!editIsCash && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      {isBangla ? 'ক্রেতার নাম' : 'Customer Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isBangla ? 'যেমন: রহিম মিয়া' : 'e.g. Rahim Miah'}
                      value={editCustomer}
                      onChange={(e) => setEditCustomer(e.target.value)}
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 hover:bg-white focus:bg-white transition-all font-semibold"
                    />
                  </div>
                )}

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
                    onClick={() => saveEdit(editingId!)}
                    className="px-5 py-2 text-xs font-black text-white bg-teal-600 hover:bg-teal-500 rounded-xl shadow-sm cursor-pointer"
                  >
                    {isBangla ? 'পরিবর্তন করুন' : 'Update Sale'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- DELETE TRANSACTION MODAL --- */}
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
              id="delete-transaction-modal-box"
            >
              <div className="flex items-start gap-3">
                <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
                  <Trash2 className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-none">
                    {isBangla ? 'হিসাব ডিলিট করুন' : 'Delete Sale Entry'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {isBangla 
                      ? 'আপনি কি নিশ্চিতভাবে এই বিক্রির হিসাবটি মুছে ফেলতে চান?' 
                      : 'Are you sure you want to delete this sale record?'}
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

const TransactionListMemo = React.memo(TransactionList);
export default TransactionListMemo;

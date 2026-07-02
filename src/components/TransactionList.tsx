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
    <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm">
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
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filteredTransactions.map((tx) => {
              const isEditing = editingId === tx.id;

              return (
                <motion.div
                  key={tx.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isEditing 
                      ? 'border-teal-500 bg-teal-50/20 shadow-inner' 
                      : 'border-slate-100 bg-slate-50/20 hover:border-slate-200'
                  }`}
                >
                  {isEditing ? (
                    // Editing Interface
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            {isBangla ? 'পণ্যের বিবরণ' : 'Product Details'}
                          </label>
                          <input
                            type="text"
                            value={editProduct}
                            onChange={(e) => setEditProduct(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                            {isBangla ? 'দাম (৳)' : 'Price (৳)'}
                          </label>
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs p-2 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center text-xs gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="edit-type"
                              checked={editIsCash}
                              onChange={() => setEditIsCash(true)}
                              className="text-teal-600 focus:ring-teal-500"
                            />
                            <span>{isBangla ? 'নগদ' : 'Cash'}</span>
                          </label>
                          <label className="flex items-center text-xs gap-1 cursor-pointer">
                            <input
                              type="radio"
                              name="edit-type"
                              checked={!editIsCash}
                              onChange={() => setEditIsCash(false)}
                              className="text-teal-600 focus:ring-teal-500"
                            />
                            <span>{isBangla ? 'বাকি' : 'Due'}</span>
                          </label>
                        </div>

                        {!editIsCash && (
                          <div className="flex-1 min-w-[120px]">
                            <input
                              type="text"
                              placeholder={isBangla ? 'ক্রেতার নাম' : 'Customer Name'}
                              value={editCustomer}
                              onChange={(e) => setEditCustomer(e.target.value)}
                              className="w-full text-xs p-2 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={cancelEditing}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-150 rounded flex items-center gap-1 border border-slate-200 bg-white cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                          <span>{isBangla ? 'বাতিল' : 'Cancel'}</span>
                        </button>
                        <button
                          onClick={() => saveEdit(tx.id)}
                          className="px-2.5 py-1 text-xs text-white bg-teal-600 hover:bg-teal-500 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="h-3 w-3" />
                          <span>{isBangla ? 'সংরক্ষণ' : 'Save'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Regular Display
                    <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex flex-col items-center">
                          <span className="p-2 bg-slate-100 rounded-lg text-slate-500">
                            <Tag className="h-4 w-4" />
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold text-slate-800">
                              {tx.product}
                            </h4>
                            {tx.isCash ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                {isBangla ? 'নগদ' : 'Cash'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-100">
                                <AlertCircle className="h-2.5 w-2.5" />
                                {isBangla ? 'বাকি' : 'Due'}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {formatTimeStr(tx.time, isBangla)}
                            </span>
                            {!tx.isCash && tx.customer && (
                              <span className="flex items-center gap-1 font-medium text-amber-800 bg-amber-50/50 px-1.5 py-0.5 rounded">
                                <User className="h-3 w-3 text-amber-600" />
                                {tx.customer}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 ml-auto sm:ml-0">
                        <span className="text-base font-bold text-slate-900">
                          {formatCurrency(tx.amount, isBangla)}
                        </span>
                        
                        <div className="flex items-center gap-1 border-l border-slate-100 pl-2">
                          <button
                            onClick={() => startEditing(tx)}
                            className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                            title={isBangla ? 'হিসাব পরিবর্তন' : 'Edit Transaction'}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(tx.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title={isBangla ? 'হিসাব মুছুন' : 'Delete Transaction'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
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

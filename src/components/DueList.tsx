import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Landmark, Coins, X, Check, Edit2, Trash2 } from 'lucide-react';
import { CustomerDue } from '../types';
import { formatCurrency, toBanglaNumber } from '../utils';

interface DueListProps {
  dueList: CustomerDue[];
  isBangla: boolean;
  onDeposit: (customerName: string, amount: number) => void;
  onDelete: (customerName: string) => void;
  onRename: (oldName: string, newName: string) => void;
}

export default function DueList({ dueList, isBangla, onDeposit, onDelete, onRename }: DueListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [depositingCustomer, setDepositingCustomer] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const [editingCustomer, setEditingCustomer] = useState<string | null>(null);
  const [newNameValue, setNewNameValue] = useState<string>('');
  const [deletingCustomer, setDeletingCustomer] = useState<string | null>(null);

  const filteredDues = dueList.filter((cd) => 
    cd.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstandingDue = dueList.reduce((sum, item) => sum + item.amount, 0);

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
    setDepositingCustomer(null);
    setDeletingCustomer(null);
  };

  const cancelRename = () => {
    setEditingCustomer(null);
    setNewNameValue('');
  };

  const handleRenameSubmit = (oldName: string) => {
    if (!newNameValue.trim()) return;
    onRename(oldName, newNameValue.trim());
    setEditingCustomer(null);
    setNewNameValue('');
  };

  const startDeleteConfirm = (customer: CustomerDue) => {
    setDeletingCustomer(customer.name);
    setDepositingCustomer(null);
    setEditingCustomer(null);
  };

  const handleDepositSubmit = (customerName: string, maxDue: number) => {
    const amt = parseFloat(depositAmount);
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

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span className="text-rose-500">●</span>
            {isBangla ? 'বাকির খাতাপত্র (গ্রাহকের তালিকা)' : 'Outstanding Dues List'}
          </h3>
          <p className="text-xs text-slate-500">
            {isBangla 
              ? `সর্বমোট বকেয়া: ${formatCurrency(totalOutstandingDue, true)} (${toBanglaNumber(filteredDues.length)} জন ক্রেতা)` 
              : `Total Outstanding: ${formatCurrency(totalOutstandingDue, false)} (${filteredDues.length} customers)`}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder={isBangla ? 'ক্রেতার নাম খুঁজুন...' : 'Search customer...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-56 pl-9 pr-4 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50"
          />
        </div>
      </div>

      {filteredDues.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-slate-150 rounded-xl bg-slate-50/50">
          <p className="text-slate-400 text-sm">
            {isBangla ? 'কোনো বকেয়া হিসাব পাওয়া যায়নি' : 'No dues listed'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-[450px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {filteredDues.map((cd) => {
              const isDepositing = depositingCustomer === cd.name;
              const isEditing = editingCustomer === cd.name;
              const isDeleting = deletingCustomer === cd.name;

              return (
                <motion.div
                  key={cd.name}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                    isDepositing 
                      ? 'border-emerald-500 bg-emerald-50/10 shadow-xs' 
                      : isEditing
                      ? 'border-teal-500 bg-teal-50/10 shadow-xs'
                      : isDeleting
                      ? 'border-rose-500 bg-rose-50/10 shadow-xs'
                      : 'border-slate-100 bg-rose-50/10 hover:bg-rose-50/20 hover:border-rose-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="p-1 bg-rose-50 text-rose-600 rounded-md shrink-0">
                        <Landmark className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate" title={cd.name}>{cd.name}</h4>
                        <p className="text-[9px] text-slate-400 truncate">
                          {isBangla ? 'বাকি ব্যালেন্স' : 'Due Balance'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm font-extrabold text-rose-600 shrink-0">
                      {formatCurrency(cd.amount, isBangla)}
                    </span>
                  </div>

                  {isEditing ? (
                    // Rename Inline Mode
                    <div className="space-y-1.5 pt-1.5 border-t border-teal-100">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder={isBangla ? 'নতুন নাম...' : 'New name...'}
                          value={newNameValue}
                          onChange={(e) => setNewNameValue(e.target.value)}
                          className="flex-1 text-[11px] p-1 rounded border border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                        />
                        <button
                          onClick={() => handleRenameSubmit(cd.name)}
                          className="p-1 bg-teal-600 hover:bg-teal-500 text-white rounded cursor-pointer transition-all"
                          title={isBangla ? 'সম্পন্ন করুন' : 'Confirm'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelRename}
                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                          title={isBangla ? 'বাতিল' : 'Cancel'}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : isDeleting ? (
                    // Delete Confirmation Mode
                    <div className="space-y-1.5 pt-1.5 border-t border-rose-100">
                      <p className="text-[9px] text-rose-700 font-bold leading-tight">
                        {isBangla ? 'গ্রাহকের সকল হিসাব ডিলিট করতে চান?' : 'Delete all dues for this customer?'}
                      </p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => {
                            onDelete(cd.name);
                            setDeletingCustomer(null);
                          }}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded cursor-pointer"
                        >
                          {isBangla ? 'হ্যাঁ' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setDeletingCustomer(null)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                        >
                          {isBangla ? 'না' : 'No'}
                        </button>
                      </div>
                    </div>
                  ) : isDepositing ? (
                    // Deposit Inline Mode
                    <div className="space-y-1.5 pt-1.5 border-t border-emerald-100">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder={isBangla ? '৳ জমা' : '৳ Deposit'}
                          value={depositAmount}
                          onChange={(e) => {
                            setDepositAmount(e.target.value);
                            setErrorMsg('');
                          }}
                          className="flex-1 text-[11px] p-1 rounded border border-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                        />
                        <button
                          onClick={() => handleDepositSubmit(cd.name, cd.amount)}
                          className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded cursor-pointer transition-all"
                          title={isBangla ? 'জমা সম্পন্ন করুন' : 'Confirm Deposit'}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={cancelDeposit}
                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer"
                          title={isBangla ? 'বাতিল' : 'Cancel'}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {errorMsg && (
                        <p className="text-[9px] text-rose-600 font-bold">{errorMsg}</p>
                      )}
                    </div>
                  ) : (
                    // Edit, Delete, Deposit triggers
                    <div className="flex items-center justify-between border-t border-dashed border-slate-100/60 pt-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startRename(cd)}
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded transition-colors cursor-pointer"
                          title={isBangla ? 'নাম পরিবর্তন' : 'Rename Customer'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => startDeleteConfirm(cd)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title={isBangla ? 'মুছে ফেলুন' : 'Delete Customer'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => startDeposit(cd)}
                        className="text-[10px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Coins className="h-3 w-3" />
                        <span>{isBangla ? 'জমা' : 'Deposit'}</span>
                      </button>
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

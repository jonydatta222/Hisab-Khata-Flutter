import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { formatCurrency } from '../utils';

interface StatCardProps {
  title: string;
  amount: number;
  icon: LucideIcon;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  isBangla: boolean;
  onClick?: () => void;
  isActive?: boolean;
}

export default function StatCard({
  title,
  amount,
  icon: Icon,
  bgColor,
  borderColor,
  textColor,
  iconColor,
  isBangla,
  onClick,
  isActive = false,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-xl p-2 sm:p-3 border transition-all ${
        isActive 
          ? `shadow-md shadow-teal-500/10 ring-2 ring-teal-500 ring-offset-2 ${bgColor}` 
          : `${bgColor} ${borderColor} hover:shadow-xs`
      }`}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <span className={`text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest block truncate ${textColor}`}>
            {title}
          </span>
          <span className="text-sm sm:text-base font-black font-sans tracking-tight text-slate-900 block mt-0.5 truncate">
            {formatCurrency(amount, isBangla)}
          </span>
        </div>
        <span className={`p-1 rounded-lg bg-white shadow-3xs border border-slate-100 shrink-0 ${iconColor}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.div>
  );
}

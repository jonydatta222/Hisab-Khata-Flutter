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
      whileHover={{ y: -0.5, scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`relative cursor-pointer rounded-lg p-1.5 sm:p-2 border transition-all ${
        isActive 
          ? `shadow-xs ring-1 ring-teal-500 ${bgColor}` 
          : `${bgColor} ${borderColor} hover:shadow-3xs`
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="min-w-0 flex-1">
          <span className={`text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest block truncate ${textColor}`}>
            {title}
          </span>
          <span className="text-xs sm:text-sm font-black font-sans tracking-tight text-slate-950 block mt-0.5 truncate">
            {formatCurrency(amount, isBangla)}
          </span>
        </div>
        <span className={`p-0.5 rounded bg-white/80 border border-slate-100/50 shrink-0 ${iconColor}`}>
          <Icon className="h-3 w-3" />
        </span>
      </div>
    </motion.div>
  );
}

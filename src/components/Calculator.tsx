import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Delete, Percent, CornerDownLeft, Plus, Minus, Equal } from 'lucide-react';
import { toBanglaNumber } from '../utils';

interface CalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  isBangla: boolean;
  onApplyValue: (val: number) => void;
}

export default function Calculator({ isOpen, onClose, isBangla, onApplyValue }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [hasEvaluated, setHasEvaluated] = useState(false);

  const handleNumClick = (num: string) => {
    if (hasEvaluated) {
      setDisplay(num);
      setHasEvaluated(false);
    } else {
      if (display === '0') {
        setDisplay(num);
      } else {
        setDisplay(display + num);
      }
    }
  };

  const handleOperatorClick = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
    setHasEvaluated(false);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setHasEvaluated(false);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleDecimal = () => {
    if (hasEvaluated) {
      setDisplay('0.');
      setHasEvaluated(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleEqual = () => {
    if (!equation) return;
    try {
      const fullEquation = equation + display;
      // Sanitize input to only allow mathematical characters
      const sanitized = fullEquation.replace(/[^0-9+\-*/. ]/g, '');
      // eslint-disable-next-line no-eval
      const result = eval(sanitized);
      const roundedResult = parseFloat(result.toFixed(4));
      setDisplay(String(roundedResult));
      setEquation('');
      setHasEvaluated(true);
    } catch (e) {
      setDisplay('Error');
      setEquation('');
      setHasEvaluated(true);
    }
  };

  const handlePaste = () => {
    const val = parseFloat(display);
    if (!isNaN(val) && val > 0) {
      onApplyValue(val);
      onClose();
    }
  };

  // Convert English input string to Bangla if isBangla is true
  const formatDisplay = (val: string) => {
    if (isBangla) {
      // Replace decimal and numbers
      return toBanglaNumber(val);
    }
    return val;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            id="calc-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Calculator Drawer */}
          <motion.div
            id="calc-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-80 bg-slate-900 text-white shadow-2xl z-50 flex flex-col p-6 border-l border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-teal-600 rounded-lg text-white">
                  <CornerDownLeft className="h-5 w-5" />
                </span>
                <h3 className="font-semibold text-lg tracking-tight">
                  {isBangla ? 'ক্যালকুলেটর' : 'Calculator'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 rounded-full transition-colors"
                id="close-calc-btn"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {/* Screen */}
            <div className="bg-slate-950 rounded-xl p-4 mb-6 flex flex-col items-end justify-center min-h-[90px] border border-slate-800">
              <span className="text-slate-500 text-xs font-mono h-5 block">
                {formatDisplay(equation)}
              </span>
              <span className="text-3xl font-semibold tracking-tight font-mono text-teal-400 overflow-x-auto w-full text-right select-all">
                {formatDisplay(display)}
              </span>
            </div>

            {/* Buttons Grid */}
            <div className="grid grid-cols-4 gap-2 mb-6 flex-1">
              {/* Row 1 */}
              <button
                onClick={handleClear}
                className="col-span-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 font-semibold rounded-lg p-3 transition-all active:scale-95 text-sm"
              >
                {isBangla ? 'মুছুন' : 'Clear'}
              </button>
              <button
                onClick={handleBackspace}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg p-3 flex items-center justify-center transition-all active:scale-95"
              >
                <Delete className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleOperatorClick('/')}
                className="bg-teal-950 text-teal-400 hover:bg-teal-900 rounded-lg p-3 font-semibold text-lg transition-all active:scale-95"
              >
                ÷
              </button>

              {/* Row 2 */}
              {['7', '8', '9'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleNumClick(n)}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-3 font-mono font-medium text-lg transition-all active:scale-95"
                >
                  {isBangla ? toBanglaNumber(n) : n}
                </button>
              ))}
              <button
                onClick={() => handleOperatorClick('*')}
                className="bg-teal-950 text-teal-400 hover:bg-teal-900 rounded-lg p-3 font-semibold text-lg transition-all active:scale-95"
              >
                ×
              </button>

              {/* Row 3 */}
              {['4', '5', '6'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleNumClick(n)}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-3 font-mono font-medium text-lg transition-all active:scale-95"
                >
                  {isBangla ? toBanglaNumber(n) : n}
                </button>
              ))}
              <button
                onClick={() => handleOperatorClick('-')}
                className="bg-teal-950 text-teal-400 hover:bg-teal-900 rounded-lg p-3 font-semibold text-lg flex items-center justify-center transition-all active:scale-95"
              >
                <Minus className="h-4 w-4" />
              </button>

              {/* Row 4 */}
              {['1', '2', '3'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleNumClick(n)}
                  className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-3 font-mono font-medium text-lg transition-all active:scale-95"
                >
                  {isBangla ? toBanglaNumber(n) : n}
                </button>
              ))}
              <button
                onClick={() => handleOperatorClick('+')}
                className="bg-teal-950 text-teal-400 hover:bg-teal-900 rounded-lg p-3 font-semibold text-lg flex items-center justify-center transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
              </button>

              {/* Row 5 */}
              <button
                onClick={() => handleNumClick('0')}
                className="col-span-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-3 font-mono font-medium text-lg transition-all active:scale-95"
              >
                {isBangla ? '০' : '0'}
              </button>
              <button
                onClick={handleDecimal}
                className="bg-slate-800 hover:bg-slate-700 text-white rounded-lg p-3 font-mono font-medium text-lg transition-all active:scale-95"
              >
                {isBangla ? '।' : '.'}
              </button>
              <button
                onClick={handleEqual}
                className="bg-teal-600 hover:bg-teal-500 text-white rounded-lg p-3 font-semibold text-lg flex items-center justify-center transition-all active:scale-95 shadow-md shadow-teal-900/50"
              >
                <Equal className="h-4 w-4" />
              </button>
            </div>

            {/* Apply Button */}
            <button
              onClick={handlePaste}
              disabled={parseFloat(display) <= 0 || isNaN(parseFloat(display))}
              className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 rounded-xl font-medium flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg cursor-pointer"
              id="apply-calc-value-btn"
            >
              <CornerDownLeft className="h-4 w-4" />
              <span>{isBangla ? 'টাকার ঘরে বসান' : 'Paste Amount'}</span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

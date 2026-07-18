import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Plus, Minus, Equal, Calculator as CalcIcon, Delete, Trash2 } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
  isBangla: boolean;
  onApplyValue: (val: number) => void;
}

export default function Calculator({ onClose, isBangla, onApplyValue }: CalculatorProps) {
  const [state, setState] = useState({
    display: '0',
    equation: '',
    hasEvaluated: false
  });
  
  const { display, equation, hasEvaluated } = state;

  // Safe arithmetic evaluator with percentage support
  const safeEval = (expr: string): number => {
    let parsed = expr;
    // Replace addition/subtraction percentages: X + Y% -> X + (X * Y / 100)
    const addSubRegex = /(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)%/g;
    parsed = parsed.replace(addSubRegex, "$1 $2 ($1 * $3 / 100)");
    
    // Replace multiplication/division percentages: X * Y% -> X * (Y / 100)
    const mulDivRegex = /(\d+(?:\.\d+)?)\s*([*/])\s*(\d+(?:\.\d+)?)%/g;
    parsed = parsed.replace(mulDivRegex, "$1 $2 ($3 / 100)");
    
    // Replace standalone percentages: X% -> (X / 100)
    const standaloneRegex = /(\d+(?:\.\d+)?)%/g;
    parsed = parsed.replace(standaloneRegex, "($1 / 100)");
    
    // Sanitize equation to prevent execution of malicious code
    const sanitized = parsed.replace(/[^0-9+\-*/.() ]/g, '');
    
    // eslint-disable-next-line no-eval
    const result = eval(sanitized);
    return result;
  };

  const handleNumClick = (num: string) => {
    setState(prev => {
      const shouldReplace = prev.hasEvaluated || prev.display === '0' || prev.display.endsWith('%');
      return {
        ...prev,
        display: shouldReplace ? num : prev.display + num,
        hasEvaluated: false
      };
    });
  };

  const handleOperatorClick = (op: string) => {
    setState(prev => {
      if (prev.equation && !prev.hasEvaluated) {
        try {
          const fullEquation = prev.equation + prev.display;
          const result = safeEval(fullEquation);
          const roundedResult = parseFloat(result.toFixed(4));
          return {
            display: String(roundedResult),
            equation: roundedResult + ' ' + op + ' ',
            hasEvaluated: true
          };
        } catch (e) {
          return {
            ...prev,
            equation: prev.display + ' ' + op + ' ',
            hasEvaluated: true
          };
        }
      } else {
        return {
          ...prev,
          equation: prev.display + ' ' + op + ' ',
          hasEvaluated: true
        };
      }
    });
  };

  const handleClear = () => {
    setState({
      display: '0',
      equation: '',
      hasEvaluated: false
    });
  };

  const handleDecimal = () => {
    setState(prev => {
      if (prev.hasEvaluated) {
        return {
          ...prev,
          display: '0.',
          hasEvaluated: false
        };
      } else if (!prev.display.includes('.')) {
        return {
          ...prev,
          display: prev.display + '.',
          hasEvaluated: false
        };
      }
      return prev;
    });
  };

  const handleBackspace = () => {
    setState(prev => {
      if (prev.display.length > 1) {
        return {
          ...prev,
          display: prev.display.slice(0, -1)
        };
      } else {
        return {
          ...prev,
          display: '0'
        };
      }
    });
  };

  const handlePercent = () => {
    setState(prev => {
      if (prev.display === '0') {
        return prev;
      }
      if (prev.display.endsWith('%')) {
        return prev;
      }
      return {
        ...prev,
        display: prev.display + '%',
        hasEvaluated: false
      };
    });
  };

  const handleEqual = () => {
    if (equation) {
      try {
        const fullEquation = equation + display;
        const result = safeEval(fullEquation);
        const roundedResult = parseFloat(result.toFixed(4));
        setState({
          display: String(roundedResult),
          equation: '',
          hasEvaluated: true
        });
      } catch (e) {
        setState({
          display: 'Error',
          equation: '',
          hasEvaluated: true
        });
      }
    } else {
      try {
        const evaluatedVal = safeEval(display);
        if (!isNaN(evaluatedVal) && evaluatedVal > 0) {
          onApplyValue(evaluatedVal);
          onClose();
        }
      } catch (e) {
        setState(prev => ({ ...prev, display: 'Error' }));
      }
    }
  };

  const formatDisplay = (val: string) => {
    return val;
  };

  return (
    <>
      {/* Super-smooth backdrop overlay */}
      <motion.div
        id="calc-backdrop"
        onPointerDown={(e) => { e.preventDefault(); onClose(); }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.08, ease: 'linear' }}
        className="fixed inset-0 bg-[#0f2d59]/40 z-40 cursor-pointer"
      />

      {/* Centered Modal with rounded corners, soft shadow and elevated design */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          id="calc-modal"
          initial={{ opacity: 0, scale: 0.98, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 5 }}
          transition={{ duration: 0.08, ease: 'easeOut' }}
          className="pointer-events-auto w-full max-w-[360px] bg-[#f0f4f9] rounded-[2.5rem] shadow-[0_24px_50px_rgba(15,45,89,0.18)] flex flex-col p-6 border border-white/80 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span id="calc-header-icon" className="p-2.5 bg-[#eefcf2] rounded-xl text-[#00c853] flex items-center justify-center shadow-sm">
                <CalcIcon className="h-5 w-5" />
              </span>
              <h3 className="font-bold text-[#0f2d59] text-[1.25rem] tracking-tight font-sans">
                Calculator
              </h3>
            </div>
            <button
              onPointerDown={(e) => { e.preventDefault(); onClose(); }}
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200/60 rounded-full transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              id="close-calc-btn"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Screen Display with Navy background, rounded corners and bold white value */}
          <div id="calc-screen" className="bg-[#0f2d59] rounded-2xl p-5 mb-5 flex flex-col items-end justify-center min-h-[96px] shadow-inner relative overflow-hidden">
            <span className="text-[#8a9db5] text-xs font-mono h-5 block select-none">
              {formatDisplay(equation)}
            </span>
            <span className="text-4xl font-bold tracking-tight font-sans text-white overflow-x-auto w-full text-right select-all no-scrollbar leading-none mt-1">
              {formatDisplay(display)}
            </span>
          </div>

          {/* Button Grid matching the precise 4-column layout in the screenshot */}
          <div className="grid grid-cols-4 gap-3 mb-2 select-none">
            {/* Row 1: 7, 8, 9, * */}
            {['7', '8', '9'].map((n) => (
              <button
                key={n}
                onPointerDown={(e) => { e.preventDefault(); handleNumClick(n); }}
                className="calc-btn-num h-14 bg-white active:bg-slate-100 text-[#0f2d59] font-semibold text-xl rounded-2xl shadow-[0_4px_10px_rgba(15,45,89,0.06)] border border-slate-100/50 flex items-center justify-center cursor-pointer font-sans select-none touch-none"
              >
                {n}
              </button>
            ))}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleOperatorClick('*'); }}
              className="calc-btn-op h-14 bg-[#e3f2fd] active:bg-[#bbdefb] text-[#1565c0] font-bold text-2xl rounded-2xl shadow-[0_4px_10px_rgba(21,101,192,0.06)] border border-[#e3f2fd] flex items-center justify-center cursor-pointer font-sans select-none touch-none"
            >
              ×
            </button>

            {/* Row 2: 4, 5, 6, - */}
            {['4', '5', '6'].map((n) => (
              <button
                key={n}
                onPointerDown={(e) => { e.preventDefault(); handleNumClick(n); }}
                className="calc-btn-num h-14 bg-white active:bg-slate-100 text-[#0f2d59] font-semibold text-xl rounded-2xl shadow-[0_4px_10px_rgba(15,45,89,0.06)] border border-slate-100/50 flex items-center justify-center cursor-pointer font-sans select-none touch-none"
              >
                {n}
              </button>
            ))}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleOperatorClick('-'); }}
              className="calc-btn-op h-14 bg-[#e3f2fd] active:bg-[#bbdefb] text-[#1565c0] font-bold text-2xl rounded-2xl shadow-[0_4px_10px_rgba(21,101,192,0.06)] border border-[#e3f2fd] flex items-center justify-center cursor-pointer font-sans select-none touch-none"
            >
              −
            </button>

            {/* Row 3: 1, 2, 3, + */}
            {['1', '2', '3'].map((n) => (
              <button
                key={n}
                onPointerDown={(e) => { e.preventDefault(); handleNumClick(n); }}
                className="calc-btn-num h-14 bg-white active:bg-slate-100 text-[#0f2d59] font-semibold text-xl rounded-2xl shadow-[0_4px_10px_rgba(15,45,89,0.06)] border border-slate-100/50 flex items-center justify-center cursor-pointer font-sans select-none touch-none"
              >
                {n}
              </button>
            ))}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleOperatorClick('+'); }}
              className="calc-btn-op h-14 bg-[#e3f2fd] active:bg-[#bbdefb] text-[#1565c0] font-bold text-2xl rounded-2xl shadow-[0_4px_10px_rgba(21,101,192,0.06)] border border-[#e3f2fd] flex items-center justify-center cursor-pointer font-sans select-none touch-none"
            >
              +
            </button>

            {/* Row 4: Backspace (originally C), 0, ., % */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleBackspace(); }}
              className="calc-btn-delete h-14 bg-[#ffebee] active:bg-[#ffcdd2] text-[#e91e63] font-bold text-xl rounded-2xl shadow-[0_4px_10px_rgba(233,30,99,0.08)] border border-[#ffebee] flex items-center justify-center cursor-pointer font-sans select-none touch-none"
              title="Backspace"
            >
              <Delete className="h-5.5 w-5.5 stroke-[2.5]" />
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleNumClick('0'); }}
              className="calc-btn-num h-14 bg-white active:bg-slate-100 text-[#0f2d59] font-semibold text-xl rounded-2xl shadow-[0_4px_10px_rgba(15,45,89,0.06)] border border-slate-100/50 flex items-center justify-center cursor-pointer font-sans select-none touch-none"
            >
              0
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleDecimal(); }}
              className="calc-btn-num h-14 bg-white active:bg-slate-100 text-[#0f2d59] font-semibold text-xl rounded-2xl shadow-[0_4px_10px_rgba(15,45,89,0.06)] border border-slate-100/50 flex items-center justify-center cursor-pointer font-sans select-none touch-none"
            >
              .
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); handlePercent(); }}
              className="calc-btn-percent h-14 bg-[#e8f5e9] active:bg-[#c8e6c9] text-[#2e7d32] font-bold text-xl rounded-2xl shadow-[0_4px_10px_rgba(46,125,50,0.06)] border border-[#e8f5e9] flex items-center justify-center cursor-pointer font-sans select-none touch-none"
            >
              %
            </button>

            {/* Row 5: Clear All (colspan 2) & Equals/Apply (colspan 2) */}
            <button
              onPointerDown={(e) => { e.preventDefault(); handleClear(); }}
              className="calc-btn-clear col-span-2 h-14 bg-[#ffebee] active:bg-[#ffcdd2] text-[#e91e63] font-bold text-[1.1rem] rounded-2xl shadow-[0_4px_10px_rgba(233,30,99,0.08)] border border-[#ffebee] flex items-center justify-center gap-2 cursor-pointer font-sans select-none touch-none"
            >
              <Trash2 className="calc-icon-trash h-5 w-5 text-[#e91e63]" />
              <span>Clear All</span>
            </button>
            <button
              onPointerDown={(e) => { e.preventDefault(); handleEqual(); }}
              className="calc-btn-apply col-span-2 h-14 bg-[#00c853] active:bg-[#00a243] text-white font-bold text-2xl rounded-2xl shadow-[0_8px_20px_rgba(0,200,83,0.3)] flex items-center justify-center gap-2 cursor-pointer font-sans select-none touch-none"
            >
              {equation ? (
                <Equal className="h-5 w-5 stroke-[2.5]" />
              ) : (
                <span className="text-[1rem] tracking-tight font-bold">Apply</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

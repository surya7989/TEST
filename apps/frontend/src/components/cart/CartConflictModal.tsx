import React from 'react';
import { AlertTriangle, X, ShoppingBag, RotateCcw, ArrowRight, ShieldAlert } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

export function CartConflictModal() {
  const { conflict, resolveConflict, items } = useCart();

  if (!conflict || !conflict.isOpen) return null;

  const currentIsHire = conflict.currentType === 'hire';
  const attemptedIsHire = conflict.attemptedType === 'hire';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden text-slate-800 animate-scale-in">
        {/* Top Warning Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500" />

        {/* Close button */}
        <button
          type="button"
          onClick={() => resolveConflict('cancel')}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Warning Symbol Icon & Badge */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-100/90 text-amber-600 border-2 border-amber-300 flex items-center justify-center shadow-md mb-3 ring-8 ring-amber-50 animate-bounce-subtle">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              Order Type Restriction
            </span>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Separate Orders Required
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md leading-relaxed">
              Under Australian clinical and NDIS standards, <strong>Outright Purchases</strong>, <strong>Equipment Hire</strong>, and <strong>NDIS Formal Quotes</strong> follow distinct clinical schedules, billing pathways, and loan agreements and <strong>cannot be combined into a single order</strong>.
            </p>
          </div>

          {/* Conflict Comparison Box */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
            {/* Existing Cart */}
            <div className="flex items-center justify-between gap-3 text-xs pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${currentIsHire ? 'bg-[#FFF8ED] text-[#E88D2A]' : 'bg-emerald-50 text-emerald-700'}`}>
                  {currentIsHire ? <RotateCcw className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block font-medium">Currently in your Cart:</span>
                  <span className="font-bold text-slate-900">
                    {currentIsHire ? 'Equipment Hire Rental' : 'Outright Purchase'} ({items.length} item{items.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                In Cart
              </span>
            </div>

            {/* Attempting to Add */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-xl shrink-0 ${attemptedIsHire ? 'bg-[#FFF8ED] text-[#E88D2A]' : 'bg-emerald-50 text-emerald-700'}`}>
                  {attemptedIsHire ? <RotateCcw className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="text-slate-400 text-[11px] block font-medium">You just attempted to add:</span>
                  <span className="font-bold text-slate-900 truncate block">
                    {conflict.incomingItem.name}
                  </span>
                  <span className={`text-[10.5px] font-extrabold uppercase ${attemptedIsHire ? 'text-[#E88D2A]' : 'text-emerald-700'}`}>
                    {attemptedIsHire ? `Flexible Hire (${conflict.incomingItem.hireWeeks || 2} wks)` : 'Outright Purchase'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0">
                Blocked
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={() => resolveConflict('replace')}
              className={`w-full py-3.5 px-5 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                attemptedIsHire
                  ? 'bg-[#E88D2A] hover:bg-[#D47C1E]'
                  : 'bg-[#147A7A] hover:bg-[#106262]'
              }`}
            >
              <span>
                Clear Cart &amp; Switch to {attemptedIsHire ? 'Equipment Hire' : 'Outright Purchase'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => resolveConflict('cancel')}
              className="w-full py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              Keep Current Cart ({items.length} {currentIsHire ? 'Hire' : 'Purchase'} item{items.length !== 1 ? 's' : ''})
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            Need an official quote instead? Choose <strong>$0 NDIS Formal Quote</strong> at checkout.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CartConflictModal;

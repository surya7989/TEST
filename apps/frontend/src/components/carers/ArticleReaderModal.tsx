import React from 'react';
import { X, Clock, Tag, CheckCircle2, ArrowRight, Share2, BookOpen } from 'lucide-react';
import { CarerArticle } from '@/data/carersData';
import { Link } from 'react-router-dom';

interface ArticleReaderModalProps {
  article: CarerArticle | null;
  onClose: () => void;
  onOpenSampleModal?: () => void;
}

export function ArticleReaderModal({ article, onClose }: ArticleReaderModalProps) {
  if (!article) return null;

  return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="bg-[#0F1E2E] text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/80">
            <BookOpen className="w-4 h-4 text-[#E88D2A]" />
            <span>AT Specialists Carer Knowledge Hub</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Article Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6">
          {/* Article Header */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full">
                {article.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock className="w-3.5 h-3.5 text-[#147A7A]" />
                {article.readTime}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#0F1E2E] leading-tight">
              {article.title}
            </h2>
          </div>

          {/* Article Featured Image */}
          <div className="rounded-2xl overflow-hidden shadow-sm aspect-[16/9] max-h-[300px] w-full bg-gray-100 border border-gray-200">
            <img 
              src={article.image} 
              alt={article.title} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Full Paragraphs */}
          <div className="space-y-4 text-gray-700 text-sm sm:text-base leading-relaxed">
            {article.fullContent.map((paragraph, idx) => (<p key={idx}>{paragraph}</p>))}
          </div>

          {/* Practical Tips Box */}
          {article.tips && article.tips.length > 0 && (<div className="bg-[#EAF5F4] border border-[#ABD7D4] rounded-2xl p-5 sm:p-6 space-y-3">
              <h4 className="text-base font-bold text-[#0F1E2E] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#147A7A]" />
                Practical Tips for Carers & Families
              </h4>
              <ul className="space-y-2.5">
                {article.tips.map((tip, idx) => (<li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#147A7A] mt-2 flex-shrink-0"></span>
                    <span>{tip}</span>
                  </li>))}
              </ul>
            </div>)}

          {/* Support Banner Inside Modal */}
          <div className="bg-gradient-to-r from-[#0F1E2E] to-[#153C64] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md border border-[#1E3A5F]">
            <div>
              <span className="text-[11px] font-bold text-[#E88D2A] uppercase tracking-wider">Clinical Guidance</span>
              <h5 className="text-base sm:text-lg font-bold text-white mt-0.5">Need help finding the right solution?</h5>
              <p className="text-xs text-white/80 mt-1">Speak with our certified assistive technology & continence consultants.</p>
            </div>
            <Link
              to="/contact?type=carer"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs sm:text-sm flex-shrink-0 transition-all shadow-sm cursor-pointer"
            >
              Contact Specialist Team
            </Link>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#F8F9FA] px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            Close Guide
          </button>
          <Link
            to="/shop"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline"
          >
            Explore Continence Range <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>);
}

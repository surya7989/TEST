import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { articles } from '@/data/articles';

export function ExpertAdvice() {
  return (<section className="py-10 sm:py-12 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-[11px] sm:text-[12px] font-bold rounded-full mb-1 uppercase tracking-wider">
              Clinical Insights
            </span>
            <h2 className="text-[22px] sm:text-[26px] lg:text-[30px] font-extrabold text-[#0F1E2E]">Advice from our specialists</h2>
          </div>
          <Link
            to="/resources"
            className="inline-flex items-center gap-1.5 text-[12.5px] sm:text-[13.5px] font-bold text-[#147A7A] hover:underline whitespace-nowrap"
          >
            View All Resources
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Grid */}
        {/* Grid: 2 columns on mobile, 2 on tablet, 4 on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {articles.map((article) => (<Link
              key={article.id}
              to={`/resources/${article.slug}`}
              className="group bg-white border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#147A7A]/40 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[16/10] overflow-hidden bg-[#F8F9FA]">
                  <img
                    src={article.featuredImage}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white/95 text-[#0F1E2E] text-[9px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shadow-xs">
                    {article.category}
                  </span>
                </div>
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-1 text-[9.5px] sm:text-[11.5px] text-gray-500 mb-1.5 sm:mb-2">
                    <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span>{article.readTime} min read</span>
                  </div>
                  <h3 className="text-[12.5px] sm:text-[15px] font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors line-clamp-2 mb-1.5 sm:mb-2 leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-[10.5px] sm:text-[12.5px] text-gray-500 line-clamp-2 leading-relaxed hidden xs:block">{article.excerpt}</p>
                </div>
              </div>

              <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                <span className="inline-flex items-center gap-1 text-[11px] sm:text-[12.5px] font-bold text-[#147A7A] group-hover:gap-1.5 transition-all">
                  <span>Read</span>
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
              </div>
            </Link>))}
        </div>
      </div>
    </section>);
}

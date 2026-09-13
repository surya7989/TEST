import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, User } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { articles } from '@/data/articles';

export function ResourcesPage() {
  return (<div className="min-h-screen bg-[#F7F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 2xl:px-8 py-10">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Resources & Guides' }]} />
          <h1 className="text-[30px] sm:text-[36px] font-black text-[#0F1E2E] mt-4 tracking-tight">
            Advice from Our Specialists
          </h1>
          <p className="text-[15px] text-gray-600 mt-3 max-w-2xl leading-relaxed">
            Expert clinical guides and practical resources to help you make informed decisions about assistive technology, NDIS funding, and equipment selection.
          </p>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-[1400px] mx-auto px-6 2xl:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (<Link
              key={article.slug}
              to={`/resources/${article.slug}`}
              className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#147A7A]/40 transition-all duration-200 flex flex-col justify-between group"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden bg-[#F8F9FA]">
                <img
                  src={article.featuredImage}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <span className="absolute top-3 left-3 bg-[#147A7A] text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                  {article.category}
                </span>
              </div>

              {/* Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 text-[11.5px] text-gray-500 mb-2.5">
                    <time dateTime={article.publishedAt}>{article.publishedAt}</time>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {article.readTime} min read
                    </span>
                  </div>

                  <h2 className="text-[16px] font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors line-clamp-2 leading-snug mb-2">
                    {article.title}
                  </h2>

                  <p className="text-[12.5px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
                    {article.excerpt}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
                    <User className="h-3.5 w-3.5 text-[#147A7A]" />
                    {article.author}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-[#147A7A] group-hover:gap-2 transition-all">
                    Read
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>))}
        </div>
      </div>
    </div>);
}
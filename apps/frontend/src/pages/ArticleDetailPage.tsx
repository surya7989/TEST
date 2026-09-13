import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clock, User, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { articles } from '@/data/articles';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const article = articles.find((a) => a.slug === slug) || articles[0];

  return (<div className="min-h-screen bg-[#F7F9FA] py-10">
      <div className="max-w-[1000px] mx-auto px-6">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Resources & Guides', to: '/resources' },
            { label: article.title },
          ]}
        />

        <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 mt-6 shadow-sm">
          {/* Header */}
          <div className="mb-6">
            <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-[12px] font-bold rounded-full mb-3 uppercase tracking-wider">
              {article.category}
            </span>
            <h1 className="text-[28px] sm:text-[36px] font-extrabold text-[#0F1E2E] leading-tight tracking-tight mb-4">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-gray-500 pb-6 border-b border-gray-100">
              <span className="flex items-center gap-1.5 font-medium text-gray-700">
                <User className="h-4 w-4 text-[#147A7A]" />
                {article.author} ({article.authorRole})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {article.readTime} min read
              </span>
              <span>•</span>
              <span>{article.publishedAt}</span>
            </div>
          </div>

          {/* Featured Image */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-gray-100">
            <img
              src={article.featuredImage}
              alt={article.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="prose max-w-none text-[15px] text-gray-700 leading-relaxed space-y-6">
            <p className="text-[17px] font-medium text-[#0F1E2E] leading-relaxed">
              {article.excerpt}
            </p>

            <h2 className="text-[22px] font-bold text-[#0F1E2E] pt-4">
              1. Understanding Clinical Suitability & Needs Assessment
            </h2>
            <p>
              When selecting assistive technology, a comprehensive clinical assessment is the cornerstone of ensuring long-term independence, posture support, and skin integrity. Key considerations include the individual's physical capabilities, cognitive profile, home environment layout, and daily routine.
            </p>

            <h2 className="text-[22px] font-bold text-[#0F1E2E] pt-4">
              2. Funding Pathways and NDIS Justification
            </h2>
            <p>
              For NDIS participants, equipment must align with the "Reasonable and Necessary" criteria. Low-cost assistive technology items (under $1,500) can typically be purchased with Core funding or Capital AT funds, whereas mid-to-high risk items require clinical letters or formal AT Assessment Reports prepared by an Occupational Therapist.
            </p>

            <div className="bg-[#EAF5F4] border-l-4 border-[#147A7A] p-5 rounded-r-xl my-6">
              <h3 className="text-[15px] font-bold text-[#0F1E2E] mb-1 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[#147A7A]" />
                Specialist Recommendation
              </h3>
              <p className="text-[13.5px] text-gray-700">
                Always arrange a product trial before finalising high-value equipment. Our clinical team provides trial equipment and home demonstrations across Australia to guarantee proper fit and compatibility.
              </p>
            </div>

            <h2 className="text-[22px] font-bold text-[#0F1E2E] pt-4">
              3. Maintenance, Safety, and Ongoing Review
            </h2>
            <p>
              Routine checks of tyre pressure, battery health, sling condition, and braking systems help prevent equipment failure and ensure maximum user safety. Annual reviews with your therapist will ensure the device continues to meet your evolving needs.
            </p>
          </div>

          {/* Bottom Actions */}
          <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              to="/resources"
              className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#147A7A] hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to all resources
            </Link>

            <Link
              to="/contact?type=specialist"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-[13.5px] font-bold rounded-lg transition-all"
            >
              Consult an AT Specialist
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>);
}

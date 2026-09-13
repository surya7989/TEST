import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import {
  Mail,
  MessageSquare,
  Star,
  Bell,
  Send,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  FileText,
  Sparkles,
} from 'lucide-react';

export function AdminCommunicationsDashboard() {
  const { inquiries, reviews } = useAdminStore();

  const stats = useMemo(() => {
    const unreadInquiries = inquiries.filter((i) => i.status === 'new');
    const respondedInquiries = inquiries.filter((i) => i.status === 'contacted' || i.status === 'resolved');
    const otReferrals = inquiries.filter((i) => i.subject?.toLowerCase().includes('ot') || i.message?.toLowerCase().includes('therapist'));

    const publishedReviews = reviews.filter((r) => r.status === 'approved');
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : '5.0';

    return {
      totalInquiries: inquiries.length,
      unreadInquiries: unreadInquiries.length,
      respondedInquiries: respondedInquiries.length,
      otReferrals: otReferrals.length,
      totalReviews: reviews.length,
      publishedReviews: publishedReviews.length,
      avgRating,
    };
  }, [inquiries, reviews]);

  const recentInquiries = inquiries.slice(0, 5);

  return (<div className="space-y-6 font-sans text-slate-700 animate-fade-in">
      {/* 1. TOP HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Topic Hub
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Inquiries, Email Studio, Reviews &amp; Notifications</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Communications Dashboard</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Manage customer touchpoints, clinical therapy inquiries, automated transactional emails, and verified client reviews
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/at/invoices?tab=email_templates"
            className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <Mail className="w-4 h-4" />
            <span>Email Templates Studio</span>
          </Link>
          <Link
            to="/at/inquiries"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>Inbound Inbox ({stats.unreadInquiries})</span>
          </Link>
        </div>
      </div>

      {/* 3. COMMUNICATIONS METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unread Inquiries</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.unreadInquiries}</span>
            <p className="text-xs text-amber-700 font-medium mt-1">
              Awaiting specialist reply &middot; {stats.totalInquiries} total
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Satisfaction</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.avgRating} / 5.0</span>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {stats.publishedReviews} verified reviews published
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OT &amp; NDIS Inquiries</span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.otReferrals}</span>
            <p className="text-xs text-violet-600 font-medium mt-1">
              Therapist equipment trial requests
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Transactional Emails</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#147A7A] flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">4 Active</span>
            <p className="text-xs text-teal-700 font-medium mt-1">
              Order, Quote, Invoice, and Shipping triggers
            </p>
          </div>
        </div>
      </div>

      {/* 4. RECENT INBOUND INQUIRIES QUEUE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Inbound Customer &amp; Clinical Inquiries</h2>
            <p className="text-xs text-slate-500 mt-0.5">Direct messages from contact form and product inquiry buttons</p>
          </div>
          <Link
            to="/at/inquiries"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline"
          >
            <span>Open Inbox ({inquiries.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {recentInquiries.map((inq) => (<div key={inq.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">{inq.name}</span>
                  <span className="text-slate-300 text-xs">&bull;</span>
                  <span className="text-xs text-slate-500">{inq.email}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      inq.status === 'new'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {inq.status}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-700 truncate max-w-xl">{inq.subject}</p>
                <p className="text-xs text-slate-500 line-clamp-1">{inq.message}</p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                <span className="text-xs text-slate-400 font-mono">{inq.createdAt}</span>
                <Link
                  to={`/at/inquiries?id=${inq.id}`}
                  className="px-3 py-1.5 bg-teal-50 hover:bg-[#147A7A] hover:text-white text-[#147A7A] text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <span>Reply</span>
                  <Send className="w-3 h-3" />
                </Link>
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}

export default AdminCommunicationsDashboard;

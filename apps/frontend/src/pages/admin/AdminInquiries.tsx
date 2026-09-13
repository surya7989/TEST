import React, { useState, useMemo } from 'react';
import { useAdminStore, type ContactInquiry } from '@/store/adminStore';
import {
  MessageSquare,
  Search,
  Filter,
  Phone,
  Mail,
  Calendar,
  CheckCircle,
  Clock,
  Send,
  Trash2,
  Plus,
  ShieldCheck,
  Award,
  AlertCircle,
  FileText,
  User,
  Building,
  ArrowRight,
  ExternalLink,
  Edit,
  X,
  Check,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const inquiryStatusConfig: Record<ContactInquiry['status'], { label: string; color: string; bg: string; border: string }> = {
  new: { label: 'New Lead', color: 'text-amber-800', bg: 'bg-amber-50', border: 'border-amber-200' },
  in_progress: { label: 'In Triage', color: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-200' },
  contacted: { label: 'Contacted', color: 'text-purple-800', bg: 'bg-purple-50', border: 'border-purple-200' },
  quote_sent: { label: 'Quote Sent', color: 'text-emerald-800', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  resolved: { label: 'Resolved', color: 'text-gray-700', bg: 'bg-gray-100', border: 'border-gray-300' },
  archived: { label: 'Archived', color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200' },
};

export function AdminInquiries() {
  const { inquiries, updateInquiryStatus, addInquiryNote, deleteInquiry } = useAdminStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');

  // Counts
  const totalCount = inquiries.length;
  const newCount = inquiries.filter((i) => i.status === 'new').length;
  const inProgressCount = inquiries.filter((i) => i.status === 'in_progress').length;
  const ndisCount = inquiries.filter((i) => i.enquiryType === 'ndis' || i.ndisNumber).length;

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const s = (search || '').toLowerCase();
      const matchesSearch =
        !s ||
        (inq.name || '').toLowerCase().includes(s) ||
        (inq.email || '').toLowerCase().includes(s) ||
        (inq.phone || '').includes(s) ||
        Boolean(inq.ndisNumber && inq.ndisNumber.includes(s)) ||
        Boolean(inq.equipmentInterest && inq.equipmentInterest.toLowerCase().includes(s)) ||
        (inq.message || '').toLowerCase().includes(s);

      const matchesStatus = statusFilter === 'all' || inq.status === statusFilter;
      const matchesType = typeFilter === 'all' || inq.enquiryType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [inquiries, search, statusFilter, typeFilter]);

  const activeInquiry = selectedInquiryId ? inquiries.find((i) => i.id === selectedInquiryId) : null;

  const handleAddNote = (id: string) => {
    if (!newNoteText.trim()) return;
    addInquiryNote(id, newNoteText.trim());
    setNewNoteText('');
  };

  return (<div className="space-y-6 pb-12 animate-fade-in">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#147A7A] uppercase tracking-wider">Leads & Patient Triage</span>
            <span className="text-gray-300">&bull;</span>
            <span className="text-xs text-gray-500 font-medium">Inquiries & Assessment Requests</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-0.5">Contact Requests & NDIS Leads</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Manage incoming contact requests, NDIS quote submissions, trial bookings, and clinical equipment inquiries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {newCount} New Unread Inquiries
          </span>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Total Leads</span>
          <p className="text-2xl font-semibold text-slate-900 mt-1">{totalCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">New Inquiries</span>
          <p className="text-2xl font-semibold text-amber-700 mt-1">{newCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</span>
          <p className="text-2xl font-semibold text-blue-900 mt-1">{inProgressCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">NDIS Related</span>
          <p className="text-2xl font-semibold text-[#147A7A] mt-1">{ndisCount}</p>
        </div>
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, email, NDIS number or message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] bg-white text-[#0F1E2E]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="new">New Leads</option>
              <option value="in_progress">In Triage</option>
              <option value="contacted">Contacted</option>
              <option value="quote_sent">Quote Sent</option>
              <option value="resolved">Resolved</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm bg-white text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 cursor-pointer"
            >
              <option value="all">All Enquiry Types</option>
              <option value="ndis">NDIS Quote / Support</option>
              <option value="trial">Equipment Home Trial</option>
              <option value="hire">Equipment Hire</option>
              <option value="product">Product Enquiry</option>
              <option value="general">General Enquiry</option>
              <option value="support">Repairs & Support</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. INQUIRIES LIST */}
      <div className="space-y-4">
        {filteredInquiries.length === 0 ? (<div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-900">No customer inquiries found</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Try clearing your filters or search keywords.</p>
          </div>) : (filteredInquiries.map((inq) => {
            const statusCfg = inquiryStatusConfig[inq.status];

            return (<div
                key={inq.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm space-y-4 transition-all ${
                  inq.status === 'new'
                    ? 'border-amber-300 bg-amber-50/20 shadow-md ring-1 ring-amber-300/50'
                    : 'border-gray-200 hover:border-[#147A7A]/40'
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{inq.name}</span>
                    <span className="text-xs text-gray-400 font-mono">({inq.id})</span>

                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-md capitalize">
                      {inq.enquiryType.replace('-', ' ')}
                    </span>

                    {inq.ndisNumber && (<span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-50 text-[#147A7A] rounded-md text-xs font-bold border border-teal-200">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        NDIS #{inq.ndisNumber}
                      </span>)}

                    {inq.planManager && (<span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded">
                        Plan: {inq.planManager}
                      </span>)}
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="text-xs text-gray-400 font-medium">{inq.createdAt}</span>

                    {/* Status Dropdown */}
                    <select
                      value={inq.status}
                      onChange={(e) => updateInquiryStatus(inq.id, e.target.value as any)}
                      className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer focus:outline-none ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                    >
                      <option value="new">New Lead</option>
                      <option value="in_progress">In Triage</option>
                      <option value="contacted">Contacted</option>
                      <option value="quote_sent">Quote Sent</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {/* Contact & Equipment Interest Info */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#F8FAFC] p-3.5 rounded-xl text-xs">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#147A7A]" />
                    <a href={`tel:${inq.phone}`} className="font-bold text-gray-800 hover:text-[#147A7A] hover:underline font-mono">
                      {inq.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#147A7A]" />
                    <a href={`mailto:${inq.email}`} className="font-bold text-gray-800 hover:text-[#147A7A] hover:underline font-mono">
                      {inq.email}
                    </a>
                  </div>
                  {inq.equipmentInterest && (<div className="flex items-center gap-2 sm:col-span-1">
                      <span className="font-semibold text-gray-500">Equipment:</span>
                      <span className="font-bold text-gray-900 line-clamp-1">{inq.equipmentInterest}</span>
                    </div>)}
                </div>

                {/* Message Body */}
                <div className="space-y-1">
                  {inq.subject && <h4 className="text-xs font-bold text-gray-900">{inq.subject}</h4>}
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed bg-white p-3 rounded-xl border border-gray-100">
                    {inq.message}
                  </p>
                </div>

                {/* Clinical Notes Thread */}
                {inq.notes && (<div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                      Internal Clinical & Triage Notes:
                    </span>
                    <p className="text-xs text-amber-900 whitespace-pre-line leading-relaxed">{inq.notes}</p>
                  </div>)}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${inq.phone}`}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#147A7A]" />
                      <span>Call ({inq.phone})</span>
                    </a>

                    <a
                      href={`mailto:${inq.email}?subject=RE: AT Specialists - ${inq.enquiryType.toUpperCase()} Enquiry`}
                      className="px-3 py-1.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email Reply</span>
                    </a>

                    <Link
                      to={`/at/invoices?inquiryId=${inq.id}`}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#147A7A] border border-teal-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Create Quote / Invoice</span>
                    </Link>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInquiryId(selectedInquiryId === inq.id ? null : inq.id);
                      }}
                      className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>{selectedInquiryId === inq.id ? 'Close Notes' : 'Add Note'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Delete this contact inquiry?')) {
                          deleteInquiry(inq.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete Inquiry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Inline Add Note Input Box */}
                {selectedInquiryId === inq.id && (<div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 animate-fade-in">
                    <label className="block text-xs font-bold text-gray-700">Add Internal Clinical Note:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="e.g. Spoke with OT Mark, scheduled home trial for Friday 10am..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#147A7A]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNote(inq.id)}
                        className="px-4 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-lg shadow-sm whitespace-nowrap cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Save Note</span>
                      </button>
                    </div>
                  </div>)}
              </div>);
          }))}
      </div>
    </div>);
}

export default AdminInquiries;

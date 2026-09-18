import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAdminStore, type QuoteStatus } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Search, FileText, Eye, CheckCircle, Clock, XCircle, Send, Download, Plus } from 'lucide-react';

const quoteStatusConfig: Record<QuoteStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border border-amber-200', icon: Clock },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 border border-gray-200', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-50 text-blue-700 border border-blue-200', icon: Send },
  approved: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle },
  invoiced: { label: 'Invoiced', color: 'bg-violet-50 text-violet-700 border border-violet-200', icon: Clock },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border border-red-200', icon: XCircle },
  converted: { label: 'Converted to Order', color: 'bg-teal-50 text-teal-700 border border-teal-200', icon: CheckCircle },
};

export function AdminQuotes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { ndisQuotes, updateNdisQuoteStatus } = useAdminStore();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);

  // Sync with top-bar quick search (?search=...) on every navigation
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const filteredQuotes = ndisQuotes.filter((q) => {
    const s = (search || '').toLowerCase();
    const matchesSearch =
      !s ||
      (q.customerName || '').toLowerCase().includes(s) ||
      (q.ndisNumber || '').toLowerCase().includes(s) ||
      (q.id || '').toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const quote = selectedQuote ? ndisQuotes.find((q) => q.id === selectedQuote) : null;

  return (<div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Sales Hub
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">NDIS Assistive Technology Quotations</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">NDIS Equipment Quotes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{ndisQuotes.length} total quotes generated</p>
        </div>
        <button
          onClick={() => navigate('/at/invoices?tab=workflow&topic=ndis_quote')}
          className="inline-flex items-center gap-2 bg-[#147A7A] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#106262] transition-all cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Quote</span>
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {[{ key: 'all', label: 'All' },...Object.entries(quoteStatusConfig).map(([key, c]) => ({ key, label: c.label }))].map((s) => (<button
            key={s.key}
            onClick={() => setStatusFilter(s.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              statusFilter === s.key ? 'bg-[#147A7A] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {s.label}
          </button>))}
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, NDIS number or quote ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A]"
          />
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Quote ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">NDIS #</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Plan Manager</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Valid Until</th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredQuotes.length === 0 ? (<tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No quotes found</p>
                  </td>
                </tr>) : (filteredQuotes.map((q) => {
                  const cfg = quoteStatusConfig[q.status] || quoteStatusConfig.pending;
                  const StatusIcon = cfg.icon;
                  const isHire = q.quoteType === 'hire' || q.id.startsWith('HIR');
                  return (<tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-900 font-mono">{q.id}</span>
                          <span className={`text-xs font-semibold ${
                            isHire ? 'text-amber-700' : 'text-[#147A7A]'
                          }`}>
                            &middot; {isHire ? 'Hire Quote' : 'NDIS Quote'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {(() => {
                            const qty = (q.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
                            return `${qty} ${qty === 1 ? 'item' : 'items'}`;
                          })()}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-medium text-gray-900">{q.customerName}</p>
                        {q.prescriberName && (
                          <p className="text-[11px] text-teal-700 font-medium">
                            OT: {q.prescriberName} {q.prescriberOrg ? `(${q.prescriberOrg})` : ''}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600 text-xs font-mono">{q.ndisNumber}</td>
                      <td className="px-6 py-3.5 text-gray-600 text-sm">{q.planManager}</td>
                      <td className="px-6 py-3.5 font-medium text-gray-900">{formatCurrency(q.total)}</td>
                      <td className="px-6 py-3.5">
                        <select
                          value={q.status}
                          onChange={(e) => updateNdisQuoteStatus(q.id, e.target.value as QuoteStatus)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-[#147A7A]/20 ${cfg.color}`}
                        >
                          {Object.entries(quoteStatusConfig).map(([key, c]) => (<option key={key} value={key}>{c.label}</option>))}
                        </select>
                      </td>
                      <td className="px-6 py-3.5 text-gray-500 text-xs">{q.validUntil}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            to={`/view/${q.id}`}
                            target="_blank"
                            title="View Document Portal & PDF"
                            className="p-2 rounded-lg hover:bg-teal-50 text-gray-500 hover:text-[#147A7A] transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setSelectedQuote(q.id)}
                            title="View Quote Details"
                            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-slate-800 transition-colors cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <Link
                            to={`/at/invoices?quoteId=${q.id}`}
                            title="Open in Invoice Customizer & Forward to Plan Manager"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#147A7A] font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Edit &amp; Forward</span>
                          </Link>
                        </div>
                      </td>
                    </tr>);
                }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quote Detail Modal */}
      <Modal isOpen={!!selectedQuote} onClose={() => setSelectedQuote(null)} title={quote ? `${quote.quoteType === 'hire' || quote.id.startsWith('HIR') ? 'Hire Agreement Quote' : 'NDIS Quote'} ${quote.id}` : ''} size="lg">
        {quote && (<div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Customer / Participant</p>
                <p className="font-bold text-gray-900">{quote.customerName}</p>
                <p className="text-sm text-gray-600">NDIS #: <span className="font-mono font-bold text-teal-700">{quote.ndisNumber || 'N/A'}</span></p>
                {quote.participantDob && <p className="text-xs text-gray-500">DOB: <span className="font-mono">{quote.participantDob}</span></p>}
                {quote.customerEmail && <p className="text-xs text-gray-500">{quote.customerEmail}</p>}
                {quote.customerPhone && <p className="text-xs text-gray-500">{quote.customerPhone}</p>}
                {quote.shippingAddress && <p className="text-xs text-gray-600 mt-1 border-t border-slate-200 pt-1">Delivery: {quote.shippingAddress}</p>}
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Plan Management / Funding</p>
                <p className="font-bold text-gray-900">{quote.planManager || (quote.planType === 'self_managed' ? 'Self-Managed Participant' : 'NDIS Funded')}</p>
                {quote.planManagerEmail && <p className="text-xs text-teal-700 font-mono">{quote.planManagerEmail}</p>}
                <p className="text-xs text-gray-500 mt-1">Pricing: NDIA Price Arrangements Compliant</p>
                <p className="text-xs text-emerald-700 font-semibold">GST Status: GST-Free (s38-45)</p>
              </div>
            </div>

            {/* Prescribing Clinician Card */}
            {quote.prescriberName && (
              <div className="bg-teal-50/70 border border-teal-200 p-3.5 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between border-b border-teal-200 pb-1">
                  <span className="font-bold uppercase tracking-wider text-[10.5px] text-[#147A7A]">
                    Prescribing Clinician / Occupational Therapist:
                  </span>
                  <span className="text-[10px] text-teal-700 font-semibold">Clinical Script</span>
                </div>
                <p className="font-bold text-slate-900 text-sm">{quote.prescriberName} {quote.prescriberOrg ? `(${quote.prescriberOrg})` : ''}</p>
                {(quote.prescriberPhone || quote.prescriberEmail) && (
                  <p className="text-slate-600 font-mono">
                    {quote.prescriberPhone} {quote.prescriberPhone && quote.prescriberEmail ? '• ' : ''} {quote.prescriberEmail}
                  </p>
                )}
                {quote.clinicalRationale && (
                  <p className="text-slate-700 italic pt-1 border-t border-teal-100">
                    &ldquo;{quote.clinicalRationale}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Hire Schedule Card */}
            {(quote.quoteType === 'hire' || quote.id.startsWith('HIR')) && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs space-y-1.5 text-amber-950">
                <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                  <span className="font-bold uppercase tracking-wider text-[10.5px] text-amber-900">
                    Equipment Hire Schedule &amp; Agreement (Rehab Hire Standards):
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/80 rounded-full">
                    {quote.hireDurationWeeks || 2} Weeks Initial
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <p><span className="text-amber-800">Start Date:</span> <strong>{quote.hireStartDate || 'Immediate Dispatch'}</strong></p>
                    <p><span className="text-amber-800">Est. Return Date:</span> <strong>{quote.hireReturnDate || 'Ongoing weekly thereafter'}</strong></p>
                  </div>
                  <div>
                    <p><span className="text-amber-800">Destination:</span> <strong>{quote.hireLocationType === 'hospital' ? 'Hospital Inpatient' : 'Private Residence'}</strong></p>
                    {quote.hireFacilityName && (
                      <p className="text-[11px] text-amber-900">
                        {quote.hireFacilityName} (Ward: {quote.hireFacilityWard || '-'}, Room: {quote.hireFacilityRoom || '-'})
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-1.5 border-t border-amber-200 text-[11px] text-amber-900 font-medium">
                  ⭐ <strong>100% Purchase Credit Rebate:</strong> 100% of hire fees paid (up to 4 wks) credited if purchased during rental.
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Line Items &amp; Support Categories</p>
              <div className="space-y-2">
                {quote.items.map((item, idx) => {
                  let extras = (item as any).selectedExtras;
                  if (!extras && typeof (item as any).selected_extras === 'string' && (item as any).selected_extras.startsWith('[')) {
                    try { extras = JSON.parse((item as any).selected_extras); } catch { /* keep raw value on parse failure */ }
                  }
                  const hasExtras = Array.isArray(extras) && extras.length > 0;

                  return (<div key={idx} className="flex items-start justify-between bg-gray-50 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        {((item as any).code || (item as any).sku || (item as any).productId || (item as any).id) && (<span className="text-[10px] font-mono font-bold text-[#147A7A] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                            {(item as any).code || (item as any).sku || (item as any).productId || (item as any).id}
                          </span>)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.fundingCategory || 'NDIS Core 0103'} &middot; Qty: {item.quantity}
                        {(item as any).detail ? ` &middot; ${(item as any).detail}` : ''}
                      </p>
                      {hasExtras && (<div className="mt-1.5 p-2 bg-white rounded-lg border border-gray-200 text-xs text-gray-700 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          Included Extras:
                        </span>
                        {extras.map((extra: any, eIdx: number) => (
                          <div key={extra.id || eIdx} className="flex items-center gap-1">
                            <span className="text-emerald-600 font-bold">+</span>
                            <span>{extra.name}</span>
                            {extra.price !== undefined && (
                              <span className="font-semibold text-gray-900">(${Number(extra.price).toFixed(2)})</span>
                            )}
                          </div>
                        ))}
                      </div>)}
                    </div>
                    <p className="text-sm font-medium text-gray-900 pt-0.5">{formatCurrency(item.price * item.quantity)}</p>
                  </div>);
                })}
              </div>
              <div className="flex items-center justify-between mt-3 px-4 py-2 bg-gray-100 rounded-xl">
                <span className="font-semibold text-gray-900">Total Quoted Amount</span>
                <span className="font-bold text-teal-800 text-base">{formatCurrency(quote.total)} AUD</span>
              </div>
            </div>
            {quote.notes && (<div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">Prescription &amp; Clinical Notes</p>
                <p className="text-sm text-gray-700 bg-slate-50 p-2.5 rounded-lg">{quote.notes}</p>
              </div>)}
            <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Created: {quote.createdAt}</span>
                <span className="text-gray-300">|</span>
                <span>Valid until: {quote.validUntil}</span>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/view/${quote.id}`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Document Portal</span>
                </Link>
                <Link
                  to={`/at/invoices?quoteId=${quote.id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Open in Invoice Editor</span>
                </Link>
              </div>
            </div>
          </div>)}
      </Modal>
    </div>);
}

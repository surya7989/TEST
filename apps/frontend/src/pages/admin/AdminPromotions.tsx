import { useState, useEffect } from 'react';
import { Tag, Plus, Percent, DollarSign, Copy, Trash2, Truck, Edit2, Save, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { getPromotions, createPromotion, updatePromotion, deletePromotionApi } from '@/lib/api';

interface Promotion {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  usageCount: number;
  maxUsage: number | null;
  expiresAt: string;
  active: boolean;
  description: string;
}

// Offline fallback mirrors the server factory seeds (same 3 codes).
const initialPromotions: Promotion[] = [
  { id: 'promo-ndis10', code: 'NDIS10', type: 'percentage', value: 10, minOrder: 200, usageCount: 0, maxUsage: null, expiresAt: '2026-12-31', active: true, description: '10% off for NDIS participants on orders over $200' },
  { id: 'promo-welcome50', code: 'WELCOME50', type: 'fixed', value: 50, minOrder: 300, usageCount: 0, maxUsage: null, expiresAt: '2026-12-31', active: true, description: '$50 off orders over $300' },
  { id: 'promo-freeship', code: 'FREESHIP', type: 'free_shipping', value: 0, minOrder: 100, usageCount: 0, maxUsage: null, expiresAt: '2026-12-31', active: true, description: 'Free shipping on orders over $100' },
];

export function AdminPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [apiOnline, setApiOnline] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Promotion, 'id' | 'usageCount'>>({ code: '', type: 'percentage', value: 0, minOrder: 0, maxUsage: null, expiresAt: '', active: true, description: '' });

  // Load live coupon codes from the server (these are the codes checkout validates).
  useEffect(() => {
    let active = true;
    getPromotions()
      .then((res) => {
        if (!active) return;
        setApiOnline(true);
        if (Array.isArray(res.promotions)) setPromotions(res.promotions as Promotion[]);
      })
      .catch(() => {
        if (active) setApiOnline(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const resetForm = () => { setFormData({ code: '', type: 'percentage', value: 0, minOrder: 0, maxUsage: null, expiresAt: '', active: true, description: '' }); setEditingId(null); };

  const openAdd = () => { resetForm(); setShowForm(true); };
  const openEdit = (id: string) => {
    const p = promotions.find((pr) => pr.id === id);
    if (p) { setFormData({ code: p.code, type: p.type, value: p.value, minOrder: p.minOrder, maxUsage: p.maxUsage, expiresAt: p.expiresAt, active: p.active, description: p.description }); setEditingId(id); setShowForm(true); }
  };

  const handleSubmit = async () => {
    if (!formData.code) return;
    try {
      if (editingId) {
        const res = await updatePromotion(editingId, {...formData, code: formData.code.toUpperCase() });
        setPromotions((prev) => prev.map((p) => (p.id === editingId ? (res.promotion as Promotion) : p)));
      } else {
        const res = await createPromotion({...formData, code: formData.code.toUpperCase() });
        setPromotions((prev) => [res.promotion as Promotion,...prev]);
      }
      setShowForm(false); resetForm();
    } catch (err: any) {
      alert(err.message || 'Could not save promotion. Check the backend connection.');
    }
  };

  const togglePromo = async (id: string) => {
    const current = promotions.find((p) => p.id === id);
    setPromotions((prev) => prev.map((p) => (p.id === id ? {...p, active: !p.active } : p)));
    try {
      await updatePromotion(id, { active: !(current?.active ?? true) });
    } catch {
      setApiOnline(false);
    }
  };
  const deletePromo = async (id: string) => {
    if (!window.confirm('Delete this promotion?')) return;
    setPromotions((prev) => prev.filter((p) => p.id !== id));
    try {
      await deletePromotionApi(id);
    } catch {
      setApiOnline(false);
    }
  };

  const activeCount = promotions.filter((p) => p.active).length;
  const totalUsage = promotions.reduce((sum, p) => sum + p.usageCount, 0);

  return (<div className="space-y-6">
      {!apiOnline && (<div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>Coupon server unreachable — showing built-in codes. Changes will not reach checkout until the backend reconnects.</span>
        </div>)}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
          <p className="text-gray-500 text-sm mt-1">{promotions.length} codes &middot; {activeCount} active &middot; {totalUsage} total uses</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 bg-[#147A7A] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#106262] transition-all">
          <Plus className="w-4 h-4" /> Create Promotion
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-5"><p className="text-xs sm:text-sm text-gray-500 font-medium">Active Codes</p><p className="text-lg sm:text-2xl font-bold text-gray-900">{activeCount}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-5"><p className="text-xs sm:text-sm text-gray-500 font-medium">Total Uses</p><p className="text-lg sm:text-2xl font-bold text-gray-900">{totalUsage}</p></div>
        <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-5"><p className="text-xs sm:text-sm text-gray-500 font-medium">Percentage</p><p className="text-lg sm:text-2xl font-bold text-gray-900">{promotions.filter((p) => p.type === 'percentage').length}</p></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Code</th>
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Description</th>
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Value</th>
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Min Order</th>
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Usage</th>
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Expires</th>
                <th className="text-left px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-3 sm:px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {promotions.map((promo) => (<tr key={promo.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 sm:px-2.5 bg-gray-100 rounded-lg text-xs font-bold tracking-wider text-gray-800">{promo.code}</code>
                      <button onClick={() => navigator.clipboard.writeText(promo.code)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Copy"><Copy className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-gray-600 text-xs max-w-[200px] truncate hidden md:table-cell">{promo.description}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      {promo.type === 'percentage' && <><Percent className="w-3.5 h-3.5" /><span className="text-xs hidden sm:inline">Percentage</span><span className="text-xs sm:hidden">%</span></>}
                      {promo.type === 'fixed' && <><DollarSign className="w-3.5 h-3.5" /><span className="text-xs hidden sm:inline">Fixed</span><span className="text-xs sm:hidden">$</span></>}
                      {promo.type === 'free_shipping' && <><Truck className="w-3.5 h-3.5" /><span className="text-xs hidden sm:inline">Free Ship</span><span className="text-xs sm:hidden">Ship</span></>}
                    </span>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5 font-medium text-gray-900 text-xs sm:text-sm">{promo.type === 'percentage' ? `${promo.value}%` : promo.type === 'fixed' ? formatCurrency(promo.value) : 'Free'}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-gray-600 text-xs sm:text-sm hidden lg:table-cell">{promo.minOrder > 0 ? formatCurrency(promo.minOrder) : 'None'}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-gray-600 text-xs sm:text-sm">{promo.usageCount}{promo.maxUsage ? ` / ${promo.maxUsage}` : ''}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-gray-500 text-xs hidden lg:table-cell">{promo.expiresAt}</td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={promo.active} onChange={() => togglePromo(promo.id)} className="sr-only peer" />
                      <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-[#147A7A]" />
                    </label>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-3.5 text-right">
                    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                      <button onClick={() => openEdit(promo.id)} className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#147A7A] transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => deletePromo(promo.id)} className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editingId ? 'Edit Promotion' : 'New Promotion'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Code *</label><input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" placeholder="SUMMER20" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label><select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as 'percentage' | 'fixed' | 'free_shipping' })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20"><option value="percentage">Percentage Discount</option><option value="fixed">Fixed Amount</option><option value="free_shipping">Free Shipping</option></select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Value *</label><input type="number" value={formData.value || ''} onChange={(e) => setFormData({...formData, value: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" placeholder="10" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Min Order ($)</label><input type="number" value={formData.minOrder || ''} onChange={(e) => setFormData({...formData, minOrder: Number(e.target.value) })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" placeholder="0" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Max Uses</label><input type="number" value={formData.maxUsage || ''} onChange={(e) => setFormData({...formData, maxUsage: e.target.value ? Number(e.target.value) : null })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" placeholder="Unlimited" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Expires</label><input type="date" value={formData.expiresAt} onChange={(e) => setFormData({...formData, expiresAt: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label><input type="text" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" placeholder="Describe this promotion..." /></div>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={formData.active} onChange={(e) => setFormData({...formData, active: e.target.checked })} className="rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A]" /><span className="text-sm text-gray-700">Active</span></label>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => { setShowForm(false); resetForm(); }} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={handleSubmit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#147A7A] text-white text-sm font-semibold rounded-xl hover:bg-[#106262] transition-all"><Save className="w-4 h-4" /> {editingId ? 'Save Changes' : 'Create'}</button>
        </div>
      </Modal>
    </div>);
}

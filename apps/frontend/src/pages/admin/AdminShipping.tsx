import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { Truck, Package, MapPin, Clock, Edit2, Plus, Save, Trash2, Box, CreditCard } from 'lucide-react';

export function AdminShipping() {
  const { shippingZones, updateShippingZone } = useAdminStore();
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; regions: string; methods: { name: string; price: number; estimatedDays: string; active: boolean }[] }>({ name: '', regions: '', methods: [] });

  const openEdit = (zoneId: string) => {
    const zone = shippingZones.find((z) => z.id === zoneId);
    if (zone) {
      setEditForm({ name: zone.name, regions: zone.regions, methods: [...zone.methods] });
      setEditingZone(zoneId);
    }
  };

  const saveEdit = () => {
    if (editingZone) {
      updateShippingZone(editingZone, editForm);
      setEditingZone(null);
    }
  };

  const toggleMethod = (idx: number) => {
    const newMethods = [...editForm.methods];
    newMethods[idx] = {...newMethods[idx], active: !newMethods[idx].active };
    setEditForm({...editForm, methods: newMethods });
  };

  const removeMethod = (idx: number) => {
    setEditForm({...editForm, methods: editForm.methods.filter((_, i) => i !== idx) });
  };

  const addMethod = () => {
    setEditForm({...editForm, methods: [...editForm.methods, { name: 'New Method', price: 0, estimatedDays: '3-5 business days', active: true }] });
  };

  const zoneIcons = [Truck, Package, MapPin, Clock, Truck];

  return (<div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
            Operations Hub
          </span>
          <span className="text-slate-400 text-xs">&bull;</span>
          <span className="text-xs text-slate-500 font-medium">Australian Courier &amp; Freight Zones</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Shipping &amp; Logistics</h1>
        <p className="text-gray-500 text-sm mt-0.5">{shippingZones.length} shipping zones configured</p>
      </div>

      {/* Zones */}
      <div className="space-y-4">
        {shippingZones.map((zone, idx) => {
          const Icon = zoneIcons[idx % zoneIcons.length];
          return (<div key={zone.id} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-[#147A7A]/10 rounded-xl"><Icon className="w-4 h-4 sm:w-5 sm:h-5 text-[#147A7A]" /></div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{zone.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-500">{zone.regions}</p>
                  </div>
                </div>
                <button onClick={() => openEdit(zone.id)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#147A7A] transition-colors"><Edit2 className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {zone.methods.map((method, mIdx) => (<div key={mIdx} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${method.active ? 'bg-gray-50 border-gray-200' : 'bg-gray-50/50 border-gray-100 opacity-60'}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{method.name}</p>
                      <p className="text-xs text-gray-500">{method.estimatedDays}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${method.price === 0 ? 'text-emerald-600' : 'text-gray-900'}`}>{method.price === 0 ? 'Free' : formatCurrency(method.price)}</p>
                    </div>
                  </div>))}
              </div>
            </div>);
        })}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editingZone} onClose={() => setEditingZone(null)} title="Edit Shipping Zone" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Zone Name</label>
            <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Regions</label>
            <textarea value={editForm.regions} onChange={(e) => setEditForm({...editForm, regions: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 resize-none" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Shipping Methods</label>
              <button onClick={addMethod} className="inline-flex items-center gap-1 text-xs font-medium text-[#147A7A] hover:underline"><Plus className="w-3.5 h-3.5" /> Add Method</button>
            </div>
            <div className="space-y-3">
              {editForm.methods.map((method, idx) => (<div key={idx} className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input type="text" value={method.name} onChange={(e) => { const m = [...editForm.methods]; m[idx] = {...m[idx], name: e.target.value }; setEditForm({...editForm, methods: m }); }} className="font-medium text-sm bg-transparent border-b border-gray-200 focus:border-[#147A7A] outline-none flex-1" />
                    <button onClick={() => removeMethod(idx)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Price ($)</label>
                      <input type="number" value={method.price} onChange={(e) => { const m = [...editForm.methods]; m[idx] = {...m[idx], price: Number(e.target.value) }; setEditForm({...editForm, methods: m }); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Estimated Delivery</label>
                      <input type="text" value={method.estimatedDays} onChange={(e) => { const m = [...editForm.methods]; m[idx] = {...m[idx], estimatedDays: e.target.value }; setEditForm({...editForm, methods: m }); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={method.active} onChange={() => toggleMethod(idx)} className="rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A]" />
                    <span className="text-sm text-gray-600">Active</span>
                  </label>
                </div>))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setEditingZone(null)} className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
          <button onClick={saveEdit} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#147A7A] text-white text-sm font-semibold rounded-xl hover:bg-[#106262] transition-all"><Save className="w-4 h-4" /> Save Changes</button>
        </div>
      </Modal>
    </div>);
}

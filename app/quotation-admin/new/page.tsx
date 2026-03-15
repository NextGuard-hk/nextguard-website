'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
  currency: string;
  category: string;
}

interface LineItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  currency: string;
}

function useAuth() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const t = localStorage.getItem('qt_token');
    if (!t) { router.push('/quotation-login'); return; }
    setToken(t);
  }, [router]);
  return token;
}

export default function NewQuotation() {
  const router = useRouter();
  const token = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    client_name: '',
    client_company: '',
    client_email: '',
    client_phone: '',
    client_address: '',
    currency: 'HKD',
    valid_days: 30,
    notes: '',
    terms: 'Payment due within 30 days of invoice date.',
  });

  const [items, setItems] = useState<LineItem[]>([{
    product_id: '',
    product_name: '',
    sku: '',
    quantity: 1,
    unit_price: 0,
    discount_percent: 0,
    currency: 'HKD',
  }]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/qt-products', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setProducts(d.products || []))
      .catch(() => {});
  }, [token]);

  function updateForm(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addItem() {
    setItems(prev => [...prev, { product_id: '', product_name: '', sku: '', quantity: 1, unit_price: 0, discount_percent: 0, currency: form.currency }]);
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: string, value: string | number) {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      const updated = { ...item, [field]: value };
      if (field === 'product_id') {
        const p = products.find(p => p.id === value);
        if (p) {
          updated.product_name = p.name;
          updated.sku = p.sku;
          updated.unit_price = p.unit_price;
          updated.currency = p.currency;
        }
      }
      return updated;
    }));
  }

  function calcSubtotal(item: LineItem) {
    return item.quantity * item.unit_price * (1 - item.discount_percent / 100);
  }

  const total = items.reduce((s, i) => s + calcSubtotal(i), 0);

  async function handleSubmit(e: React.FormEvent, status = 'draft') {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSaving(true);
    try {
      const res = await fetch('/api/qt-quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, status, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');
      router.push(`/quotation-admin/${data.quotation.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/quotation-admin')} className="text-gray-400 hover:text-white text-sm">&larr; Back</button>
        <h1 className="text-lg font-bold">New Quotation</h1>
      </nav>

      <form onSubmit={e => handleSubmit(e, 'draft')} className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Client Info */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Client Information</h2>
          <div className="grid grid-cols-2 gap-4">
            {[['client_name','Contact Name'],['client_company','Company'],['client_email','Email'],['client_phone','Phone']].map(([f, label]) => (
              <div key={f}>
                <label className="block text-sm text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  value={(form as any)[f]}
                  onChange={e => updateForm(f, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
            <div className="col-span-2">
              <label className="block text-sm text-gray-400 mb-1">Address</label>
              <input type="text" value={form.client_address} onChange={e => updateForm('client_address', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Quotation Settings</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Currency</label>
              <select value={form.currency} onChange={e => updateForm('currency', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none">
                <option>HKD</option><option>USD</option><option>CNY</option><option>EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Valid Days</label>
              <input type="number" value={form.valid_days} onChange={e => updateForm('valid_days', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Products / Line Items</h2>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Product</label>}
                  <select
                    value={item.product_id}
                    onChange={e => updateItem(i, 'product_id', e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-white focus:outline-none"
                  >
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Qty</label>}
                  <input type="number" min={1} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Unit Price</label>}
                  <input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Disc%</label>}
                  <input type="number" min={0} max={100} value={item.discount_percent} onChange={e => updateItem(i, 'discount_percent', parseFloat(e.target.value))} className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-2 text-sm text-white focus:outline-none" />
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="block text-xs text-gray-500 mb-1">Subtotal</label>}
                  <div className="py-2 text-sm text-right text-gray-300">{calcSubtotal(item).toLocaleString(undefined,{minimumFractionDigits:2})}</div>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-400 text-sm py-2">✕</button>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-4 text-sm text-blue-400 hover:text-blue-300">+ Add Item</button>
          <div className="mt-4 pt-4 border-t border-gray-800 text-right">
            <span className="text-gray-400 text-sm mr-4">Total ({form.currency})</span>
            <span className="text-xl font-bold">{total.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Notes & Terms</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none resize-none" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Terms & Conditions</label>
              <textarea value={form.terms} onChange={e => updateForm('terms', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none resize-none" />
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.push('/quotation-admin')} className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button type="button" disabled={saving} onClick={e => handleSubmit(e as any, 'sent')} className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Mark Sent'}
          </button>
        </div>
      </form>
    </div>
  );
}

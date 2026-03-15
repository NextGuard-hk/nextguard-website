'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface QuotationDetail {
  id: string;
  quote_number: string;
  client_name: string;
  client_company: string;
  client_email: string;
  client_phone: string;
  client_address: string;
  status: string;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  valid_until: string;
  notes: string;
  terms: string;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    sku: string;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percent: number;
    line_total: number;
  }>;
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

const STATUS_OPTIONS = ['draft','sent','accepted','rejected','expired'];
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-200',
  sent: 'bg-blue-900 text-blue-200',
  accepted: 'bg-green-900 text-green-200',
  rejected: 'bg-red-900 text-red-200',
  expired: 'bg-yellow-900 text-yellow-200',
};

export default function QuotationDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const token = useAuth();
  const [q, setQ] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    fetch(`/api/qt-quotations/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 401) { router.push('/quotation-login'); throw new Error('auth'); } return r.json(); })
      .then(d => setQ(d.quotation))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, id, router]);

  async function updateStatus(status: string) {
    if (!token) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/qt-quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok) setQ(data.quotation);
    } finally {
      setUpdating(false);
    }
  }

  async function handleExport() {
    if (!token) return;
    setExporting(true);
    setExportUrl('');
    try {
      const res = await fetch(`/api/qt-quotations/${id}/export`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setExportUrl(data.url);
        window.open(data.url, '_blank');
      }
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Loading...</div>;
  if (!q) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Quotation not found.</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/quotation-admin')} className="text-gray-400 hover:text-white text-sm">&larr; Back</button>
          <h1 className="text-lg font-bold">{q.quote_number}</h1>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[q.status] || 'bg-gray-700'}`}>{q.status}</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={q.status}
            onChange={e => updateStatus(e.target.value)}
            disabled={updating}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none"
          >
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {exportUrl && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-sm text-green-300">
            Excel exported! <a href={exportUrl} target="_blank" rel="noreferrer" className="underline">Download again</a>
          </div>
        )}

        {/* Client */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase mb-4">Client</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500">Name: </span><span>{q.client_name}</span></div>
            <div><span className="text-gray-500">Company: </span><span>{q.client_company}</span></div>
            <div><span className="text-gray-500">Email: </span><span>{q.client_email}</span></div>
            <div><span className="text-gray-500">Phone: </span><span>{q.client_phone}</span></div>
            {q.client_address && <div className="col-span-2"><span className="text-gray-500">Address: </span><span>{q.client_address}</span></div>}
          </div>
        </div>

        {/* Items */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase">Line Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3 text-right">Qty</th>
                <th className="px-6 py-3 text-right">Unit Price</th>
                <th className="px-6 py-3 text-right">Disc%</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {q.items.map(item => (
                <tr key={item.id} className="border-b border-gray-800">
                  <td className="px-6 py-3">{item.product_name}</td>
                  <td className="px-6 py-3 text-gray-400 font-mono">{item.sku}</td>
                  <td className="px-6 py-3 text-right">{item.quantity}</td>
                  <td className="px-6 py-3 text-right">{q.currency} {Number(item.unit_price).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right">{item.discount_percent}%</td>
                  <td className="px-6 py-3 text-right font-semibold">{q.currency} {Number(item.line_total).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-6 py-4 border-t border-gray-800 space-y-1 text-sm">
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{q.currency} {Number(q.subtotal).toLocaleString()}</span></div>
            {Number(q.discount_amount) > 0 && <div className="flex justify-between text-gray-400"><span>Discount</span><span>-{q.currency} {Number(q.discount_amount).toLocaleString()}</span></div>}
            {Number(q.tax_amount) > 0 && <div className="flex justify-between text-gray-400"><span>Tax</span><span>{q.currency} {Number(q.tax_amount).toLocaleString()}</span></div>}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-700"><span>Total</span><span>{q.currency} {Number(q.total_amount).toLocaleString()}</span></div>
          </div>
        </div>

        {/* Meta */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Valid Until: </span><span>{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : '-'}</span></div>
          <div><span className="text-gray-500">Created: </span><span>{new Date(q.created_at).toLocaleDateString()}</span></div>
          {q.notes && <div className="col-span-2"><span className="text-gray-500">Notes: </span><span>{q.notes}</span></div>}
          {q.terms && <div className="col-span-2"><span className="text-gray-500">Terms: </span><span className="text-gray-300">{q.terms}</span></div>}
        </div>
      </div>
    </div>
  );
}

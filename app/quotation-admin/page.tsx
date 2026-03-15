'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Quotation {
  id: string;
  quote_number: string;
  client_name: string;
  client_company: string;
  status: string;
  total_amount: number;
  currency: string;
  valid_until: string;
  created_at: string;
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

export default function QuotationAdmin() {
  const router = useRouter();
  const token = useAuth();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchQuotations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/qt-quotations?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { router.push('/quotation-login'); return; }
      const data = await res.json();
      setQuotations(data.quotations || []);
    } finally {
      setLoading(false);
    }
  }, [token, search, statusFilter, router]);

  useEffect(() => { fetchQuotations(); }, [fetchQuotations]);

  function logout() {
    localStorage.removeItem('qt_token');
    router.push('/quotation-login');
  }

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-700 text-gray-300',
    sent: 'bg-blue-900 text-blue-300',
    accepted: 'bg-green-900 text-green-300',
    rejected: 'bg-red-900 text-red-300',
    expired: 'bg-yellow-900 text-yellow-300',
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-bold">NextGuard Quotations</h1>
          <button onClick={() => router.push('/quotation-admin/products')} className="text-sm text-gray-400 hover:text-white">Products</button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/quotation-admin/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Quotation
          </button>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-white">Logout</button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Search client / company / quote #..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchQuotations()}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
          <button onClick={fetchQuotations} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Search</button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-20">Loading...</div>
        ) : quotations.length === 0 ? (
          <div className="text-center text-gray-500 py-20">
            <p className="text-lg">No quotations yet.</p>
            <button onClick={() => router.push('/quotation-admin/new')} className="mt-4 text-blue-400 hover:text-blue-300">Create your first quotation</button>
          </div>
        ) : (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-800">
                  <th className="px-6 py-3">Quote #</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Company</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Valid Until</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map(q => (
                  <tr key={q.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-mono text-sm text-blue-400">{q.quote_number}</td>
                    <td className="px-6 py-4">{q.client_name}</td>
                    <td className="px-6 py-4 text-gray-400">{q.client_company}</td>
                    <td className="px-6 py-4">{q.currency} {Number(q.total_amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[q.status] || 'bg-gray-700'}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/quotation-admin/${q.id}`)}
                        className="text-sm text-blue-400 hover:text-blue-300 mr-3"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

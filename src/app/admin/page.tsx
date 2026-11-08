'use client';

import React, { useState, useEffect } from 'react';

export default function AdminDashboardPage() {
  const [driverPhone, setDriverPhone] = useState('');
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [generatedInvite, setGeneratedInvite] = useState<string | null>(null);
  const [inviteList, setInviteList] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      const res = await fetch('/api/v1/fleet/drivers');
      if (res.ok) {
        const data = await res.json();
        setInviteList(data.invitations || []);
      }
    } catch {
      // Handled silently
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/fleet/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: driverPhone, expiresInHours }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate invitation');
      setGeneratedInvite(data.invitation.token);
      setDriverPhone('');
      fetchDrivers();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#191919]">
      <header className="border-b border-neutral-200 bg-white px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">SafeFreight OS · Fleet Admin</h1>
          <p className="text-xs text-neutral-500">Western India Corridor Command Center</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            Tenant Isolated
          </span>
          <button
            onClick={() => {
              document.cookie = 'safefreight-token=; path=/; max-age=0';
              window.location.href = '/login';
            }}
            className="text-xs text-neutral-600 hover:text-neutral-900"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8 space-y-8">
        <section className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-1">Issue Commercial Driver Invitation</h2>
          <p className="text-xs text-neutral-500 mb-4">
            Commercial drivers join this carrier organization via secure single-use invitation tokens.
          </p>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {generatedInvite && (
            <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="block text-xs font-semibold text-emerald-900 uppercase">
                Generated Driver Invitation Token
              </span>
              <code className="text-sm font-mono font-bold text-emerald-800 select-all block mt-1">
                {generatedInvite}
              </code>
              <p className="text-[11px] text-emerald-700 mt-1">
                Share this token with the commercial driver to onboard without creating a new organization.
              </p>
            </div>
          )}

          <form onSubmit={handleCreateInvite} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Driver Phone (AIS-140 Linked)
              </label>
              <input
                type="tel"
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Validity (Hours)
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-neutral-900 text-white rounded font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Issue Invite Token'}
            </button>
          </form>
        </section>

        <section className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Active & Redeemed Driver Invitations</h2>
          {inviteList.length === 0 ? (
            <p className="text-xs text-neutral-400">No driver invitations issued yet for this tenant.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-neutral-500 uppercase tracking-wider">
                    <th className="py-2">Token</th>
                    <th className="py-2">Phone</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Expires At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {inviteList.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 font-mono text-neutral-800">{inv.token}</td>
                      <td className="py-2.5">{inv.phone}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            inv.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-neutral-500">
                        {new Date(inv.expires_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

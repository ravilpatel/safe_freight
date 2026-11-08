'use client';

import React, { useState } from 'react';

export default function LoginPage() {
  const [tab, setTab] = useState<'signin' | 'signup' | 'driver'>('signin');
  const [role, setRole] = useState<'fleet_admin' | 'shipper'>('fleet_admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleFleetOrShipperSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          orgName,
          role,
          orgType: role === 'shipper' ? 'shipper' : 'carrier',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      setStatusMsg(`Account created successfully! Tenant ID: ${data.user.tenantId}`);
      if (typeof document !== 'undefined') {
        document.cookie = `safefreight-token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
      }
      setTimeout(() => {
        window.location.href = role === 'fleet_admin' ? '/admin' : '/shipper';
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDriverOnboard(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setStatusMsg('');

    try {
      const res = await fetch('/api/v1/auth/driver-onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationToken: inviteToken,
          email,
          password,
          fullName,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Driver onboarding failed');
      }

      setStatusMsg(`Driver onboarded successfully into Fleet Organization!`);
      if (typeof document !== 'undefined') {
        document.cookie = `safefreight-token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
      }
      setTimeout(() => {
        window.location.href = '/driver';
      }, 1000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f5f4] text-[#191919] flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">SafeFreight OS</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Enterprise Multi-Tenant Freight Network · Western Freight Corridor
          </p>
        </div>

        <div className="flex border-b border-neutral-200 mb-6">
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${
              tab === 'signin'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
            onClick={() => setTab('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${
              tab === 'signup'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
            onClick={() => setTab('signup')}
          >
            New Org
          </button>
          <button
            type="button"
            className={`flex-1 py-2 text-sm font-medium border-b-2 ${
              tab === 'driver'
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-400 hover:text-neutral-700'
            }`}
            onClick={() => setTab('driver')}
          >
            Driver Invite
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
            {statusMsg}
          </div>
        )}

        {tab === 'signin' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setStatusMsg('Please select New Org or Driver Invite to register.');
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="balwinder@wifl.in"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-neutral-900 text-white rounded font-medium text-sm hover:bg-neutral-800 transition"
            >
              Sign In
            </button>
          </form>
        )}

        {tab === 'signup' && (
          <form onSubmit={handleFleetOrShipperSignup} className="space-y-4">
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs rounded border ${
                  role === 'fleet_admin'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200'
                }`}
                onClick={() => setRole('fleet_admin')}
              >
                Fleet Operator
              </button>
              <button
                type="button"
                className={`flex-1 py-1.5 text-xs rounded border ${
                  role === 'shipper'
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-700 border-neutral-200'
                }`}
                onClick={() => setRole('shipper')}
              >
                Shipper
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Western India Fleet Logistics"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Balwinder Singh"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="balwinder@wifl.in"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="At least 8 characters"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-neutral-900 text-white rounded font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {loading ? 'Creating Organization...' : 'Create Organization & Profile'}
            </button>
          </form>
        )}

        {tab === 'driver' && (
          <form onSubmit={handleDriverOnboard} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Invitation Token
              </label>
              <input
                type="text"
                required
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                placeholder="inv-..."
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Provided by your Fleet Admin. Drivers join existing organizations.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Driver Full Name
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="Ramesh Patel"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="ramesh.driver@wifl.in"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-neutral-900"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-neutral-900 text-white rounded font-medium text-sm hover:bg-neutral-800 transition disabled:opacity-50"
            >
              {loading ? 'Joining Fleet...' : 'Join Fleet as Driver'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

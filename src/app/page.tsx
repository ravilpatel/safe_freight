export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full bg-white border border-[#e0dedb] rounded-lg p-8 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider uppercase text-neutral-500">
            SafeFreight OS v4.0.0
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mb-2">
          Western Freight Corridor Digital Network
        </h1>
        <p className="text-sm text-neutral-600 mb-6">
          Multi-tenant freight coordination, dead mileage minimization, and AIS-140 compliance platform.
        </p>
        <div className="bg-[#f6f5f4] rounded p-4 text-xs font-mono text-neutral-700">
          <div>Status: Operational</div>
          <div>Health Check: /api/v1/health</div>
          <div>Architecture: Multi-Tenant / RLS Enforced</div>
        </div>
      </div>
    </main>
  );
}

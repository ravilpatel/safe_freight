import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#f6f5f4] flex flex-col items-center justify-center p-6 text-[#191919]">
      <div className="max-w-md w-full bg-white rounded-xl border border-[#e5e5e3] p-8 shadow-sm text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#f0f0ef] text-[#787774] mb-4 text-lg font-semibold">
          404
        </div>
        <h1 className="text-xl font-semibold text-[#191919] mb-2 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-sm text-[#787774] mb-6 leading-relaxed">
          The requested SafeFreight OS resource does not exist or has been relocated.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-[#191919] hover:bg-[#333333] rounded-lg transition-colors shadow-sm"
        >
          Return to Console
        </Link>
      </div>
    </main>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeFreight OS — Enterprise Digital Freight Network',
  description: 'Multi-tenant freight coordination and dead mileage minimization on India Western Freight Corridor',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#f6f5f4] text-[#191919]">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import SessionProviderWrapper from '@/components/providers/SessionProviderWrapper';
import Navbar from '@/components/layout/Navbar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zdravstveni e-Karton',
  description: 'Veb aplikacija za elektronski zdravstveni karton',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body className="min-h-screen">
        {/* Sesija se stavlja oko cele aplikacije da bi svaka komponenta
            mogla da sazna ko je prijavljen preko useSession(). */}
        <SessionProviderWrapper>
          <Navbar />
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}

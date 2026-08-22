import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zdravstveni e-Karton',
  description: 'Veb aplikacija za elektronski zdravstveni karton',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  );
}

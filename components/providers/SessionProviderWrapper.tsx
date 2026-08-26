'use client';

import { SessionProvider } from 'next-auth/react';

// NextAuth-ov SessionProvider je klijentska komponenta, a app/layout.tsx je serverska.
// Zato se obmotava u ovaj mali "client" omotac koji layout moze da koristi.
export default function SessionProviderWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

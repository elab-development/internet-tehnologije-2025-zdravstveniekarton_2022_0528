import type { Metadata } from 'next';
import SwaggerViewer from '@/components/docs/SwaggerViewer';

export const metadata: Metadata = {
  title: 'API dokumentacija | Zdravstveni e-Karton',
};

/**
 * Stranica sa API dokumentacijom (/api-docs).
 *
 * Javno je dostupna: dokumentacija opisuje SAMO oblik zahteva i odgovora,
 * ne otkriva nikakve podatke pacijenata. Svaka opisana ruta i dalje trazi
 * prijavu i odgovarajucu ulogu.
 */
export default function ApiDocsPage() {
  return (
    <main className="page-container max-w-6xl">
      <h1 className="text-2xl font-bold text-primary-800">API dokumentacija</h1>
      <p className="mt-1 text-sm text-slate-500">
        Specifikacija je napisana po OpenAPI 3.0 standardu i nalazi se u fajlu{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">public/swagger.json</code>.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-2">
        <SwaggerViewer />
      </div>
    </main>
  );
}

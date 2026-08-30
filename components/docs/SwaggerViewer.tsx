'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

/**
 * Swagger UI se ucitava dinamicki, sa iskljucenim renderovanjem na serveru
 * (ssr: false). Razlog: biblioteka pristupa objektima window i document, koji
 * na serveru ne postoje, pa bi bez ovoga stranica pucala pri build-u.
 *
 * Sporedna korist: kod Swagger UI-ja je velik i ucitava se tek kada korisnik
 * zaista otvori /api-docs, umesto da opterecuje ostale stranice.
 */
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">Ucitavanje dokumentacije...</p>,
});

export default function SwaggerViewer() {
  // Specifikacija stoji u public/ folderu, pa se ucitava sa adrese /swagger.json.
  return <SwaggerUI url="/swagger.json" />;
}

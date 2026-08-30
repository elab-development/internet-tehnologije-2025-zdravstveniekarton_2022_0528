'use client';

import { useEffect, useRef, useState } from 'react';
import 'swagger-ui-dist/swagger-ui.css';

/**
 * Prikaz OpenAPI specifikacije pomocu Swagger UI-ja.
 *
 * Koristi se paket `swagger-ui-dist` (gotov JS bundle), a ne `swagger-ui-react`.
 * Razlog: `swagger-ui-react` povlaci apidom biblioteke sa native modulima
 * (tree-sitter), koji se razlikuju po operativnom sistemu. Zbog toga bi
 * package-lock.json bio razlicit na Windows-u i na Linux-u, pa bi `npm ci`
 * u GitHub Actions pipeline-u pucao. Ovaj paket je obican JavaScript i taj
 * problem ne postoji.
 *
 * Koriscene kuke:
 *  - useRef    -> pokazivac na DOM element u koji Swagger UI iscrtava sadrzaj
 *  - useEffect -> ucitavanje biblioteke tek u browseru, posle prvog prikaza
 *  - useState  -> poruka o gresci ako ucitavanje ne uspe
 */
export default function SwaggerViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Zastava sprecava iscrtavanje ako korisnik napusti stranicu
    // pre nego sto se biblioteka ucita.
    let cancelled = false;

    // Dinamicki uvoz: biblioteka je velika i ucitava se tek kada korisnik
    // otvori ovu stranicu. Uz to, pristupa objektu window, koji na serveru
    // ne postoji - zato uvoz mora biti unutar useEffect-a.
    import('swagger-ui-dist/swagger-ui-es-bundle.js')
      .then((module) => {
        if (cancelled || !containerRef.current) return;

        const SwaggerUIBundle = module.default;
        SwaggerUIBundle({
          url: '/swagger.json',
          domNode: containerRef.current,
          // Sakriva polje za unos druge adrese specifikacije - prikazuje se
          // iskljucivo dokumentacija ove aplikacije.
          docExpansion: 'list',
          defaultModelsExpandDepth: -1,
        });
      })
      .catch(() => {
        if (!cancelled) setError('Dokumentaciju nije moguce ucitati.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="px-4 py-3 text-sm text-danger-700">
        {error}
      </p>
    );
  }

  return <div ref={containerRef} />;
}

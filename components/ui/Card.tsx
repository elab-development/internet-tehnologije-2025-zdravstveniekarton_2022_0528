import type { ReactNode } from 'react';

/**
 * Reusable kartica - beli okvir za grupisanje povezanih podataka.
 *
 * Koristi se za prikaz termina, pregleda, laboratorijskih nalaza i statistike.
 * Naslov i akcije su opcioni, pa ista komponenta pokriva i obican okvir
 * i karticu sa zaglavljem i dugmadima u uglu.
 */

type CardProps = {
  title?: string;
  subtitle?: string;
  /** Sadrzaj u gornjem desnom uglu - obicno dugme ili oznaka statusa. */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Card({ title, subtitle, actions, children, className = '' }: CardProps) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
      {/* Zaglavlje se iscrtava samo ako je prosledjen naslov ili akcija. */}
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            {title && <h2 className="font-semibold text-slate-800">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}

      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

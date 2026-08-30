'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

/**
 * Reusable modalni prozor - koristi se za potvrde (otkazivanje termina),
 * kratke forme i prikaz detalja bez napustanja trenutne stranice.
 *
 * Koriscena kuka:
 *  - useEffect -> hvata pritisak tastera Escape i sprecava skrolovanje pozadine
 *                 dok je modal otvoren
 */

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Dugmad u dnu modala (npr. "Odustani" i "Potvrdi"). */
  footer?: ReactNode;
};

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    // Dok je modal otvoren, stranica ispod ne sme da se skroluje.
    document.body.style.overflow = 'hidden';

    // Funkcija ciscenja - vraca sve u prethodno stanje kada se modal zatvori.
    // Bez nje bi osluskivac ostao zakacen i stranica bi ostala zakljucana.
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    // Zatamnjena pozadina; klik na nju zatvara modal.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={onClose}
      role="presentation"
    >
      {/* stopPropagation sprecava da klik unutar prozora "procuri" do pozadine
          i time slucajno zatvori modal. */}
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zatvori"
            className="rounded px-2 text-xl leading-none text-slate-400 hover:text-slate-600"
          >
            &times;
          </button>
        </header>

        <div className="px-5 py-4 text-sm text-slate-700">{children}</div>

        {footer && (
          <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

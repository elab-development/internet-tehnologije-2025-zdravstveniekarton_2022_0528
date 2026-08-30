'use client';

import { useEffect, useState } from 'react';
import type { Diagnosis } from '@/lib/external/icd10';

type Props = {
  /** Trenutno izabrana dijagnoza (naziv), kontrolisana iz roditeljske forme. */
  value: string;
  /** Javlja roditelju i naziv i ICD-10 sifru izabrane dijagnoze. */
  onSelect: (diagnosis: { name: string; code?: string }) => void;
  error?: string;
};

/**
 * Polje za unos dijagnoze sa predlozima iz ICD-10 baze (eksterni NIH servis).
 *
 * Lekar kuca pojam, a ispod polja se pojavljuju zvanicne sifre i nazivi.
 * Klikom bira predlog, ali sme i da ostavi svoj tekst bez sifre.
 *
 * Koriscene kuke:
 *  - useState  -> uneti pojam, lista predloga, stanje ucitavanja
 *  - useEffect -> pretraga sa odlaganjem (debounce) i ciscenje tajmera
 */
export default function DiagnosisAutocomplete({ value, onSelect, error }: Props) {
  const [term, setTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<Diagnosis[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  // Sifra izabranog predloga; brise se cim lekar rucno izmeni tekst.
  const [selectedCode, setSelectedCode] = useState<string | undefined>();

  useEffect(() => {
    if (term.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce: pretraga krece tek 400ms posle poslednjeg pritiska tastera.
    // Bez toga bi se za rec od 10 slova poslalo 10 zahteva ka eksternom servisu.
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const response = await fetch(`/api/external/icd10?q=${encodeURIComponent(term)}`);
      setIsSearching(false);
      if (!response.ok) return;
      const payload = await response.json();
      setSuggestions(payload.data);
      setIsOpen(true);
    }, 400);

    // Funkcija ciscenja ponistava prethodni tajmer pri svakoj novoj izmeni.
    return () => clearTimeout(timer);
  }, [term]);

  function handleChange(newTerm: string) {
    setTerm(newTerm);
    // Rucna izmena teksta znaci da vise ne vazi ranije izabrana sifra.
    setSelectedCode(undefined);
    onSelect({ name: newTerm, code: undefined });
  }

  function handlePick(diagnosis: Diagnosis) {
    setTerm(diagnosis.name);
    setSelectedCode(diagnosis.code);
    setSuggestions([]);
    setIsOpen(false);
    onSelect({ name: diagnosis.name, code: diagnosis.code });
  }

  return (
    <div className="relative">
      <label htmlFor="diagnosis" className="mb-1 block text-sm font-medium text-slate-700">
        Dijagnoza
      </label>

      <input
        id="diagnosis"
        name="diagnosis"
        autoComplete="off"
        value={term}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => suggestions.length > 0 && setIsOpen(true)}
        placeholder="Ukucajte pojam na engleskom, npr. cough"
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 ${
          error
            ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500'
            : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
        }`}
        aria-invalid={error ? true : undefined}
      />

      {/* Potvrda lekaru da je uz naziv sacuvana i zvanicna sifra. */}
      {selectedCode && (
        <p className="mt-1 text-xs text-success-700">ICD-10 sifra: {selectedCode}</p>
      )}
      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
      {isSearching && <p className="mt-1 text-xs text-slate-500">Pretraga sifara...</p>}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((diagnosis) => (
            <li key={diagnosis.code}>
              <button
                type="button"
                onClick={() => handlePick(diagnosis)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
              >
                <span className="font-mono text-xs text-primary-700">{diagnosis.code}</span>
                <span className="ml-2 text-slate-700">{diagnosis.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

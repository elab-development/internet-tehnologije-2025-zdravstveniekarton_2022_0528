import type { InputHTMLAttributes } from 'react';

/**
 * Reusable polje za unos: labela + input + poruka o gresci.
 *
 * Ranije je ovaj markup bio prepisan u svakoj formi. Sada se pise jednom,
 * a forme samo prosledjuju label, value, onChange i eventualnu gresku.
 */

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
};

export default function Input({
  label,
  error,
  hint,
  id,
  name,
  className = '',
  ...rest
}: InputProps) {
  // Ako id nije prosledjen, koristi se name - labela mora da pokazuje na polje
  // preko htmlFor da bi klik na tekst labele fokusirao polje (pristupacnost).
  const fieldId = id ?? name;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        id={fieldId}
        name={name}
        // Crveni okvir kada postoji greska, da se odmah vidi koje polje treba popraviti.
        className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-1 ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
            : 'border-slate-300 focus:border-sky-500 focus:ring-sky-500'
        }`}
        // aria-invalid javlja citacima ekrana da je vrednost neispravna.
        aria-invalid={error ? true : undefined}
        {...rest}
      />

      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

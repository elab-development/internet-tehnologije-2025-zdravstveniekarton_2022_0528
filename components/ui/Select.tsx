import type { SelectHTMLAttributes } from 'react';

/**
 * Reusable padajuca lista. Prati isti izgled i ponasanje kao Input,
 * da forme kroz aplikaciju izgledaju ujednaceno.
 *
 * Opcije se prosledjuju kao niz objekata { value, label }, a ne kao deca,
 * jer se u ovoj aplikaciji uvek popunjavaju iz podataka (lista doktora,
 * statusi termina, tezine alergija...).
 */

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
};

export default function Select({
  label,
  options,
  error,
  placeholder,
  id,
  name,
  className = '',
  ...rest
}: SelectProps) {
  const fieldId = id ?? name;

  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        id={fieldId}
        name={name}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-1 ${
          error
            ? 'border-danger-400 focus:border-danger-500 focus:ring-danger-500'
            : 'border-slate-300 focus:border-primary-500 focus:ring-primary-500'
        }`}
        aria-invalid={error ? true : undefined}
        {...rest}
      >
        {/* Prazna opcija tera korisnika da svesno izabere vrednost,
            umesto da se precutno primeni prva stavka sa liste. */}
        {placeholder && <option value="">{placeholder}</option>}

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
    </div>
  );
}

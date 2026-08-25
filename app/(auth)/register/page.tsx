'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

// Pocetno stanje forme drzimo u jednom objektu, da ne pravimo osam useState poziva.
const initialForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  jmbg: '',
  dateOfBirth: '',
  address: '',
};

/**
 * Stranica za registraciju pacijenta (/register).
 *
 * Registruju se iskljucivo pacijenti. Naloge doktora i sestara kreira
 * administrator kroz admin panel, kao i u stvarnom zdravstvenom sistemu.
 */
export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  // Greske po pojedinacnom polju koje vraca server (Zod validacija).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Jedan rukovalac za sva polja - koristi atribut name da zna koje polje menja.
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const payload = await response.json();

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? 'Registracija nije uspela.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    // Posle uspesne registracije korisnika odmah i prijavljujemo,
    // da ne mora ponovo da kuca iste podatke na login stranici.
    await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    router.push('/');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-sky-800">Registracija pacijenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Popunite podatke da biste otvorili svoj zdravstveni karton.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <FormField
            label="Ime i prezime"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            required
          />
          <FormField
            label="JMBG"
            name="jmbg"
            value={form.jmbg}
            onChange={handleChange}
            error={fieldErrors.jmbg}
            placeholder="13 cifara"
            required
          />
          <FormField
            label="Email adresa"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
          />
          <FormField
            label="Lozinka"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            placeholder="najmanje 8 karaktera"
            required
          />
          <FormField
            label="Datum rodjenja"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            error={fieldErrors.dateOfBirth}
            required
          />
          <FormField
            label="Telefon"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={fieldErrors.phone}
          />
          <div className="sm:col-span-2">
            <FormField
              label="Adresa"
              name="address"
              value={form.address}
              onChange={handleChange}
              error={fieldErrors.address}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-60 sm:col-span-2"
          >
            {isSubmitting ? 'Slanje...' : 'Registruj se'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Vec imate nalog?{' '}
          <Link href="/login" className="font-medium text-sky-700 hover:underline">
            Prijavite se
          </Link>
        </p>
      </div>
    </main>
  );
}

// Mala pomocna komponenta da se markup polja ne ponavlja sedam puta.
// U komitu 15 bice zamenjena globalnom reusable komponentom Input.
function FormField({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  placeholder,
  required,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

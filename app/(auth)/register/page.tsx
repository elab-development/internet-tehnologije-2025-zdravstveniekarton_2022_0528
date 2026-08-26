'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

// Pocetno stanje forme drzimo u jednom objektu, da ne pravimo sedam useState poziva.
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
    <main className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-800">Registracija pacijenta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Popunite podatke da biste otvorili svoj zdravstveni karton.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input
            label="Ime i prezime"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            required
          />
          <Input
            label="JMBG"
            name="jmbg"
            value={form.jmbg}
            onChange={handleChange}
            error={fieldErrors.jmbg}
            hint="13 cifara"
            required
          />
          <Input
            label="Email adresa"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            error={fieldErrors.email}
            required
          />
          <Input
            label="Lozinka"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            hint="najmanje 8 karaktera"
            required
          />
          <Input
            label="Datum rodjenja"
            name="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={handleChange}
            error={fieldErrors.dateOfBirth}
            required
          />
          <Input
            label="Telefon"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={fieldErrors.phone}
          />
          <Input
            label="Adresa"
            name="address"
            value={form.address}
            onChange={handleChange}
            error={fieldErrors.address}
            className="sm:col-span-2"
          />

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 sm:col-span-2"
            >
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="sm:col-span-2">
            Registruj se
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Vec imate nalog?{' '}
          <Link href="/login" className="font-medium text-primary-700 hover:underline">
            Prijavite se
          </Link>
        </p>
      </div>
    </main>
  );
}

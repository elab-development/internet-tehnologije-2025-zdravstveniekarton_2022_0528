'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Role } from '@prisma/client';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

const initialForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: '',
  specialization: '',
  licenseNumber: '',
  officeRoom: '',
};

const ROLE_OPTIONS = [
  { value: Role.DOCTOR, label: 'Lekar' },
  { value: Role.NURSE, label: 'Medicinska sestra' },
];

/**
 * Kreiranje naloga osoblja (/admin/create-staff).
 *
 * Polja specificna za lekara (specijalizacija, licenca, ordinacija) prikazuju
 * se tek kada se izabere uloga lekara - forma se prilagodjava izboru.
 *
 * Koriscene kuke: useState, useRouter.
 */
export default function CreateStaffPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDoctor = form.role === Role.DOCTOR;

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        phone: form.phone || undefined,
        role: form.role,
        // Podaci o lekaru se salju samo ako je izabrana uloga lekara.
        specialization: isDoctor ? form.specialization : undefined,
        licenseNumber: isDoctor ? form.licenseNumber : undefined,
        officeRoom: isDoctor ? form.officeRoom || undefined : undefined,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? 'Kreiranje naloga nije uspelo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="page-container max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-primary-800">Novi nalog osoblja</h1>

      <Card
        title="Podaci o zaposlenom"
        subtitle="Pacijenti se registruju sami; ovde se otvaraju nalozi lekara i sestara."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Ime i prezime"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            required
          />
          <Select
            label="Uloga"
            name="role"
            value={form.role}
            onChange={handleChange}
            options={ROLE_OPTIONS}
            placeholder="-- izaberite ulogu --"
            error={fieldErrors.role}
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
            label="Pocetna lozinka"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            error={fieldErrors.password}
            hint="najmanje 8 karaktera"
            required
          />
          <Input
            label="Telefon"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={fieldErrors.phone}
            className="sm:col-span-2"
          />

          {/* Polja lekara se prikazuju samo za ulogu lekara. */}
          {isDoctor && (
            <>
              <Input
                label="Specijalizacija"
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                error={fieldErrors.specialization}
                placeholder="npr. Kardiologija"
                required
              />
              <Input
                label="Broj licence"
                name="licenseNumber"
                value={form.licenseNumber}
                onChange={handleChange}
                error={fieldErrors.licenseNumber}
                placeholder="npr. LEK-1003"
                required
              />
              <Input
                label="Ordinacija"
                name="officeRoom"
                value={form.officeRoom}
                onChange={handleChange}
                error={fieldErrors.officeRoom}
                className="sm:col-span-2"
              />
            </>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 sm:col-span-2"
            >
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2 sm:col-span-2">
            <Button type="submit" isLoading={isSubmitting}>
              Kreiraj nalog
            </Button>
            <Link
              href="/admin"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Odustani
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}

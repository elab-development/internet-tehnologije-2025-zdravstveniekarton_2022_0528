'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

type Doctor = {
  id: string;
  fullName: string;
  doctorProfile: { specialization: string; officeRoom: string | null } | null;
};

/**
 * Stranica za zakazivanje termina (/appointments/create).
 * Dostupna je samo pacijentu - to obezbedjuje middleware.
 *
 * Koriscene kuke:
 *  - useEffect -> ucitava spisak lekara sa servera pri otvaranju stranice
 *  - useState  -> spisak lekara, podaci forme, greske, stanje slanja
 *  - useRouter -> preusmerava na listu termina posle uspesnog zakazivanja
 */
export default function CreateAppointmentPage() {
  const router = useRouter();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [reasonForVisit, setReasonForVisit] = useState('');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prazan niz zavisnosti znaci: pokreni samo jednom, pri prvom prikazu stranice.
  useEffect(() => {
    async function loadDoctors() {
      const response = await fetch('/api/doctors');
      if (!response.ok) {
        setError('Nije moguce ucitati spisak lekara.');
        return;
      }
      const payload = await response.json();
      setDoctors(payload.data);
    }
    loadDoctors();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId, scheduledAt, reasonForVisit }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? 'Zakazivanje nije uspelo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    router.push('/appointments');
    router.refresh();
  }

  // Padajuca lista prikazuje ime i specijalizaciju, da pacijent zna koga bira.
  const doctorOptions = doctors.map((doctor) => ({
    value: doctor.id,
    label: doctor.doctorProfile
      ? `${doctor.fullName} - ${doctor.doctorProfile.specialization}`
      : doctor.fullName,
  }));

  // Minimalna vrednost polja za datum je trenutak otvaranja stranice,
  // da kalendar sam ne nudi datume u proslosti. Server to ionako proverava.
  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <main className="page-container max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-primary-800">Zakazivanje termina</h1>

      <Card
        title="Novi zahtev za termin"
        subtitle="Zahtev postaje vazeci kada ga medicinska sestra potvrdi."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Lekar"
            name="doctorId"
            value={doctorId}
            onChange={(event) => setDoctorId(event.target.value)}
            options={doctorOptions}
            placeholder="-- izaberite lekara --"
            error={fieldErrors.doctorId}
            required
          />

          <Input
            label="Datum i vreme"
            name="scheduledAt"
            type="datetime-local"
            value={scheduledAt}
            min={minDateTime}
            onChange={(event) => setScheduledAt(event.target.value)}
            error={fieldErrors.scheduledAt}
            required
          />

          <Input
            label="Razlog dolaska"
            name="reasonForVisit"
            value={reasonForVisit}
            onChange={(event) => setReasonForVisit(event.target.value)}
            error={fieldErrors.reasonForVisit}
            hint="Ukratko opisite tegobe zbog kojih dolazite"
            required
          />

          {error && (
            <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              Posalji zahtev
            </Button>
            <Link
              href="/appointments"
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

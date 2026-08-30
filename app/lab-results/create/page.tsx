'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

type Patient = {
  id: string;
  user: { id: string; fullName: string };
};

// Najcesce analize, da lekar ne mora da kuca naziv svaki put.
const COMMON_TESTS = [
  'Kompletna krvna slika',
  'Lipidni status',
  'Glikemija',
  'Urea i kreatinin',
  'Jetreni enzimi',
  'Analiza urina',
  'Hormoni stitne zlezde',
];

/**
 * Narucivanje laboratorijske analize (/lab-results/create).
 * Dostupno lekaru; sestra kasnije unosi rezultat na listi nalaza.
 *
 * Koriscene kuke: useSearchParams, useState, useEffect, useRouter.
 */
function CreateLabResultPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientProfileId, setPatientProfileId] = useState(
    searchParams.get('patientProfileId') ?? '',
  );
  const [testType, setTestType] = useState('');
  const [customTestType, setCustomTestType] = useState('');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadPatients() {
      const response = await fetch('/api/patients');
      if (response.ok) setPatients((await response.json()).data);
    }
    loadPatients();
  }, []);

  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: patient.user.fullName,
  }));

  const testOptions = [
    ...COMMON_TESTS.map((test) => ({ value: test, label: test })),
    { value: 'DRUGO', label: 'Druga analiza (upisati rucno)' },
  ];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch('/api/lab-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientProfileId,
        testType: testType === 'DRUGO' ? customTestType : testType,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? 'Narucivanje analize nije uspelo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    router.push('/lab-results');
    router.refresh();
  }

  return (
    <main className="page-container max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-primary-800">Narucivanje analize</h1>

      <Card
        title="Nova laboratorijska analiza"
        subtitle="Rezultat kasnije unosi medicinska sestra."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Pacijent"
            name="patientProfileId"
            value={patientProfileId}
            onChange={(event) => setPatientProfileId(event.target.value)}
            options={patientOptions}
            placeholder="-- izaberite pacijenta --"
            error={fieldErrors.patientProfileId}
            required
          />

          <Select
            label="Vrsta analize"
            name="testType"
            value={testType}
            onChange={(event) => setTestType(event.target.value)}
            options={testOptions}
            placeholder="-- izaberite analizu --"
            error={fieldErrors.testType}
            required
          />

          {/* Polje za rucni unos se pojavljuje samo ako analiza nije sa spiska. */}
          {testType === 'DRUGO' && (
            <Input
              label="Naziv analize"
              name="customTestType"
              value={customTestType}
              onChange={(event) => setCustomTestType(event.target.value)}
              error={fieldErrors.testType}
              required
            />
          )}

          {error && (
            <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              Naruci analizu
            </Button>
            <Link
              href="/lab-results"
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

/**
 * useSearchParams() cita parametre iz adrese, sto je moguce tek u browseru.
 * Zato Next.js trazi da takva komponenta bude unutar <Suspense> granice -
 * bez toga "next build" ne moze unapred da pripremi stranicu i build puca.
 *
 * Fallback je ono sto se vidi dok se komponenta ne ucita.
 */
export default function CreateLabResultPage() {
  return (
    <Suspense
      fallback={
        <main className="page-container">
          <p className="text-sm text-slate-500">Ucitavanje forme...</p>
        </main>
      }
    >
      <CreateLabResultPageContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';

type Props = {
  medicalRecordId: string;
  patientProfileId: string;
  /** Poziva se posle uspesnog narucivanja, da se stranica osvezi. */
  onCreated: () => void;
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
  'Brzi test na streptokok',
];

const OTHER = 'DRUGO';

/**
 * Narucivanje laboratorijske analize iz samog pregleda.
 *
 * Analiza se vezuje za pregled, pa se kasnije prikazuje uz njega u kartonu.
 * Tako pregled postaje celina - dijagnoza, terapija i trazene analize - umesto
 * da nalazi stoje u odvojenom spisku bez veze sa razlogom zbog kog su traženi.
 *
 * Rezultat i dalje unosi medicinska sestra; ovde se analiza samo narucuje.
 *
 * Koriscena kuka: useState.
 */
export default function LabOrderForm({ medicalRecordId, patientProfileId, onCreated }: Props) {
  const [testType, setTestType] = useState('');
  const [customTestType, setCustomTestType] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const testOptions = [
    ...COMMON_TESTS.map((test) => ({ value: test, label: test })),
    { value: OTHER, label: 'Druga analiza (upisati rucno)' },
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
        medicalRecordId,
        testType: testType === OTHER ? customTestType : testType,
      }),
    });
    const payload = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? 'Narucivanje analize nije uspelo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    setTestType('');
    setCustomTestType('');
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select
        label="Vrsta analize"
        name="labTestType"
        value={testType}
        onChange={(event) => setTestType(event.target.value)}
        options={testOptions}
        placeholder="-- izaberite analizu --"
        error={fieldErrors.testType}
        required
      />

      {/* Polje za rucni unos se pojavljuje samo ako analiza nije sa spiska. */}
      {testType === OTHER && (
        <Input
          label="Naziv analize"
          name="customLabTestType"
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

      <Button type="submit" isLoading={isSubmitting}>
        Naruci analizu
      </Button>
    </form>
  );
}

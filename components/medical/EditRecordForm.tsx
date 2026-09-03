'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import DiagnosisAutocomplete from '@/components/medical/DiagnosisAutocomplete';

type Props = {
  recordId: string;
  initial: {
    symptoms: string;
    diagnosisName: string;
    diagnosisCode: string | null;
    therapyNotes: string | null;
  };
  /** Poziva se posle uspesne izmene, da se prikaz osvezi. */
  onSaved: () => void;
};

/**
 * Ispravka vec unetog pregleda.
 *
 * Postoji zbog stvarnog toka rada: lekar pri prvom pregledu postavi radnu
 * dijagnozu i naruci analizu, a kada rezultat stigne, dijagnozu i terapiju
 * dopunjuje. Bez ove forme pregled bi bio nepromenljiv od trenutka unosa.
 *
 * Izmenu sme samo lekar koji je pregled i napisao - to proverava API ruta.
 *
 * Koriscena kuka: useState.
 */
export default function EditRecordForm({ recordId, initial, onSaved }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [symptoms, setSymptoms] = useState(initial.symptoms);
  const [diagnosisName, setDiagnosisName] = useState(initial.diagnosisName);
  const [diagnosisCode, setDiagnosisCode] = useState<string | undefined>(
    initial.diagnosisCode ?? undefined,
  );
  const [therapyNotes, setTherapyNotes] = useState(initial.therapyNotes ?? '');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSaving(true);

    const response = await fetch(`/api/medical-records/${recordId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symptoms,
        diagnosisName,
        diagnosisCode,
        therapyNotes: therapyNotes || undefined,
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? 'Izmena pregleda nije uspela.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    setIsOpen(false);
    onSaved();
  }

  if (!isOpen) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setIsOpen(true)}>
        Izmeni pregled
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="editSymptoms" className="mb-1 block text-sm font-medium text-slate-700">
          Simptomi
        </label>
        <textarea
          id="editSymptoms"
          name="editSymptoms"
          rows={3}
          value={symptoms}
          onChange={(event) => setSymptoms(event.target.value)}
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        {fieldErrors.symptoms && (
          <p className="mt-1 text-xs text-danger-600">{fieldErrors.symptoms}</p>
        )}
      </div>

      <DiagnosisAutocomplete
        value={diagnosisName}
        error={fieldErrors.diagnosisName}
        onSelect={(diagnosis) => {
          setDiagnosisName(diagnosis.name);
          setDiagnosisCode(diagnosis.code);
        }}
      />

      <div>
        <label htmlFor="editTherapyNotes" className="mb-1 block text-sm font-medium text-slate-700">
          Terapija i napomene
        </label>
        <textarea
          id="editTherapyNotes"
          name="editTherapyNotes"
          rows={3}
          value={therapyNotes}
          onChange={(event) => setTherapyNotes(event.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        {fieldErrors.therapyNotes && (
          <p className="mt-1 text-xs text-danger-600">{fieldErrors.therapyNotes}</p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" isLoading={isSaving}>
          Sacuvaj izmene
        </Button>
        <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
          Odustani
        </Button>
      </div>
    </form>
  );
}

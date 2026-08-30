'use client';

import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { DrugInfo } from '@/lib/external/drugInfo';

type Props = {
  medicalRecordId: string;
  /** Poziva se posle uspesnog upisa, da roditelj osvezi listu lekova. */
  onCreated: () => void;
};

const emptyForm = {
  medicationName: '',
  dosage: '',
  frequency: '',
  durationDays: '',
  notes: '',
};

/**
 * Forma za propisivanje leka uz pregled, sa prikazom zvanicnih podataka
 * o leku iz openFDA baze.
 *
 * Koriscene kuke:
 *  - useState  -> podaci forme, podaci o leku, greske
 *  - useEffect -> pretraga openFDA baze sa odlaganjem dok lekar kuca naziv leka
 */
export default function PrescriptionForm({ medicalRecordId, onCreated }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [drugInfo, setDrugInfo] = useState<DrugInfo | null>(null);
  const [drugChecked, setDrugChecked] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  // Pretraga podataka o leku krece tek 600ms posle poslednjeg pritiska tastera.
  useEffect(() => {
    const name = form.medicationName.trim();
    if (name.length < 3) {
      setDrugInfo(null);
      setDrugChecked(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUp(true);
      const response = await fetch(`/api/external/drug-info?name=${encodeURIComponent(name)}`);
      setIsLookingUp(false);
      if (!response.ok) return;
      const payload = await response.json();
      setDrugInfo(payload.data);
      setDrugChecked(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [form.medicationName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        medicalRecordId,
        medicationName: form.medicationName,
        dosage: form.dosage,
        frequency: form.frequency,
        // Polje forme je uvek tekst, a sema ocekuje broj, pa se pretvara ovde.
        durationDays: Number(form.durationDays),
        notes: form.notes || undefined,
      }),
    });
    const payload = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setError(payload.error ?? 'Propisivanje leka nije uspelo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    setForm(emptyForm);
    setDrugInfo(null);
    setDrugChecked(false);
    onCreated();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Naziv leka"
          name="medicationName"
          value={form.medicationName}
          onChange={handleChange}
          error={fieldErrors.medicationName}
          hint="Naziv na engleskom daje vise podataka iz FDA baze"
          required
        />
        <Input
          label="Doza"
          name="dosage"
          value={form.dosage}
          onChange={handleChange}
          error={fieldErrors.dosage}
          placeholder="npr. 500 mg"
          required
        />
        <Input
          label="Ucestalost"
          name="frequency"
          value={form.frequency}
          onChange={handleChange}
          error={fieldErrors.frequency}
          placeholder="npr. tri puta dnevno"
          required
        />
        <Input
          label="Trajanje (dana)"
          name="durationDays"
          type="number"
          min={1}
          max={365}
          value={form.durationDays}
          onChange={handleChange}
          error={fieldErrors.durationDays}
          required
        />
        <Input
          label="Napomena"
          name="notes"
          value={form.notes}
          onChange={handleChange}
          error={fieldErrors.notes}
          placeholder="npr. uzimati posle obroka"
          className="sm:col-span-2"
        />
      </div>

      {isLookingUp && <p className="text-xs text-slate-500">Provera podataka o leku...</p>}

      {/* Podaci iz FDA baze su informativni - prikazuju se, ali ne blokiraju unos. */}
      {drugChecked && drugInfo && (
        <div className="rounded-md border border-primary-100 bg-primary-50 p-3 text-sm">
          <p className="font-medium text-primary-800">
            FDA podaci: {drugInfo.brandName ?? drugInfo.genericName}
          </p>
          {drugInfo.indications && (
            <p className="mt-1 text-slate-700">
              <span className="font-medium">Indikacije: </span>
              {drugInfo.indications}
            </p>
          )}
          {drugInfo.warnings && (
            <p className="mt-1 text-warning-700">
              <span className="font-medium">Upozorenja: </span>
              {drugInfo.warnings}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Podaci su informativnog karaktera, preuzeti iz americke FDA baze.
          </p>
        </div>
      )}

      {drugChecked && !drugInfo && (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Podaci o leku nisu dostupni u FDA bazi. Unos recepta je i dalje moguc.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}

      <Button type="submit" isLoading={isSubmitting}>
        Propisi lek
      </Button>
    </form>
  );
}

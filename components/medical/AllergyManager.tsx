'use client';

import { useState } from 'react';
import { AllergySeverity } from '@prisma/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import AllergyBadge, { type Allergy } from '@/components/medical/AllergyBadge';

type Props = {
  patientProfileId: string;
  allergies: Allergy[];
  /** true za lekara i sestru - njima se prikazuju dugmad za izmenu. */
  canManage: boolean;
  /** Poziva se posle svake izmene, da karton osvezi podatke. */
  onChanged: () => void;
};

const SEVERITY_OPTIONS = [
  { value: AllergySeverity.MILD, label: 'Blaga' },
  { value: AllergySeverity.MODERATE, label: 'Umerena' },
  { value: AllergySeverity.SEVERE, label: 'Teska' },
];

const emptyForm = { allergen: '', severity: '', notes: '' };

/**
 * Upozorenja o alergijama na vrhu kartona, sa unosom i uklanjanjem za osoblje.
 *
 * Prikazuje se cak i kada alergija nema - izricita poruka "nema evidentiranih
 * alergija" je za lekara vaznija od praznog prostora, jer prazan prostor moze
 * da znaci i "niko nije proverio".
 *
 * Koriscene kuke: useState.
 */
export default function AllergyManager({
  patientProfileId,
  allergies,
  canManage,
  onChanged,
}: Props) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    setError('');
    setFieldErrors({});
    setIsSaving(true);

    const response = await fetch('/api/allergies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientProfileId,
        allergen: form.allergen,
        severity: form.severity,
        notes: form.notes || undefined,
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? 'Unos alergije nije uspeo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    setForm(emptyForm);
    setIsFormOpen(false);
    onChanged();
  }

  async function handleDelete(allergyId: string) {
    const response = await fetch(`/api/allergies/${allergyId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Uklanjanje alergije nije uspelo.');
      return;
    }
    onChanged();
  }

  const hasAllergies = allergies.length > 0;

  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 ${
        hasAllergies ? 'border-warning-100 bg-warning-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p
          className={`text-sm font-semibold ${
            hasAllergies ? 'text-warning-700' : 'text-slate-600'
          }`}
        >
          {hasAllergies ? 'Poznate alergije' : 'Alergije'}
        </p>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => setIsFormOpen(true)}>
            Dodaj alergiju
          </Button>
        )}
      </div>

      {hasAllergies ? (
        <div className="flex flex-wrap items-center gap-2">
          {allergies.map((allergy) => (
            <span key={allergy.id} className="inline-flex items-center gap-1">
              <AllergyBadge allergy={allergy} />
              {canManage && (
                <button
                  type="button"
                  onClick={() => handleDelete(allergy.id)}
                  aria-label={`Ukloni alergiju ${allergy.allergen}`}
                  className="text-slate-400 hover:text-danger-600"
                >
                  &times;
                </button>
              )}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Nema evidentiranih alergija.</p>
      )}

      {error && <p className="mt-2 text-sm text-danger-700">{error}</p>}

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Nova alergija"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              Odustani
            </Button>
            <Button onClick={handleCreate} isLoading={isSaving}>
              Sacuvaj
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Alergen"
            name="allergen"
            value={form.allergen}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, allergen: event.target.value }))
            }
            error={fieldErrors.allergen}
            placeholder="npr. Penicilin"
            required
          />
          <Select
            label="Tezina reakcije"
            name="severity"
            value={form.severity}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, severity: event.target.value }))
            }
            options={SEVERITY_OPTIONS}
            placeholder="-- izaberite tezinu --"
            error={fieldErrors.severity}
            required
          />
          <Input
            label="Napomena"
            name="notes"
            value={form.notes}
            onChange={(event) =>
              setForm((previous) => ({ ...previous, notes: event.target.value }))
            }
            error={fieldErrors.notes}
            placeholder="npr. jaka kozna reakcija 2019."
          />
        </div>
      </Modal>
    </div>
  );
}

import { AllergySeverity } from '@prisma/client';

/**
 * Upozorenje o alergiji pacijenta.
 *
 * Prikazuje se na vrhu kartona, pre svih pregleda, jer je to podatak koji
 * lekar mora da vidi PRE nego sto propise terapiju. Boja raste sa tezinom
 * reakcije, ali tezina je uvek ispisana i recima.
 */

const SEVERITY_STYLES: Record<AllergySeverity, { label: string; className: string }> = {
  MILD: { label: 'blaga', className: 'bg-slate-100 text-slate-700 border-slate-200' },
  MODERATE: { label: 'umerena', className: 'bg-warning-50 text-warning-700 border-warning-100' },
  SEVERE: { label: 'teska', className: 'bg-danger-50 text-danger-700 border-danger-100' },
};

export type Allergy = {
  id: string;
  allergen: string;
  severity: AllergySeverity;
  notes: string | null;
};

export default function AllergyBadge({ allergy }: { allergy: Allergy }) {
  const { label, className } = SEVERITY_STYLES[allergy.severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm ${className}`}
      title={allergy.notes ?? undefined}
    >
      <span className="font-medium">{allergy.allergen}</span>
      <span className="text-xs opacity-80">({label})</span>
    </span>
  );
}

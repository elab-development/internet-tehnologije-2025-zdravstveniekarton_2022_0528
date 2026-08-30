import { AppointmentStatus } from '@prisma/client';

/**
 * Oznaka statusa termina - mala obojena "pilula".
 *
 * Boja nosi znacenje: zeleno je zavrseno, plavo potvrdjeno, amber ceka
 * potvrdu, crveno otkazano. Uz boju uvek ide i tekst, jer se na boju
 * ne sme oslanjati kao na jedini nosilac informacije (daltonizam).
 */

const STATUS_STYLES: Record<AppointmentStatus, { label: string; className: string }> = {
  REQUESTED: { label: 'Ceka potvrdu', className: 'bg-warning-100 text-warning-700' },
  CONFIRMED: { label: 'Potvrdjen', className: 'bg-primary-100 text-primary-800' },
  COMPLETED: { label: 'Obavljen', className: 'bg-success-100 text-success-700' },
  CANCELLED: { label: 'Otkazan', className: 'bg-danger-100 text-danger-700' },
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { label, className } = STATUS_STYLES[status];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>{label}</span>
  );
}

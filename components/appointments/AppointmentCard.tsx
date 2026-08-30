'use client';

import { Role, AppointmentStatus } from '@prisma/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/appointments/StatusBadge';
import { formatDateTime } from '@/lib/format';

export type Appointment = {
  id: string;
  scheduledAt: string;
  reasonForVisit: string;
  status: AppointmentStatus;
  patient: { id: string; fullName: string; email: string };
  doctor: {
    id: string;
    fullName: string;
    doctorProfile: { specialization: string; officeRoom: string | null } | null;
  };
};

type Props = {
  appointment: Appointment;
  /** Uloga prijavljenog korisnika - odredjuje koja se dugmad prikazuju. */
  viewerRole: Role;
  onConfirm: (id: string) => void;
  onCancelRequest: (appointment: Appointment) => void;
  isBusy: boolean;
};

/**
 * Kartica jednog termina sa dugmadima za akcije.
 *
 * Ista komponenta se koristi za sve uloge - razlikuje se samo koja se dugmad
 * prikazuju. Prikaz dugmeta je udobnost; da li je akcija stvarno dozvoljena
 * ponovo proverava API ruta (lib/security/idor.ts).
 */
export default function AppointmentCard({
  appointment,
  viewerRole,
  onConfirm,
  onCancelRequest,
  isBusy,
}: Props) {
  const isOpen =
    appointment.status === AppointmentStatus.REQUESTED ||
    appointment.status === AppointmentStatus.CONFIRMED;

  // Potvrdjivanje je posao osoblja, i ima smisla samo dok termin ceka potvrdu.
  const canConfirm =
    appointment.status === AppointmentStatus.REQUESTED &&
    (viewerRole === Role.NURSE || viewerRole === Role.DOCTOR || viewerRole === Role.ADMIN);

  // Otkazati moze i pacijent (svoj termin) i osoblje, dok je termin jos aktivan.
  const canCancel = isOpen;

  return (
    <Card
      title={formatDateTime(appointment.scheduledAt)}
      subtitle={
        appointment.doctor.doctorProfile
          ? `${appointment.doctor.fullName} - ${appointment.doctor.doctorProfile.specialization}`
          : appointment.doctor.fullName
      }
      actions={<StatusBadge status={appointment.status} />}
    >
      <p className="text-sm text-slate-700">{appointment.reasonForVisit}</p>

      {/* Pacijentu se ne prikazuje njegovo sopstveno ime - to vec zna. */}
      {viewerRole !== Role.PATIENT && (
        <p className="mt-2 text-sm text-slate-500">
          Pacijent: <span className="text-slate-700">{appointment.patient.fullName}</span>
        </p>
      )}

      {appointment.doctor.doctorProfile?.officeRoom && (
        <p className="mt-1 text-sm text-slate-500">
          Ordinacija: {appointment.doctor.doctorProfile.officeRoom}
        </p>
      )}

      {(canConfirm || canCancel) && (
        <div className="mt-4 flex gap-2">
          {canConfirm && (
            <Button size="sm" disabled={isBusy} onClick={() => onConfirm(appointment.id)}>
              Potvrdi termin
            </Button>
          )}
          {canCancel && (
            <Button
              size="sm"
              variant="danger"
              disabled={isBusy}
              onClick={() => onCancelRequest(appointment)}
            >
              Otkazi
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

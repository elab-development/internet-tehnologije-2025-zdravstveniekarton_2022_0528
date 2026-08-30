import { Role, AppointmentStatus } from '@prisma/client';
import type { SessionUser } from '@/lib/session';

/**
 * IDOR zastita (Insecure Direct Object Reference).
 *
 * IDOR je propust u kome napadac samo promeni identifikator u adresi
 * (/api/appointments/abc -> /api/appointments/xyz) i dobije tudji podatak.
 * Provera uloge tu ne pomaze: i napadac i zrtva su "pacijent".
 *
 * Zato se pored pitanja "koja je tvoja uloga" mora postaviti i pitanje
 * "da li je BAS OVAJ zapis tvoj". Funkcije u ovom fajlu odgovaraju na to
 * drugo pitanje, i pozivaju se tek posto se zapis ucita iz baze.
 *
 * U ovom domenu je to najvaznija bezbednosna mera, jer je rec o
 * zdravstvenim podacima - pacijent ne sme videti tudji karton.
 */

/** Minimum podataka o terminu potreban za odlucivanje o pristupu. */
type AppointmentOwnership = {
  patientId: string;
  doctorId: string;
  status: AppointmentStatus;
};

/**
 * Ko sme da PROCITA termin.
 * - pacijent: samo svoj
 * - doktor: samo termin zakazan kod njega
 * - sestra i administrator: sve, jer upravljaju rasporedom ustanove
 */
export function canReadAppointment(user: SessionUser, appointment: AppointmentOwnership): boolean {
  if (user.role === Role.NURSE || user.role === Role.ADMIN) return true;
  if (user.role === Role.PATIENT) return appointment.patientId === user.id;
  if (user.role === Role.DOCTOR) return appointment.doctorId === user.id;
  return false;
}

/**
 * Ko sme da IZMENI termin i na koji nacin.
 *
 * Namerno je uze od prava citanja: pacijent svoj termin vidi uvek, ali sme samo
 * da ga otkaze, i to dok jos nije obavljen. Potvrdjivanje i zakazivanje datuma
 * je posao osoblja.
 */
export function canUpdateAppointment(
  user: SessionUser,
  appointment: AppointmentOwnership,
  newStatus?: AppointmentStatus,
): boolean {
  // Vec obavljen ili otkazan termin niko ne dira - to je zavrsen zapis.
  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  ) {
    return false;
  }

  if (user.role === Role.NURSE || user.role === Role.ADMIN) return true;

  // Doktor upravlja iskljucivo terminima zakazanim kod njega.
  if (user.role === Role.DOCTOR) return appointment.doctorId === user.id;

  // Pacijent: samo svoj termin i samo otkazivanje.
  if (user.role === Role.PATIENT) {
    return appointment.patientId === user.id && newStatus === AppointmentStatus.CANCELLED;
  }

  return false;
}

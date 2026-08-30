import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
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

/**
 * Vraca id kartona (PatientProfile) prijavljenog pacijenta, ili null ako
 * korisnik nije pacijent odnosno nema kreiran profil.
 *
 * Koristi se da se upit ka bazi ogranici na sopstveni karton - pacijent nikada
 * ne salje svoj patientProfileId, on se izvodi iz sesije.
 */
export async function getOwnPatientProfileId(user: SessionUser): Promise<string | null> {
  if (user.role !== Role.PATIENT) return null;
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  return profile?.id ?? null;
}

/**
 * Ko sme da CITA karton odredjenog pacijenta.
 * - pacijent: samo svoj
 * - doktor, sestra, administrator: sve kartone, jer im je to potrebno za rad
 */
export async function canReadPatientRecords(
  user: SessionUser,
  patientProfileId: string,
): Promise<boolean> {
  if (user.role === Role.DOCTOR || user.role === Role.NURSE || user.role === Role.ADMIN) {
    return true;
  }
  if (user.role === Role.PATIENT) {
    const ownProfileId = await getOwnPatientProfileId(user);
    return ownProfileId === patientProfileId;
  }
  return false;
}

/**
 * Ko sme da IZMENI vec upisan pregled: iskljucivo lekar koji ga je i napisao.
 *
 * Ni sestra ni administrator ne smeju da menjaju dijagnozu i terapiju - to je
 * strucna odgovornost lekara i sustina podele prava u ovoj aplikaciji.
 */
export function canUpdateMedicalRecord(user: SessionUser, recordDoctorId: string): boolean {
  return user.role === Role.DOCTOR && recordDoctorId === user.id;
}

/**
 * Ko sme da UNESE rezultat nalaza.
 *
 * Sestra je ta koja unosi rezultate iz laboratorije; lekar to sme takodje,
 * ali samo za nalaz koji je sam narucio. Administrator NE unosi rezultate -
 * to nije administrativna, nego strucna radnja.
 */
export function canFillLabResult(user: SessionUser, requestedByDoctorId: string): boolean {
  if (user.role === Role.NURSE) return true;
  if (user.role === Role.DOCTOR) return requestedByDoctorId === user.id;
  return false;
}

/**
 * Ko sme da UNESE ili UKLONI alergiju pacijenta.
 *
 * Alergija nije dijagnoza nego podatak koji se prikuplja pri prijemu, pa je
 * pored lekara sme unositi i sestra. Pacijent ne sme sam da menja ovaj podatak,
 * jer se na osnovu njega propisuje terapija.
 */
export function canManageAllergies(user: SessionUser): boolean {
  return user.role === Role.DOCTOR || user.role === Role.NURSE;
}

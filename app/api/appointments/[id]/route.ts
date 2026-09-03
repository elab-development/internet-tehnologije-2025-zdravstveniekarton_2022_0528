import { NextRequest } from 'next/server';
import { Role, AppointmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/session';
import { canReadAppointment, canUpdateAppointment } from '@/lib/security/idor';
import { updateAppointmentSchema } from '@/lib/validation/schemas';
import {
  jsonOk,
  jsonError,
  jsonAuthError,
  jsonForbidden,
  jsonNotFound,
  jsonValidationError,
} from '@/lib/api';

const appointmentSelect = {
  id: true,
  scheduledAt: true,
  reasonForVisit: true,
  status: true,
  createdAt: true,
  patient: {
    select: {
      id: true,
      fullName: true,
      email: true,
      // Karton pacijenta je potreban da bi se sa termina moglo preci
      // pravo na unos pregleda, koji se vezuje za karton, a ne za nalog.
      patientProfile: { select: { id: true } },
    },
  },
  doctor: {
    select: {
      id: true,
      fullName: true,
      doctorProfile: { select: { specialization: true, officeRoom: true } },
    },
  },
};

// U Next.js 14 dinamicki deo adrese ([id]) stize kao drugi argument rukovaoca.
type RouteContext = { params: { id: string } };

/**
 * GET /api/appointments/[id] - detalji jednog termina.
 *
 * Redosled je bitan: prvo se zapis ucita, pa se tek onda proverava vlasnistvo.
 * Bez ucitanog zapisa nema sa cim da se uporedi id prijavljenog korisnika.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: { ...appointmentSelect, patientId: true, doctorId: true },
  });

  if (!appointment) return jsonNotFound('Termin ne postoji');

  // IDOR provera - da li je BAS OVAJ termin dostupan ovom korisniku.
  if (!canReadAppointment(auth.user, appointment)) return jsonForbidden();

  return jsonOk(appointment);
}

/**
 * PUT /api/appointments/[id] - potvrda, otkazivanje ili pomeranje termina.
 *
 * Sestra i doktor potvrdjuju i pomeraju, pacijent sme samo da otkaze svoj termin.
 * Ta pravila stoje u lib/security/idor.ts, da ruta ostane citljiva.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = updateAppointmentSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: { patientId: true, doctorId: true, status: true },
  });
  if (!appointment) return jsonNotFound('Termin ne postoji');

  if (!canUpdateAppointment(auth.user, appointment, parsed.data.status)) {
    return jsonForbidden();
  }

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data: parsed.data,
    select: appointmentSelect,
  });

  return jsonOk(updated);
}

/**
 * DELETE /api/appointments/[id] - trajno brisanje termina.
 *
 * Dozvoljeno samo administratoru i to za ciscenje pogresnih unosa. Redovno
 * "ponistavanje" termina je otkazivanje preko PUT (status CANCELLED), jer
 * otkazan termin ostaje u evidenciji, a obrisan nestaje bez traga.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole([Role.ADMIN]);
  if (auth.error) return jsonAuthError(auth.error);

  const appointment = await prisma.appointment.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, medicalRecord: { select: { id: true } } },
  });
  if (!appointment) return jsonNotFound('Termin ne postoji');

  // Termin iz kog je nastao pregled se ne brise - obrisao bi se trag
  // o medicinskoj dokumentaciji koja mora ostati sacuvana.
  if (appointment.medicalRecord) {
    return jsonError('Termin iz kog je nastao pregled ne moze biti obrisan', 409);
  }
  if (appointment.status === AppointmentStatus.COMPLETED) {
    return jsonError('Obavljen termin ne moze biti obrisan', 409);
  }

  await prisma.appointment.delete({ where: { id: params.id } });

  return jsonOk({ id: params.id, deleted: true });
}

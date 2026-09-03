import { NextRequest } from 'next/server';
import { Role, AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/session';
import { createAppointmentSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonUnauthorized, jsonAuthError, jsonValidationError } from '@/lib/api';

// Podaci o terminu koji se vracaju klijentu. Uvek se bira sta se vraca,
// da slucajno ne procuri passwordHash ili neki drugi osetljiv podatak.
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

/**
 * GET /api/appointments - lista termina.
 *
 * Kljucni deo: filter se NE uzima od klijenta, nego se gradi na serveru prema
 * ulozi pozivaoca. Pacijent tako fizicki ne moze da dobije tudje termine, cak i
 * ako rucno menja parametre u adresi.
 *
 * Opcioni parametar: ?status=REQUESTED
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonUnauthorized();

  const { user } = auth;
  const where: Prisma.AppointmentWhereInput = {};

  if (user.role === Role.PATIENT) {
    where.patientId = user.id; // pacijent vidi iskljucivo svoje termine
  } else if (user.role === Role.DOCTOR) {
    where.doctorId = user.id; // doktor vidi termine zakazane kod njega
  }
  // Sestra i administrator vide sve termine, jer upravljaju rasporedom ustanove.

  // Filtriranje po statusu je dodatno suzenje, ne moze prosiriti vidljivost.
  const statusParam = request.nextUrl.searchParams.get('status');
  if (statusParam) {
    if (!Object.values(AppointmentStatus).includes(statusParam as AppointmentStatus)) {
      return jsonError('Nepoznat status termina', 400);
    }
    where.status = statusParam as AppointmentStatus;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    select: appointmentSelect,
    orderBy: { scheduledAt: 'asc' },
  });

  return jsonOk(appointments);
}

/**
 * POST /api/appointments - pacijent salje zahtev za termin.
 *
 * Samo pacijent moze da kreira termin, i to iskljucivo za sebe: patientId se
 * uzima iz sesije, a ne iz tela zahteva. Da se uzima iz tela, pacijent bi mogao
 * da zakazuje termine u tudje ime.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole([Role.PATIENT]);
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = createAppointmentSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { doctorId, scheduledAt, reasonForVisit } = parsed.data;

  // Provera da izabrani nalog stvarno postoji i da je doktor - inace bi se
  // termin mogao zakazati kod administratora ili kod nepostojeceg korisnika.
  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, role: Role.DOCTOR },
  });
  if (!doctor) return jsonError('Izabrani doktor ne postoji', 400);

  // Sprecavanje dvostrukog zakazivanja u isti termin kod istog doktora.
  const taken = await prisma.appointment.findFirst({
    where: {
      doctorId,
      scheduledAt,
      status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
    },
  });
  if (taken) return jsonError('Taj termin kod izabranog doktora je vec zauzet', 409);

  const appointment = await prisma.appointment.create({
    data: {
      patientId: auth.user.id,
      doctorId,
      scheduledAt,
      reasonForVisit,
      // Status se postavlja u kodu - svaki novi termin krece kao zahtev.
      status: AppointmentStatus.REQUESTED,
    },
    select: appointmentSelect,
  });

  return jsonOk(appointment, 201);
}

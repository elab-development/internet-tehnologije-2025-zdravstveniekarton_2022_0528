import { NextRequest } from 'next/server';
import { Role, AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/session';
import { getOwnPatientProfileId } from '@/lib/security/idor';
import { createMedicalRecordSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonForbidden, jsonValidationError } from '@/lib/api';

// Sta se vraca o pregledu. Recepti se ucitavaju zajedno sa pregledom, jer se
// u kartonu uvek prikazuju kao celina "dijagnoza + propisana terapija".
const recordSelect = {
  id: true,
  visitDate: true,
  symptoms: true,
  diagnosisName: true,
  therapyNotes: true,
  createdAt: true,
  doctor: {
    select: {
      id: true,
      fullName: true,
      doctorProfile: { select: { specialization: true } },
    },
  },
  patientProfile: {
    select: {
      id: true,
      user: { select: { id: true, fullName: true } },
    },
  },
  prescriptions: {
    select: {
      id: true,
      medicationName: true,
      dosage: true,
      frequency: true,
      durationDays: true,
      notes: true,
    },
  },
};

/**
 * GET /api/medical-records - lista pregleda.
 *
 * Pacijentu se opseg suzava na sopstveni karton bez obzira sta posalje u adresi.
 * Osoblje moze da trazi karton odredjenog pacijenta preko ?patientProfileId=...
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  const { user } = auth;
  const requestedProfileId = request.nextUrl.searchParams.get('patientProfileId');
  const where: Prisma.MedicalRecordWhereInput = {};

  if (user.role === Role.PATIENT) {
    // Parametar iz adrese se namerno ignorise - pacijent uvek dobija samo svoj karton.
    const ownProfileId = await getOwnPatientProfileId(user);
    if (!ownProfileId) return jsonOk([]);
    where.patientProfileId = ownProfileId;
  } else if (requestedProfileId) {
    where.patientProfileId = requestedProfileId;
  }

  const records = await prisma.medicalRecord.findMany({
    where,
    select: recordSelect,
    orderBy: { visitDate: 'desc' }, // najnoviji pregled je na vrhu kartona
  });

  return jsonOk(records);
}

/**
 * POST /api/medical-records - lekar upisuje pregled u karton pacijenta.
 *
 * Ovo je najosetljivija operacija u aplikaciji: samo DOCTOR sme da postavi
 * dijagnozu i terapiju. Ni sestra ni administrator nemaju to pravo.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole([Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = createMedicalRecordSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { patientProfileId, appointmentId, visitDate, symptoms, diagnosisName, therapyNotes } =
    parsed.data;

  const patientProfile = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: { id: true, userId: true },
  });
  if (!patientProfile) return jsonError('Pacijent ne postoji', 400);

  // Ako pregled nastaje iz zakazanog termina, termin mora biti zakazan
  // kod BAS OVOG lekara i za BAS OVOG pacijenta.
  if (appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { patientId: true, doctorId: true, medicalRecord: { select: { id: true } } },
    });
    if (!appointment) return jsonError('Termin ne postoji', 400);
    if (appointment.doctorId !== auth.user.id) return jsonForbidden();
    if (appointment.patientId !== patientProfile.userId) {
      return jsonError('Termin ne pripada izabranom pacijentu', 400);
    }
    if (appointment.medicalRecord) {
      return jsonError('Za taj termin je pregled vec unet', 409);
    }
  }

  const record = await prisma.medicalRecord.create({
    data: {
      patientProfileId,
      appointmentId,
      // Lekar se uzima iz sesije, nikada iz tela zahteva.
      doctorId: auth.user.id,
      visitDate: visitDate ?? new Date(),
      symptoms,
      diagnosisName,
      therapyNotes,
    },
    select: recordSelect,
  });

  // Unosom pregleda termin je i formalno obavljen, pa mu se status uskladjuje.
  if (appointmentId) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.COMPLETED },
    });
  }

  return jsonOk(record, 201);
}

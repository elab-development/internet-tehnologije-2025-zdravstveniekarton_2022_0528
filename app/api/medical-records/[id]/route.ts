import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/session';
import { canReadPatientRecords, canUpdateMedicalRecord } from '@/lib/security/idor';
import { updateMedicalRecordSchema } from '@/lib/validation/schemas';
import {
  jsonOk,
  jsonError,
  jsonAuthError,
  jsonForbidden,
  jsonNotFound,
  jsonValidationError,
} from '@/lib/api';

type RouteContext = { params: { id: string } };

const recordSelect = {
  id: true,
  visitDate: true,
  symptoms: true,
  diagnosisCode: true,
  diagnosisName: true,
  therapyNotes: true,
  doctor: {
    select: { id: true, fullName: true, doctorProfile: { select: { specialization: true } } },
  },
  patientProfile: {
    select: { id: true, user: { select: { id: true, fullName: true } } },
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
    orderBy: { createdAt: 'asc' as const },
  },
};

/**
 * GET /api/medical-records/[id] - jedan pregled sa propisanom terapijom.
 *
 * Pravo citanja se izvodi iz kartona kome pregled pripada: ko sme da vidi
 * karton pacijenta, sme da vidi i pojedinacan pregled iz njega.
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  const record = await prisma.medicalRecord.findUnique({
    where: { id: params.id },
    select: { ...recordSelect, patientProfileId: true },
  });
  if (!record) return jsonNotFound('Pregled ne postoji');

  const allowed = await canReadPatientRecords(auth.user, record.patientProfileId);
  if (!allowed) return jsonForbidden();

  return jsonOk(record);
}

/**
 * PUT /api/medical-records/[id] - ispravka vec unetog pregleda.
 *
 * Sme iskljucivo lekar koji je pregled i napisao. Ni sestra, ni administrator,
 * ni drugi lekar ne mogu da menjaju tudju dijagnozu i terapiju.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole([Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = updateMedicalRecordSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const record = await prisma.medicalRecord.findUnique({
    where: { id: params.id },
    select: { id: true, doctorId: true },
  });
  if (!record) return jsonNotFound('Pregled ne postoji');

  if (!canUpdateMedicalRecord(auth.user, record.doctorId)) return jsonForbidden();

  const updated = await prisma.medicalRecord.update({
    where: { id: params.id },
    data: parsed.data,
    select: recordSelect,
  });

  return jsonOk(updated);
}

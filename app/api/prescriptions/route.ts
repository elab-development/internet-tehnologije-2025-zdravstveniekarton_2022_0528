import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { canUpdateMedicalRecord } from '@/lib/security/idor';
import { createPrescriptionSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonForbidden, jsonValidationError } from '@/lib/api';

/**
 * POST /api/prescriptions - lekar propisuje lek uz vec unet pregled.
 *
 * Dvostruka provera:
 *  1. uloga mora biti DOCTOR (sestra i administrator ne propisuju terapiju),
 *  2. pregled uz koji se lek propisuje mora biti pregled BAS TOG lekara.
 *
 * Druga provera je IDOR zastita: bez nje bi jedan lekar mogao da dopise
 * terapiju u tudji pregled, sto bi u zdravstvenom sistemu bilo neprihvatljivo.
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

  const parsed = createPrescriptionSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { medicalRecordId, ...prescriptionData } = parsed.data;

  const record = await prisma.medicalRecord.findUnique({
    where: { id: medicalRecordId },
    select: { id: true, doctorId: true },
  });
  if (!record) return jsonError('Pregled ne postoji', 400);

  // Lek se sme dopisati samo u sopstveni pregled.
  if (!canUpdateMedicalRecord(auth.user, record.doctorId)) return jsonForbidden();

  const prescription = await prisma.prescription.create({
    data: { medicalRecordId, ...prescriptionData },
    select: {
      id: true,
      medicationName: true,
      dosage: true,
      frequency: true,
      durationDays: true,
      notes: true,
      createdAt: true,
    },
  });

  return jsonOk(prescription, 201);
}

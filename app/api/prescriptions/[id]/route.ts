import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { canUpdateMedicalRecord } from '@/lib/security/idor';
import { jsonOk, jsonAuthError, jsonForbidden, jsonNotFound } from '@/lib/api';

type RouteContext = { params: { id: string } };

/**
 * DELETE /api/prescriptions/[id] - lekar uklanja pogresno propisan lek.
 *
 * Dozvoljeno je samo lekaru koji je napisao pregled uz koji lek stoji.
 * Recept se brise, a ne "otkazuje", jer je rec o ispravci greske u unosu -
 * za razliku od termina, gde otkazan termin ostaje u evidenciji.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole([Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  const prescription = await prisma.prescription.findUnique({
    where: { id: params.id },
    select: { id: true, medicalRecord: { select: { doctorId: true } } },
  });
  if (!prescription) return jsonNotFound('Recept ne postoji');

  if (!canUpdateMedicalRecord(auth.user, prescription.medicalRecord.doctorId)) {
    return jsonForbidden();
  }

  await prisma.prescription.delete({ where: { id: params.id } });

  return jsonOk({ id: params.id, deleted: true });
}

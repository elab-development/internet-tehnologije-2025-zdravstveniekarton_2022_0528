import { NextRequest } from 'next/server';
import { Role, LabResultStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { canFillLabResult } from '@/lib/security/idor';
import { updateLabResultSchema } from '@/lib/validation/schemas';
import {
  jsonOk,
  jsonError,
  jsonAuthError,
  jsonForbidden,
  jsonNotFound,
  jsonValidationError,
} from '@/lib/api';

type RouteContext = { params: { id: string } };

/**
 * PUT /api/lab-results/[id] - unos rezultata analize.
 *
 * Radi ga sestra (ili lekar koji je nalaz narucio). Administrator NE sme -
 * unos medicinskog rezultata nije administrativna radnja.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole([Role.NURSE, Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = updateLabResultSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const labResult = await prisma.labResult.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, requestedByDoctorId: true },
  });
  if (!labResult) return jsonNotFound('Nalaz ne postoji');

  if (!canFillLabResult(auth.user, labResult.requestedByDoctorId)) return jsonForbidden();

  // Vec unet rezultat se ne prepisuje - to bi bila tiha izmena medicinskog
  // podatka. Ispravka bi zahtevala novu analizu, sto je i u praksi tako.
  if (labResult.status === LabResultStatus.COMPLETED) {
    return jsonError('Rezultat je vec unet i ne moze se menjati', 409);
  }

  const updated = await prisma.labResult.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      // Ko je uneo rezultat i novi status postavlja server, ne klijent.
      uploadedByNurseId: auth.user.id,
      status: LabResultStatus.COMPLETED,
    },
    select: {
      id: true,
      testType: true,
      resultValue: true,
      resultUnit: true,
      referenceRange: true,
      status: true,
      testDate: true,
      uploadedByNurse: { select: { id: true, fullName: true } },
    },
  });

  return jsonOk(updated);
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { canManageAllergies } from '@/lib/security/idor';
import { jsonOk, jsonAuthError, jsonForbidden, jsonNotFound } from '@/lib/api';

type RouteContext = { params: { id: string } };

/**
 * DELETE /api/allergies/[id] - uklanjanje pogresno evidentirane alergije.
 *
 * Sme lekar i sestra. Alergija se brise, a ne "arhivira", jer pogresno
 * evidentirana alergija stvara lazno upozorenje koje moze da omete lecenje.
 */
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  if (!canManageAllergies(auth.user)) return jsonForbidden();

  const allergy = await prisma.allergy.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!allergy) return jsonNotFound('Alergija ne postoji');

  await prisma.allergy.delete({ where: { id: params.id } });

  return jsonOk({ id: params.id, deleted: true });
}

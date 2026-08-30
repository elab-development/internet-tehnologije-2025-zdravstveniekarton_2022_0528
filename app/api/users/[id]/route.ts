import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { updateUserStatusSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonNotFound, jsonValidationError } from '@/lib/api';

type RouteContext = { params: { id: string } };

/**
 * PUT /api/users/[id] - aktivacija ili deaktivacija naloga.
 *
 * Nalog se NIKADA ne brise. Brisanjem bi se izgubila veza sa pregledima,
 * receptima i nalazima koje je taj korisnik uneo, a medicinska dokumentacija
 * mora ostati citljiva i posle odlaska zaposlenog iz ustanove.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireRole([Role.ADMIN]);
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = updateUserStatusSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  // Administrator ne sme da deaktivira sam sebe - time bi se zakljucao izvan
  // sistema i niko ne bi mogao da upravlja nalozima.
  if (params.id === auth.user.id) {
    return jsonError('Ne mozete deaktivirati sopstveni nalog', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, role: true, isActive: true },
  });
  if (!user) return jsonNotFound('Korisnik ne postoji');

  // U sistemu mora ostati bar jedan aktivan administrator.
  if (user.role === Role.ADMIN && !parsed.data.isActive) {
    const activeAdmins = await prisma.user.count({
      where: { role: Role.ADMIN, isActive: true },
    });
    if (activeAdmins <= 1) {
      return jsonError('U sistemu mora postojati bar jedan aktivan administrator', 409);
    }
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: { isActive: parsed.data.isActive },
    select: { id: true, email: true, fullName: true, role: true, isActive: true },
  });

  return jsonOk(updated);
}

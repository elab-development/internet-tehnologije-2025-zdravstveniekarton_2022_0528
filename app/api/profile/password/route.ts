import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { changePasswordSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonValidationError } from '@/lib/api';

/**
 * PUT /api/profile/password - promena sopstvene lozinke.
 *
 * Trazi se i trenutna lozinka. Bez te provere bi neko ko naidje na otkljucan
 * racunar mogao da promeni lozinku i trajno preuzme tudji nalog - a kod
 * zdravstvenih podataka to znaci trajan pristup tudjem kartonu.
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: { id: true, passwordHash: true },
  });
  if (!user) return jsonError('Nalog ne postoji', 404);

  const currentMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return jsonError('Trenutna lozinka nije ispravna', 400);
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

  await prisma.user.update({
    where: { id: auth.user.id },
    data: { passwordHash },
  });

  // Vraca se samo potvrda - nikakav podatak o lozinci ne napusta server.
  return jsonOk({ changed: true });
}

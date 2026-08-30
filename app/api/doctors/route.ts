import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { jsonOk, jsonAuthError } from '@/lib/api';

/**
 * GET /api/doctors - spisak lekara za padajucu listu pri zakazivanju.
 *
 * Vracaju se samo ime, specijalizacija i ordinacija. Email, telefon i broj
 * licence se NE vracaju, jer pacijentu nisu potrebni za izbor lekara - princip
 * minimalnog otkrivanja podataka.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  const doctors = await prisma.user.findMany({
    where: { role: Role.DOCTOR },
    select: {
      id: true,
      fullName: true,
      doctorProfile: { select: { specialization: true, officeRoom: true } },
    },
    orderBy: { fullName: 'asc' },
  });

  return jsonOk(doctors);
}

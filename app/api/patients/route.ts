import { NextRequest } from 'next/server';
import { Role, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { jsonOk, jsonAuthError } from '@/lib/api';

/**
 * GET /api/patients - spisak pacijenata za medicinsko osoblje.
 *
 * Pacijent ovoj ruti NEMA pristup - on ne sme ni da zna ko su ostali pacijenti
 * ustanove. Zato je dozvoljena samo lekarima, sestrama i administratoru.
 *
 * Opcioni parametar: ?q=pojam (pretraga po imenu ili JMBG-u)
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole([Role.DOCTOR, Role.NURSE, Role.ADMIN]);
  if (auth.error) return jsonAuthError(auth.error);

  const term = request.nextUrl.searchParams.get('q')?.trim();
  const where: Prisma.PatientProfileWhereInput = {};

  if (term) {
    // mode: 'insensitive' znaci da velika i mala slova nisu bitna pri pretrazi.
    where.OR = [
      { user: { fullName: { contains: term, mode: 'insensitive' } } },
      { jmbg: { contains: term } },
    ];
  }

  const patients = await prisma.patientProfile.findMany({
    where,
    select: {
      id: true,
      jmbg: true,
      dateOfBirth: true,
      bloodType: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      // Broj pregleda i alergija se racuna u bazi, da se ne povlace svi zapisi
      // samo radi prikaza brojke u listi.
      _count: { select: { medicalRecords: true, allergies: true } },
    },
    orderBy: { user: { fullName: 'asc' } },
  });

  return jsonOk(patients);
}

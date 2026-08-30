import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { Role, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { createStaffSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonValidationError } from '@/lib/api';

// passwordHash se NIKADA ne nalazi medju izabranim poljima.
const userSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  isActive: true,
  createdAt: true,
  doctorProfile: { select: { specialization: true, licenseNumber: true, officeRoom: true } },
};

/**
 * GET /api/users - spisak naloga u sistemu.
 *
 * Iskljucivo za administratora: spisak svih korisnika sa email adresama je
 * osetljiv podatak koji medicinskom osoblju nije potreban za rad.
 *
 * Opcioni parametar: ?role=DOCTOR
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole([Role.ADMIN]);
  if (auth.error) return jsonAuthError(auth.error);

  const where: Prisma.UserWhereInput = {};
  const roleParam = request.nextUrl.searchParams.get('role');

  if (roleParam) {
    if (!Object.values(Role).includes(roleParam as Role)) {
      return jsonError('Nepoznata uloga', 400);
    }
    where.role = roleParam as Role;
  }

  const users = await prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  });

  return jsonOk(users);
}

/**
 * POST /api/users - administrator kreira nalog lekara ili sestre.
 *
 * Lekari i sestre se NE registruju sami; njihove naloge otvara ustanova, kao
 * i u stvarnom zdravstvenom sistemu. Zbog toga javna registraciona forma moze
 * da kreira iskljucivo pacijente (vidi /api/auth/register).
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole([Role.ADMIN]);
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { email, password, fullName, phone, role, specialization, licenseNumber, officeRoom } =
    parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingEmail) return jsonError('Nalog sa ovom email adresom vec postoji', 409);

  if (role === Role.DOCTOR && licenseNumber) {
    const existingLicense = await prisma.doctorProfile.findFirst({ where: { licenseNumber } });
    if (existingLicense) return jsonError('Lekar sa tim brojem licence vec postoji', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName,
      phone,
      role,
      // Profil lekara se kreira u istoj operaciji; sestra profil nema.
      ...(role === Role.DOCTOR && specialization && licenseNumber
        ? { doctorProfile: { create: { specialization, licenseNumber, officeRoom } } }
        : {}),
    },
    select: userSelect,
  });

  return jsonOk(user, 201);
}

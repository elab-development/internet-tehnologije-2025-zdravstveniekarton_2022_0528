import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { updateProfileSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonValidationError } from '@/lib/api';

// passwordHash se, kao i svuda, ne nalazi medju izabranim poljima.
const profileSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  createdAt: true,
  patientProfile: {
    select: {
      id: true,
      jmbg: true,
      dateOfBirth: true,
      bloodType: true,
      address: true,
      insuranceNumber: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
    },
  },
  doctorProfile: {
    select: { id: true, specialization: true, licenseNumber: true, officeRoom: true },
  },
};

/**
 * GET /api/profile - podaci prijavljenog korisnika.
 *
 * Ruta ne prima nikakav identifikator: korisnik se uvek uzima iz sesije.
 * Zato ni ne postoji nacin da se zatrazi tudji profil - isti princip kao kod
 * kartona pacijenta (vidi lib/security/idor.ts).
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  const profile = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: profileSelect,
  });
  if (!profile) return jsonError('Nalog ne postoji', 404);

  return jsonOk(profile);
}

/**
 * PUT /api/profile - izmena sopstvenih podataka.
 *
 * Menjaju se samo kontakt podaci. Email, uloga, JMBG, broj licence i
 * specijalizacija se NE menjaju ovom rutom: to su podaci koji odredjuju
 * identitet i ovlascenja, pa ih menja administrator.
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

  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const {
    fullName,
    phone,
    address,
    bloodType,
    insuranceNumber,
    emergencyContactName,
    emergencyContactPhone,
    officeRoom,
  } = parsed.data;

  const updated = await prisma.user.update({
    // Nalog se bira po identifikatoru iz sesije, nikada iz tela zahteva.
    where: { id: auth.user.id },
    data: {
      fullName,
      phone,

      // Polja pacijenta se upisuju samo ako je pozivalac pacijent. Da se ovo ne
      // proverava, sestra bi slanjem polja "address" pokusala da upise podatak
      // u profil koji uopste nema.
      ...(auth.user.role === Role.PATIENT
        ? {
            patientProfile: {
              update: {
                address,
                bloodType,
                insuranceNumber,
                emergencyContactName,
                emergencyContactPhone,
              },
            },
          }
        : {}),

      ...(auth.user.role === Role.DOCTOR ? { doctorProfile: { update: { officeRoom } } } : {}),
    },
    select: profileSelect,
  });

  return jsonOk(updated);
}

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonValidationError } from '@/lib/api';

/**
 * POST /api/auth/register - samostalna registracija pacijenta.
 *
 * Ruta je javna, ali NAMERNO moze da kreira iskljucivo nalog sa ulogom PATIENT.
 * Uloga se postavlja u kodu, a ne uzima iz tela zahteva - inace bi bilo ko mogao
 * da posalje { role: "ADMIN" } i sam sebi napravi administratorski nalog.
 * Naloge doktora i sestara kreira administrator (Faza 8).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }

  const { email, password, fullName, phone, jmbg, dateOfBirth, address } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  // Provera zauzetosti pre upisa, da korisnik dobije jasnu poruku umesto greske iz baze.
  const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingEmail) {
    return jsonError('Nalog sa ovom email adresom vec postoji', 409);
  }

  const existingJmbg = await prisma.patientProfile.findFirst({ where: { jmbg } });
  if (existingJmbg) {
    return jsonError('Pacijent sa ovim JMBG-om je vec registrovan', 409);
  }

  // Lozinka se nikada ne cuva kao tekst. Broj 10 je "cost factor" - koliko je
  // hesovanje sporo, sto namerno usporava napad probanjem lozinki.
  const passwordHash = await bcrypt.hash(password, 10);

  // Nalog i profil pacijenta se kreiraju u jednoj operaciji (ugnjezdeni create),
  // pa je nemoguce da ostane nalog bez profila ako drugi upis pukne.
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      fullName,
      phone,
      role: Role.PATIENT,
      patientProfile: {
        create: { jmbg, dateOfBirth, address },
      },
    },
    // Bira se sta se vraca - passwordHash se nikada ne salje klijentu.
    select: { id: true, email: true, fullName: true, role: true },
  });

  return jsonOk(user, 201);
}

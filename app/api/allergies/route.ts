import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import {
  canManageAllergies,
  canReadPatientRecords,
  getOwnPatientProfileId,
} from '@/lib/security/idor';
import { createAllergySchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonForbidden, jsonValidationError } from '@/lib/api';

const allergySelect = {
  id: true,
  allergen: true,
  severity: true,
  notes: true,
  createdAt: true,
  patientProfileId: true,
};

/**
 * GET /api/allergies?patientProfileId=... - alergije jednog pacijenta.
 *
 * Pacijent uvek dobija svoje alergije bez obzira sta posalje u adresi;
 * osoblje mora navesti pacijenta ciji karton gleda.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  let patientProfileId = request.nextUrl.searchParams.get('patientProfileId') ?? '';

  // Pacijentu se opseg suzava na sopstveni karton - parametar se ignorise.
  const ownProfileId = await getOwnPatientProfileId(auth.user);
  if (ownProfileId) {
    patientProfileId = ownProfileId;
  } else if (!patientProfileId) {
    return jsonError('Nedostaje patientProfileId', 400);
  }

  const allowed = await canReadPatientRecords(auth.user, patientProfileId);
  if (!allowed) return jsonForbidden();

  const allergies = await prisma.allergy.findMany({
    where: { patientProfileId },
    select: allergySelect,
    // Najteze alergije prve - one su najvaznije upozorenje pri propisivanju terapije.
    orderBy: { severity: 'desc' },
  });

  return jsonOk(allergies);
}

/**
 * POST /api/allergies - unos alergije pacijenta.
 *
 * Unose lekar i sestra. Pacijent NE sme sam da doda ili izmeni svoju alergiju,
 * jer se na osnovu tog podatka propisuje terapija - mora ga potvrditi osoblje.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  if (!canManageAllergies(auth.user)) return jsonForbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = createAllergySchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { patientProfileId, allergen, severity, notes } = parsed.data;

  const patientExists = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: { id: true },
  });
  if (!patientExists) return jsonError('Pacijent ne postoji', 400);

  // Ista alergija se ne unosi dvaput - to bi umnozilo upozorenja u kartonu.
  const duplicate = await prisma.allergy.findFirst({
    where: { patientProfileId, allergen: { equals: allergen, mode: 'insensitive' } },
  });
  if (duplicate) return jsonError('Ta alergija je vec evidentirana', 409);

  const allergy = await prisma.allergy.create({
    data: { patientProfileId, allergen, severity, notes },
    select: allergySelect,
  });

  return jsonOk(allergy, 201);
}

import { NextRequest } from 'next/server';
import { Role, LabResultStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole } from '@/lib/session';
import { getOwnPatientProfileId } from '@/lib/security/idor';
import { createLabResultSchema } from '@/lib/validation/schemas';
import { jsonOk, jsonError, jsonAuthError, jsonValidationError } from '@/lib/api';

const labResultSelect = {
  id: true,
  testType: true,
  resultValue: true,
  resultUnit: true,
  referenceRange: true,
  status: true,
  testDate: true,
  createdAt: true,
  patientProfile: {
    select: { id: true, user: { select: { id: true, fullName: true } } },
  },
  requestedByDoctor: { select: { id: true, fullName: true } },
  uploadedByNurse: { select: { id: true, fullName: true } },
};

/**
 * GET /api/lab-results - lista nalaza.
 *
 * Pacijent vidi samo svoje nalaze; lekar, sestra i administrator vide sve,
 * jer laboratorija radi za celu ustanovu.
 *
 * Opcioni parametar: ?status=PENDING (sestri je korisno da vidi sta ceka unos)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  const where: Prisma.LabResultWhereInput = {};

  if (auth.user.role === Role.PATIENT) {
    const ownProfileId = await getOwnPatientProfileId(auth.user);
    if (!ownProfileId) return jsonOk([]);
    where.patientProfileId = ownProfileId;
  }

  const statusParam = request.nextUrl.searchParams.get('status');
  if (statusParam) {
    if (!Object.values(LabResultStatus).includes(statusParam as LabResultStatus)) {
      return jsonError('Nepoznat status nalaza', 400);
    }
    where.status = statusParam as LabResultStatus;
  }

  const results = await prisma.labResult.findMany({
    where,
    select: labResultSelect,
    orderBy: { testDate: 'desc' },
  });

  return jsonOk(results);
}

/**
 * POST /api/lab-results - lekar narucuje analizu.
 *
 * Nalaz nastaje prazan, sa statusom PENDING. Rezultat kasnije unosi sestra
 * preko PUT rute. Ta podela je sustina saradnje lekara i sestre u sistemu.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole([Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError('Telo zahteva nije ispravan JSON', 400);
  }

  const parsed = createLabResultSchema.safeParse(body);
  if (!parsed.success) return jsonValidationError(parsed.error);

  const { patientProfileId, testType, testDate } = parsed.data;

  const patientExists = await prisma.patientProfile.findUnique({
    where: { id: patientProfileId },
    select: { id: true },
  });
  if (!patientExists) return jsonError('Pacijent ne postoji', 400);

  const labResult = await prisma.labResult.create({
    data: {
      patientProfileId,
      // Lekar koji narucuje uzima se iz sesije, ne iz tela zahteva.
      requestedByDoctorId: auth.user.id,
      testType,
      testDate: testDate ?? new Date(),
      status: LabResultStatus.PENDING,
    },
    select: labResultSelect,
  });

  return jsonOk(labResult, 201);
}

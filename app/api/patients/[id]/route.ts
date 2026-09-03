import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { canReadPatientRecords } from '@/lib/security/idor';
import { jsonOk, jsonAuthError, jsonForbidden, jsonNotFound } from '@/lib/api';

type RouteContext = { params: { id: string } };

/**
 * GET /api/patients/[id] - kompletan karton jednog pacijenta.
 *
 * Vraca sve sto cini karton: licne podatke, alergije, hronoloski poredane
 * preglede sa propisanom terapijom i laboratorijske nalaze. Sve u jednom
 * odgovoru, da stranica ne mora da salje cetiri odvojena zahteva.
 *
 * Pristup: osoblje svima, pacijent iskljucivo svom kartonu (IDOR provera).
 */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth.error) return jsonAuthError(auth.error);

  // Provera vlasnistva ide PRE ucitavanja kartona - nema razloga citati
  // podatke koje pozivalac ionako ne sme da vidi.
  const allowed = await canReadPatientRecords(auth.user, params.id);
  if (!allowed) return jsonForbidden();

  const patient = await prisma.patientProfile.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      jmbg: true,
      dateOfBirth: true,
      bloodType: true,
      address: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      insuranceNumber: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },

      allergies: {
        select: { id: true, allergen: true, severity: true, notes: true },
        // Najteze alergije prve - one su najvaznije upozorenje lekaru.
        orderBy: { severity: 'desc' },
      },

      medicalRecords: {
        select: {
          id: true,
          visitDate: true,
          symptoms: true,
          diagnosisCode: true,
          diagnosisName: true,
          therapyNotes: true,
          doctor: {
            select: {
              id: true,
              fullName: true,
              doctorProfile: { select: { specialization: true } },
            },
          },
          prescriptions: {
            select: {
              id: true,
              medicationName: true,
              dosage: true,
              frequency: true,
              durationDays: true,
              notes: true,
            },
          },
          labResults: {
            select: {
              id: true,
              testType: true,
              resultValue: true,
              resultUnit: true,
              referenceRange: true,
              status: true,
              testDate: true,
            },
            orderBy: { testDate: 'desc' },
          },
        },
        orderBy: { visitDate: 'desc' }, // najnoviji pregled na vrhu kartona
      },

      labResults: {
        select: {
          id: true,
          testType: true,
          resultValue: true,
          resultUnit: true,
          referenceRange: true,
          status: true,
          testDate: true,
        },
        orderBy: { testDate: 'desc' },
      },
    },
  });

  if (!patient) return jsonNotFound('Pacijent ne postoji');

  return jsonOk(patient);
}

import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/session';
import { Role } from '@prisma/client';
import { searchDiagnoses } from '@/lib/external/icd10';
import { jsonOk, jsonAuthError } from '@/lib/api';

/**
 * GET /api/external/icd10?q=pojam - proxy ka ICD-10 servisu.
 *
 * Zasto proxy, a ne poziv direktno iz browsera:
 *  1. Ruta je zasticena - samo lekar sme da pretrazuje sifre dijagnoza.
 *  2. Adresa i eventualni kljuc eksternog servisa ostaju na serveru.
 *  3. Nema problema sa CORS ogranicenjima u browseru.
 *  4. Ako se servis jednog dana promeni, menja se samo ovaj fajl.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole([Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  const term = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  // Pretraga po jednom slovu vraca stotine nebitnih rezultata,
  // pa se ispod dva karaktera uopste ne poziva eksterni servis.
  if (term.length < 2) return jsonOk([]);

  const diagnoses = await searchDiagnoses(term, 10);
  return jsonOk(diagnoses);
}

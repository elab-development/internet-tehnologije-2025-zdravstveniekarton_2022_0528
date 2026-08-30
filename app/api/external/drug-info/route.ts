import { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireRole } from '@/lib/session';
import { getDrugInfo } from '@/lib/external/drugInfo';
import { jsonOk, jsonAuthError } from '@/lib/api';

/**
 * GET /api/external/drug-info?name=lek - proxy ka openFDA servisu.
 *
 * Dostupno lekaru, jer se koristi pri propisivanju terapije.
 *
 * Kada lek nije pronadjen vraca se { data: null } sa statusom 200, a NE greska.
 * Razlog: izostanak podatka u americkoj bazi nije greska aplikacije niti
 * korisnika - lek jednostavno nije registrovan u SAD. Forma na osnovu null
 * vrednosti prikaze poruku "Podaci o leku nisu dostupni" i dozvoli unos dalje.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole([Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  const name = request.nextUrl.searchParams.get('name')?.trim() ?? '';
  if (name.length < 3) return jsonOk(null);

  const info = await getDrugInfo(name);
  return jsonOk(info);
}

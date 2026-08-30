import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Pomocne funkcije da sve API rute vracaju odgovore u istom obliku.
 * Zahtev predmeta je da i podaci i greske budu u JSON formatu.
 *
 * Uspeh:  { "data": ... }
 * Greska: { "error": "poruka", "fields": { "email": "Neispravna email adresa" } }
 */

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standardni odgovori kada korisnik nije prijavljen odnosno nema ovlascenje.
 * 401 = "ne znam ko si", 403 = "znam ko si, ali ti nije dozvoljeno".
 */
export function jsonUnauthorized() {
  return jsonError('Niste prijavljeni', 401);
}

export function jsonForbidden() {
  return jsonError('Nemate ovlascenje za ovu akciju', 403);
}

export function jsonNotFound(message = 'Trazeni podatak ne postoji') {
  return jsonError(message, 404);
}

/**
 * Pretvara razlog odbijanja iz requireAuth/requireRole u odgovarajuci HTTP odgovor.
 * Koristi se u svakoj zasticenoj ruti, pa se pravilo 401/403 pise samo jednom.
 */
export function jsonAuthError(error: 'UNAUTHENTICATED' | 'FORBIDDEN') {
  return error === 'UNAUTHENTICATED' ? jsonUnauthorized() : jsonForbidden();
}

/**
 * Pretvara Zod gresku u odgovor sa mapom "polje -> poruka",
 * da bi forma na klijentu mogla da prikaze gresku ispod odgovarajuceg polja.
 */
export function jsonValidationError(error: ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    if (!fields[field]) {
      fields[field] = issue.message;
    }
  }
  return NextResponse.json({ error: 'Podaci nisu ispravni', fields }, { status: 400 });
}

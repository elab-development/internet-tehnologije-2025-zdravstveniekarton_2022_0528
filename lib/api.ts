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

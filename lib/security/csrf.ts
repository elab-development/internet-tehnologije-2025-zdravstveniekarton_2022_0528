import type { NextRequest } from 'next/server';

/**
 * Zastita od CSRF napada (Cross-Site Request Forgery).
 *
 * CSRF je napad u kome napadac napravi svoju stranicu koja u pozadini salje
 * zahtev ka NASOJ aplikaciji. Ako je zrtva u tom trenutku prijavljena, browser
 * uz taj zahtev automatski salje i kolacic sesije - i zahtev prolazi kao da ga
 * je poslao sam korisnik. Primer: napadaceva stranica salje
 *   POST /api/users  { role: "DOCTOR", ... }
 * dok je administrator prijavljen u drugom tabu.
 *
 * Odbrana: browser uz svaki zahtev koji menja podatke salje zaglavlje Origin
 * sa adresom stranice koja ga je poslala. To zaglavlje JavaScript ne moze da
 * promeni. Ako Origin nije nasa adresa, zahtev nije stigao sa nase stranice
 * i odbija se.
 *
 * Napomena: NextAuth sopstvene rute (/api/auth/*) vec imaju svoj CSRF token,
 * pa se ova provera na njih ne primenjuje.
 */

/** Metode koje menjaju podatke; GET zahtevi se ne proveravaju. */
const MUTATING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function isValidOrigin(request: NextRequest): boolean {
  if (!MUTATING_METHODS.includes(request.method)) return true;

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Zahtevi van browsera (Postman, curl, testovi) nemaju Origin zaglavlje.
  // Njih ne odbijamo, jer CSRF napad po definiciji ide kroz tudji browser -
  // napadac koji vec moze da salje zahteve iz alata ionako nema zrtvin kolacic.
  if (!origin) return true;
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    // Neispravan Origin - tretira se kao sumnjiv zahtev.
    return false;
  }
}

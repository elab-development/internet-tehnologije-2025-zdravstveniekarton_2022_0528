import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Ogranicavanje broja pokusaja (rate limiting).
 *
 * Bez ovoga napadac moze automatski da isproba hiljade lozinki nad jednim
 * nalogom (brute-force napad). Posto je bcrypt spor, takav napad ujedno
 * opterecuje i server.
 *
 * Brojac se drzi u memoriji procesa, sto je dovoljno za studentski projekat i
 * za pokretanje u jednom Docker kontejneru. U pravoj produkciji sa vise
 * instanci aplikacije brojac bi morao da bude zajednicki (npr. u Redis-u),
 * jer svaka instanca inace broji zasebno - to je svesno ogranicenje i navedeno
 * je u dokumentaciji.
 */

/** Prijava: najvise 5 neuspelih pokusaja u 15 minuta, pa pauza od 15 minuta. */
const loginLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
  blockDuration: 15 * 60,
});

/** Registracija: najvise 3 nova naloga sa iste adrese na sat. */
const registerLimiter = new RateLimiterMemory({
  points: 3,
  duration: 60 * 60,
  blockDuration: 60 * 60,
});

/**
 * Adresa sa koje je stigao zahtev.
 *
 * Iza reverznog proxija (Vercel, Nginx) prava adresa korisnika nalazi se u
 * zaglavlju x-forwarded-for, jer bi inace svi zahtevi izgledali kao da dolaze
 * sa istog mesta.
 */
export function getClientKey(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? 'nepoznata-adresa';
}

/** Vraca true ako zahtev sme da prodje, false ako je limit dostignut. */
async function consume(limiter: RateLimiterMemory, key: string): Promise<boolean> {
  try {
    await limiter.consume(key);
    return true;
  } catch {
    // Biblioteka baca izuzetak kada je limit dostignut - to nije greska
    // u radu aplikacije, nego ocekivan odgovor, pa se samo vraca false.
    return false;
  }
}

/**
 * Broji NEUSPELE pokusaje prijave. Uspesna prijava brise brojac, da korisnik
 * koji se samo omasio u kucanju ne bi ostao zakljucan.
 */
export function checkLoginAttempt(key: string) {
  return consume(loginLimiter, key);
}

export async function resetLoginAttempts(key: string) {
  await loginLimiter.delete(key);
}

export function checkRegisterAttempt(key: string) {
  return consume(registerLimiter, key);
}

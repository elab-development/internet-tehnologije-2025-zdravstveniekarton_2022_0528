import { withAuth, type NextRequestWithAuth } from 'next-auth/middleware';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { getRequiredRoles } from '@/lib/permissions';
import { isValidOrigin } from '@/lib/security/csrf';

/**
 * Middleware se izvrsava PRE nego sto Next.js pocne da obradjuje zahtev.
 * Ovde se odvijaju dve odvojene provere:
 *
 *  1. CSRF - za sve API zahteve koji menjaju podatke proverava se da li su
 *     stigli sa nase stranice (lib/security/csrf.ts).
 *  2. RBAC - za zasticene stranice proverava se da li uloga korisnika sme
 *     na tu putanju (lib/permissions.ts).
 *
 * Fina provera "da li je BAS OVAJ zapis tvoj" (IDOR) radi se u API rutama,
 * jer middleware nema pristup bazi.
 */

// Zastita stranica po ulozi. NextAuth-ov withAuth sam preusmerava
// neprijavljene korisnike na stranicu za prijavu.
const pageMiddleware = withAuth(
  function handlePage(request) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    const requiredRoles = getRequiredRoles(pathname);

    // Putanja nije posebno ogranicena - dovoljno je da je korisnik prijavljen.
    if (!requiredRoles) return NextResponse.next();

    if (!token || !requiredRoles.includes(token.role)) {
      // Korisnik jeste prijavljen, ali nema pravo na ovu stranicu, pa se
      // salje na pocetnu sa oznakom greske umesto na stranicu za prijavu.
      const url = new URL('/', request.url);
      url.searchParams.set('greska', 'nemate-pristup');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    // withAuth ne cita podesavanja iz lib/auth.ts, pa se sopstvena stranica
    // za prijavu mora navesti i ovde.
    pages: { signIn: '/login' },
    callbacks: {
      authorized: ({ token }) => token !== null,
    },
  },
);

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    // NextAuth-ove rute imaju sopstveni CSRF token, pa ih preskacemo.
    if (!pathname.startsWith('/api/auth/') && !isValidOrigin(request)) {
      return NextResponse.json({ error: 'Zahtev nije stigao sa ove aplikacije' }, { status: 403 });
    }
    // API rute same proveravaju prijavu i ovlascenja (lib/session.ts),
    // pa se ovde ne primenjuje provera sesije.
    return NextResponse.next();
  }

  // withAuth ocekuje zahtev kome je sam dodao polje nextauth; to polje popunjava
  // pre nego sto pozove nasu funkciju, pa je ovde dovoljna promena tipa.
  return pageMiddleware(request as NextRequestWithAuth, event);
}

/**
 * Matcher govori na kojim putanjama se middleware pokrece.
 * Pocetna, /login i /register moraju ostati javne, inace bi se korisnik
 * vrteo u krug pri prijavi.
 */
export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/appointments/:path*',
    '/patients/:path*',
    '/medical-records/:path*',
    '/lab-results/:path*',
    '/admin/:path*',
    '/stats/:path*',
  ],
};

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { getRequiredRoles } from '@/lib/permissions';

/**
 * Middleware se izvrsava PRE nego sto Next.js uopste pocne da renderuje stranicu.
 * To je prva linija odbrane - neovlascen korisnik ne stigne ni do koda stranice.
 *
 * Ovde se radi gruba provera "da li ova uloga sme na ovu putanju".
 * Fina provera "da li sme bas do OVOG pacijenta" (IDOR zastita) radi se u API
 * rutama, jer middleware nema pristup bazi.
 */
export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    const requiredRoles = getRequiredRoles(pathname);

    // Putanja nije posebno ogranicena - dovoljno je da je korisnik prijavljen,
    // sto je vec proverio authorized callback ispod.
    if (!requiredRoles) {
      return NextResponse.next();
    }

    if (!token || !requiredRoles.includes(token.role)) {
      // Ne saljemo korisnika na login (vec jeste prijavljen), nego na pocetnu
      // stranicu sa oznakom greske, da bi mu se prikazala jasna poruka.
      const url = new URL('/', request.url);
      url.searchParams.set('greska', 'nemate-pristup');
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  },
  {
    // withAuth ne cita podesavanja iz lib/auth.ts, pa se sopstvena stranica
    // za prijavu mora navesti i ovde - inace bi slao na podrazumevanu NextAuth stranu.
    pages: { signIn: '/login' },
    callbacks: {
      // Vraca true ako korisnik sme dalje. Ovde propustamo samo prijavljene;
      // neprijavljene NextAuth automatski salje na stranicu /login.
      authorized: ({ token }) => token !== null,
    },
  },
);

/**
 * Matcher govori na kojim putanjama se middleware uopste pokrece.
 * Navode se samo zasticene putanje - pocetna, /login i /register moraju
 * ostati javne, inace bi se korisnik vrteo u krug pri prijavi.
 */
export const config = {
  matcher: [
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

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

/**
 * Centralna NextAuth konfiguracija.
 *
 * Koristimo Credentials provider (prijava email + lozinka) jer aplikacija ima
 * sopstvenu tabelu korisnika, bez prijave preko Google-a ili drugih servisa.
 *
 * Sesija se cuva kao JWT token u httpOnly kolacicu. To znaci da JavaScript na
 * stranici ne moze da procita token, cime se sprecava kradja sesije XSS napadom.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email i lozinka',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Lozinka', type: 'password' },
      },

      // Funkcija koja odlucuje da li je prijava uspesna. Vraca korisnika ili null.
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        // Namerno se ne razlikuje "nepostojeci email" od "pogresna lozinka".
        // Da razlikujemo, napadac bi mogao da otkrije koji nalozi postoje u sistemu.
        if (!user) {
          return null;
        }

        // Deaktiviran nalog se ne moze prijaviti, cak i sa ispravnom lozinkom.
        // Provera ide PRE poredjenja lozinke, da se ne trosi vreme na bcrypt.
        if (!user.isActive) {
          return null;
        }

        const passwordMatches = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        // Sve sto se ovde vrati zavrsi u JWT tokenu, pa se passwordHash nikada ne vraca.
        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // osam sati - duzina jedne smene u zdravstvenoj ustanovi
  },

  callbacks: {
    // Poziva se pri kreiranju tokena. Ovde u token upisujemo id i ulogu korisnika,
    // da bi kasnije autorizacija mogla da radi bez dodatnog upita ka bazi.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    // Poziva se pri svakom citanju sesije. Prenosi id i ulogu iz tokena u session objekat,
    // koji je ono sto komponente vide preko useSession() odnosno getServerSession().
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: '/login', // sopstvena stranica za prijavu umesto podrazumevane NextAuth strane
  },

  secret: process.env.NEXTAUTH_SECRET,
};

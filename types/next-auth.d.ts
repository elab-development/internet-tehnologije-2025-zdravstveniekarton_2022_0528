import type { Role } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

/**
 * NextAuth podrazumevano zna samo za polja name, email i image.
 * Ovde mu "dopisujemo" id i role, da bi TypeScript prepoznao session.user.role
 * svuda u aplikaciji i upozorio nas ako negde pogresimo naziv uloge.
 */
declare module 'next-auth' {
  interface User {
    id: string;
    role: Role;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      name?: string | null;
      email?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}

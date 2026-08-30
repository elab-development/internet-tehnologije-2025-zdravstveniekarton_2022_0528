import { getServerSession } from 'next-auth';
import { Role } from '@prisma/client';
import { authOptions } from '@/lib/auth';

/**
 * Pomocne funkcije za proveru ko poziva API rutu.
 *
 * Middleware stiti STRANICE, ali API rute mora svaka sama da proveri pozivaoca -
 * neko moze pozvati /api/... direktno iz Postmana, bez otvaranja ijedne stranice.
 */

export type SessionUser = {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
};

/** Vraca prijavljenog korisnika ili null ako niko nije prijavljen. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * Rezultat provere: ili korisnik, ili razlog odbijanja.
 * Ruta na osnovu polja "error" odlucuje da li da vrati 401 ili 403.
 */
export type AuthCheck =
  { user: SessionUser; error: null } | { user: null; error: 'UNAUTHENTICATED' | 'FORBIDDEN' };

/** Trazi da je korisnik prijavljen, bez obzira na ulogu. */
export async function requireAuth(): Promise<AuthCheck> {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: 'UNAUTHENTICATED' };
  return { user, error: null };
}

/** Trazi da je korisnik prijavljen I da mu je uloga na spisku dozvoljenih. */
export async function requireRole(allowedRoles: Role[]): Promise<AuthCheck> {
  const user = await getCurrentUser();
  if (!user) return { user: null, error: 'UNAUTHENTICATED' };
  if (!allowedRoles.includes(user.role)) return { user: null, error: 'FORBIDDEN' };
  return { user, error: null };
}

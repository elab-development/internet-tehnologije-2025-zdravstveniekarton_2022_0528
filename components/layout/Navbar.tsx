'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Role } from '@prisma/client';
import Button from '@/components/ui/Button';

/**
 * Navigacioni meni koji se prilagodjava ulozi prijavljenog korisnika.
 *
 * Koriscene kuke:
 *  - useSession  -> ko je prijavljen i koja mu je uloga
 *  - usePathname -> koja je trenutna stranica, da se oznaci aktivna stavka
 *
 * Vazno: skrivanje stavki iz menija NIJE bezbednosna mera, vec samo udobnost za
 * korisnika. Prava zastita je u middleware.ts i u API rutama - ko rucno ukuca
 * adresu, bice odbijen tamo.
 */

type NavItem = {
  href: string;
  label: string;
  roles: Role[]; // uloge koje vide ovu stavku
};

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Pocetna',
    roles: [Role.PATIENT, Role.NURSE, Role.DOCTOR, Role.ADMIN],
  },
  {
    href: '/appointments',
    label: 'Termini',
    roles: [Role.PATIENT, Role.NURSE, Role.DOCTOR],
  },
  { href: '/patients', label: 'Pacijenti', roles: [Role.NURSE, Role.DOCTOR, Role.ADMIN] },
  { href: '/lab-results', label: 'Nalazi', roles: [Role.PATIENT, Role.NURSE, Role.DOCTOR] },
  { href: '/stats', label: 'Statistika', roles: [Role.DOCTOR, Role.ADMIN] },
  { href: '/admin', label: 'Administracija', roles: [Role.ADMIN] },
];

// Naziv uloge na srpskom, za prikaz pored imena korisnika.
const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Doktor',
  NURSE: 'Sestra',
  PATIENT: 'Pacijent',
};

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Dok se sesija ucitava ne prikazujemo nista, da meni ne "treperi"
  // prelaskom iz odjavljenog u prijavljeno stanje.
  if (status === 'loading') {
    return <div className="h-16 border-b border-slate-200 bg-white" />;
  }

  const role = session?.user?.role;
  const visibleItems = role ? NAV_ITEMS.filter((item) => item.roles.includes(role)) : [];

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold text-sky-800">
          e-Karton
        </Link>

        <ul className="flex flex-1 items-center gap-1">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    isActive
                      ? 'rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800'
                      : 'rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50'
                  }
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {session?.user ? (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="text-right text-sm leading-tight hover:underline">
              <span className="block font-medium text-slate-800">{session.user.name}</span>
              <span className="block text-xs text-slate-500">{ROLE_LABELS[session.user.role]}</span>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
              Odjava
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Prijava
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-sky-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-800"
            >
              Registracija
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}

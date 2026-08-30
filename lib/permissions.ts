import { Role } from '@prisma/client';

/**
 * Tabela dozvola: koja ruta trazi koje uloge.
 *
 * Drzi se na jednom mestu da bi se pravila pristupa citala kao spisak, a ne da budu
 * razbacana po fajlovima. Isti spisak koristi i middleware (zastita stranica) i
 * kasnije API rute (zastita podataka).
 */
export const ROUTE_PERMISSIONS: { prefix: string; roles: Role[] }[] = [
  // Administrativni deo - iskljucivo administrator.
  { prefix: '/admin', roles: [Role.ADMIN] },

  // Statistika cele ustanove - administrator i doktori.
  { prefix: '/stats', roles: [Role.ADMIN, Role.DOCTOR] },

  // Spisak pacijenata i njihovi kartoni - medicinsko osoblje i administrator.
  // Pacijent ovde NEMA pristup; on svoj karton vidi na sopstvenoj stranici.
  { prefix: '/patients', roles: [Role.DOCTOR, Role.NURSE, Role.ADMIN] },

  // Zakazivanje termina - samo pacijent salje zahtev za termin.
  { prefix: '/appointments/create', roles: [Role.PATIENT] },

  // Unos i izmena pregleda - samo doktor postavlja dijagnozu i terapiju.
  { prefix: '/medical-records/create', roles: [Role.DOCTOR] },

  // Narucivanje analize - iskljucivo lekar. Sestra rezultat unosi kroz
  // modalni prozor na listi nalaza, pa joj ova stranica nije potrebna.
  { prefix: '/lab-results/create', roles: [Role.DOCTOR] },
];

/**
 * Vraca listu uloga kojima je dozvoljena data putanja,
 * ili null ako putanja nije posebno ogranicena (dovoljna je bilo koja prijava).
 */
export function getRequiredRoles(pathname: string): Role[] | null {
  const rule = ROUTE_PERMISSIONS.find(
    (item) => pathname === item.prefix || pathname.startsWith(item.prefix + '/'),
  );
  return rule ? rule.roles : null;
}

/** Stranice na koje se sme i bez prijave. */
export const PUBLIC_ROUTES = ['/', '/login', '/register', '/api-docs'];

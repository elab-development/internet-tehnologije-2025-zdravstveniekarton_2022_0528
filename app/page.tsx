import Link from 'next/link';
import Card from '@/components/ui/Card';
import RolesInfoModal from '@/components/home/RolesInfoModal';

// Nalozi iz seed skripte, da se aplikacija moze odmah isprobati.
const DEMO_ACCOUNTS = [
  { role: 'Administrator', email: 'admin@ekarton.rs' },
  { role: 'Doktor', email: 'jovanovic@ekarton.rs' },
  { role: 'Sestra', email: 'sestra@ekarton.rs' },
  { role: 'Pacijent', email: 'marko@primer.rs' },
];

// searchParams stize automatski iz URL-a. Middleware pri odbijenom pristupu
// preusmerava ovde sa ?greska=nemate-pristup, pa se poruka prikazuje korisniku.
export default function HomePage({ searchParams }: { searchParams: { greska?: string } }) {
  const accessDenied = searchParams.greska === 'nemate-pristup';

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {accessDenied && (
        <p
          role="alert"
          className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          Nemate ovlascenje za pristup toj stranici.
        </p>
      )}

      <h1 className="text-4xl font-bold text-sky-800">Zdravstveni e-Karton</h1>
      <p className="mt-4 text-lg text-slate-600">
        Elektronski zdravstveni karton za pacijente, doktore, medicinske sestre i administratore.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-md bg-sky-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-800"
        >
          Prijava
        </Link>
        <Link
          href="/register"
          className="rounded-md border border-sky-700 px-5 py-2.5 text-sm font-medium text-sky-700 hover:bg-sky-50"
        >
          Registracija pacijenta
        </Link>
        <RolesInfoModal />
      </div>

      <Card title="Demo nalozi" subtitle="Lozinka za sve naloge je lozinka123" className="mt-10">
        <ul className="divide-y divide-slate-100 text-sm">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email} className="flex justify-between py-2">
              <span className="text-slate-600">{account.role}</span>
              <span className="font-mono text-slate-800">{account.email}</span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}

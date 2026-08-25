import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6">
      <h1 className="text-4xl font-bold text-sky-800">Zdravstveni e-Karton</h1>
      <p className="mt-4 text-lg text-slate-600">
        Elektronski zdravstveni karton za pacijente, doktore, medicinske sestre i administratore.
      </p>

      <div className="mt-8 flex gap-3">
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
      </div>
    </main>
  );
}

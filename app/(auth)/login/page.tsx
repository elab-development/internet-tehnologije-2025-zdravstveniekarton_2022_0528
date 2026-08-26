'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

/**
 * Stranica za prijavu (/login).
 *
 * Koriscene kuke:
 *  - useState  -> cuva unete podatke, poruku o gresci i stanje slanja
 *  - useRouter -> preusmerava korisnika posle uspesne prijave
 */
export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    // redirect: false znaci da NextAuth nece sam da preusmeri stranicu,
    // vec nam vraca rezultat da bismo gresku prikazali u samoj formi.
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (result?.error) {
      setError('Pogresna email adresa ili lozinka.');
      return;
    }

    router.push('/');
    router.refresh(); // osvezava serverske komponente da odmah vide novu sesiju
  }

  return (
    <main className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-primary-800">Prijava</h1>
        <p className="mt-2 text-sm text-slate-600">
          Unesite podatke za pristup svom zdravstvenom kartonu.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Email adresa"
            name="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ime@primer.rs"
          />

          <Input
            label="Lozinka"
            name="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {error && (
            <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </p>
          )}

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Prijavi se
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Nemate nalog?{' '}
          <Link href="/register" className="font-medium text-primary-700 hover:underline">
            Registrujte se
          </Link>
        </p>
      </div>
    </main>
  );
}

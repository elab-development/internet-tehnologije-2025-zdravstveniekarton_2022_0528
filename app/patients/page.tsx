'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { formatDate } from '@/lib/format';

type Patient = {
  id: string;
  jmbg: string;
  dateOfBirth: string;
  bloodType: string | null;
  user: { id: string; fullName: string; email: string; phone: string | null };
  _count: { medicalRecords: number; allergies: number };
};

/**
 * Spisak pacijenata (/patients) - za lekare, sestre i administratora.
 * Pacijentu je ova stranica zabranjena preko middleware-a.
 *
 * Pretraga po imenu ili JMBG-u radi na SERVERU, a ne filtriranjem vec ucitane
 * liste. Razlog: u stvarnoj ustanovi pacijenata ima na hiljade, pa se ne sme
 * povlaciti cela lista u browser samo da bi se filtrirala.
 *
 * Koriscene kuke: useState, useEffect.
 */
export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Debounce: zahtev se salje tek 350ms posle poslednjeg pritiska tastera,
    // da se ne pravi novi upit ka bazi za svako otkucano slovo.
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError('');

      const query = searchTerm.trim() ? `?q=${encodeURIComponent(searchTerm.trim())}` : '';
      const response = await fetch(`/api/patients${query}`);

      if (!response.ok) {
        setError('Spisak pacijenata nije moguce ucitati.');
        setIsLoading(false);
        return;
      }

      setPatients((await response.json()).data);
      setIsLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <main className="page-container max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-primary-800">Pacijenti</h1>

      <div className="mb-6 max-w-md">
        <Input
          label="Pretraga"
          name="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Ime, prezime ili JMBG"
          hint="Pretraga krece automatski dok kucate"
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Ucitavanje...</p>
      ) : patients.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          {searchTerm ? 'Nijedan pacijent ne odgovara pretrazi.' : 'Nema registrovanih pacijenata.'}
        </p>
      ) : (
        <Card>
          {/* Tabela se na uskim ekranima skroluje vodoravno umesto da se lomi. */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Pacijent</th>
                  <th className="pb-2 pr-4 font-medium">JMBG</th>
                  <th className="pb-2 pr-4 font-medium">Datum rodjenja</th>
                  <th className="pb-2 pr-4 font-medium">Krvna grupa</th>
                  <th className="pb-2 pr-4 font-medium">Pregleda</th>
                  <th className="pb-2 font-medium">Alergija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="font-medium text-primary-700 hover:underline"
                      >
                        {patient.user.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">{patient.user.email}</p>
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-slate-600">{patient.jmbg}</td>
                    <td className="py-3 pr-4 text-slate-600">{formatDate(patient.dateOfBirth)}</td>
                    <td className="py-3 pr-4 text-slate-600">{patient.bloodType || '-'}</td>
                    <td className="py-3 pr-4 text-slate-600">{patient._count.medicalRecords}</td>
                    <td className="py-3">
                      {patient._count.allergies > 0 ? (
                        // Broj alergija je istaknut, jer je to podatak na koji
                        // osoblje mora da obrati paznju pre terapije.
                        <span className="rounded-full bg-warning-100 px-2.5 py-1 text-xs font-medium text-warning-700">
                          {patient._count.allergies}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </main>
  );
}

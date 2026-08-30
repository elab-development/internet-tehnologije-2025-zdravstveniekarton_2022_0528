'use client';

import { useEffect, useState } from 'react';
import { AppointmentStatus } from '@prisma/client';
import Card from '@/components/ui/Card';
import StatTile from '@/components/dashboard/StatTile';
import VisitsPerMonthChart from '@/components/charts/VisitsPerMonthChart';
import TopDiagnosesChart from '@/components/charts/TopDiagnosesChart';

type Stats = {
  scope: 'DOCTOR' | 'ALL';
  totals: { records: number; prescriptions: number };
  visitsPerMonth: { label: string; count: number }[];
  topDiagnoses: { name: string; count: number }[];
  appointmentsByStatus: { status: AppointmentStatus; count: number }[];
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  REQUESTED: 'Cekaju potvrdu',
  CONFIRMED: 'Potvrdjeni',
  COMPLETED: 'Obavljeni',
  CANCELLED: 'Otkazani',
};

/**
 * Stranica statistike (/stats) sa grafikonima.
 * Dostupna administratoru i lekaru; opseg podataka odredjuje server.
 *
 * Koriscene kuke: useState, useEffect.
 */
export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadStats() {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        setError('Statistiku nije moguce ucitati.');
        setIsLoading(false);
        return;
      }
      setStats((await response.json()).data);
      setIsLoading(false);
    }
    loadStats();
  }, []);

  if (isLoading) {
    return (
      <main className="page-container">
        <p className="text-sm text-slate-500">Ucitavanje statistike...</p>
      </main>
    );
  }

  if (error || !stats) {
    return (
      <main className="page-container">
        <p role="alert" className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error || 'Podaci nisu dostupni.'}
        </p>
      </main>
    );
  }

  const hasVisits = stats.visitsPerMonth.some((month) => month.count > 0);

  return (
    <main className="page-container max-w-5xl">
      <h1 className="text-2xl font-bold text-primary-800">Statistika</h1>
      <p className="mt-1 text-sm text-slate-500">
        {stats.scope === 'DOCTOR'
          ? 'Prikazani su podaci o pregledima koje ste vi uneli.'
          : 'Prikazani su podaci za celu ustanovu.'}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Ukupno pregleda" value={stats.totals.records} />
        <StatTile label="Propisanih lekova" value={stats.totals.prescriptions} />
        {stats.appointmentsByStatus
          .filter((item) => item.status !== AppointmentStatus.CANCELLED)
          .slice(0, 2)
          .map((item) => (
            <StatTile key={item.status} label={STATUS_LABELS[item.status]} value={item.count} />
          ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Pregledi po mesecima" subtitle="Poslednjih 12 meseci">
          {/* Chart.js trazi da roditelj ima zadatu visinu, jer se sam prilagodjava
              velicini kontejnera. Bez ove visine grafik se ne bi video. */}
          <div className="h-72">
            {hasVisits ? (
              <VisitsPerMonthChart data={stats.visitsPerMonth} />
            ) : (
              <p className="pt-24 text-center text-sm text-slate-500">
                Nema pregleda u poslednjih godinu dana.
              </p>
            )}
          </div>
        </Card>

        <Card title="Najcesce dijagnoze" subtitle="Udeo u ukupnom broju pregleda">
          <div className="h-72">
            {stats.topDiagnoses.length > 0 ? (
              <TopDiagnosesChart data={stats.topDiagnoses} />
            ) : (
              <p className="pt-24 text-center text-sm text-slate-500">Jos nema unetih dijagnoza.</p>
            )}
          </div>
        </Card>
      </div>

      <Card title="Termini po statusu" className="mt-6">
        <ul className="divide-y divide-slate-100 text-sm">
          {stats.appointmentsByStatus.map((item) => (
            <li key={item.status} className="flex justify-between py-2">
              <span className="text-slate-600">{STATUS_LABELS[item.status]}</span>
              <span className="font-medium text-slate-800">{item.count}</span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}

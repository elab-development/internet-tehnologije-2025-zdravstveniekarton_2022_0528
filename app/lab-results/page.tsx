'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Role, LabResultStatus } from '@prisma/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { formatDate } from '@/lib/format';

type LabResult = {
  id: string;
  testType: string;
  resultValue: string | null;
  resultUnit: string | null;
  referenceRange: string | null;
  status: LabResultStatus;
  testDate: string;
  patientProfile: { id: string; user: { id: string; fullName: string } };
  requestedByDoctor: { id: string; fullName: string };
  uploadedByNurse: { id: string; fullName: string } | null;
};

const STATUS_FILTER_OPTIONS = [
  { value: LabResultStatus.PENDING, label: 'Cekaju rezultat' },
  { value: LabResultStatus.COMPLETED, label: 'Zavrseni' },
];

const emptyResultForm = { resultValue: '', resultUnit: '', referenceRange: '' };

/**
 * Laboratorijski nalazi (/lab-results).
 *
 * Pacijent vidi svoje nalaze, osoblje sve. Sestra i lekar koji je nalaz
 * narucio mogu da unesu rezultat kroz modalni prozor.
 *
 * Koriscene kuke: useSession, useState, useEffect, useCallback.
 */
export default function LabResultsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const searchParams = useSearchParams();

  const [results, setResults] = useState<LabResult[]>([]);
  // Pocetni filter se cita iz adrese (/lab-results?status=PENDING sa dashboard-a).
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Nalaz za koji je otvoren modal za unos rezultata; null znaci zatvoren modal.
  const [resultToFill, setResultToFill] = useState<LabResult | null>(null);
  const [resultForm, setResultForm] = useState(emptyResultForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const query = statusFilter ? `?status=${statusFilter}` : '';
    const response = await fetch(`/api/lab-results${query}`);
    if (!response.ok) {
      setError('Nalaze nije moguce ucitati.');
      setIsLoading(false);
      return;
    }
    setResults((await response.json()).data);
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  function openFillModal(result: LabResult) {
    setResultToFill(result);
    setResultForm(emptyResultForm);
    setFieldErrors({});
  }

  async function submitResult() {
    if (!resultToFill) return;
    setIsSaving(true);

    const response = await fetch(`/api/lab-results/${resultToFill.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resultValue: resultForm.resultValue,
        resultUnit: resultForm.resultUnit || undefined,
        referenceRange: resultForm.referenceRange || undefined,
      }),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setError(payload.error ?? 'Unos rezultata nije uspeo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    setResultToFill(null);
    await loadResults();
  }

  // Rezultat unosi sestra, ili lekar za nalaz koji je sam narucio.
  function canFill(result: LabResult) {
    if (result.status === LabResultStatus.COMPLETED) return false;
    if (role === Role.NURSE) return true;
    return role === Role.DOCTOR && result.requestedByDoctor.id === session?.user?.id;
  }

  return (
    <main className="page-container max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-800">Laboratorijski nalazi</h1>

        {/* Analizu narucuje iskljucivo lekar. */}
        {role === Role.DOCTOR && (
          <Link
            href="/lab-results/create"
            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            Naruci analizu
          </Link>
        )}
      </div>

      <div className="mb-6 max-w-xs">
        <Select
          label="Prikazi"
          name="statusFilter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={STATUS_FILTER_OPTIONS}
          placeholder="Sve nalaze"
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Ucitavanje...</p>
      ) : results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Nema nalaza za prikaz.
        </p>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <Card
              key={result.id}
              title={result.testType}
              subtitle={`${formatDate(result.testDate)} - naruceno od ${result.requestedByDoctor.fullName}`}
              actions={
                result.status === LabResultStatus.COMPLETED ? (
                  <span className="rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700">
                    Zavrsen
                  </span>
                ) : (
                  <span className="rounded-full bg-warning-100 px-2.5 py-1 text-xs font-medium text-warning-700">
                    Ceka rezultat
                  </span>
                )
              }
            >
              {role !== Role.PATIENT && (
                <p className="mb-2 text-sm text-slate-500">
                  Pacijent:{' '}
                  <Link
                    href={`/patients/${result.patientProfile.id}`}
                    className="text-primary-700 hover:underline"
                  >
                    {result.patientProfile.user.fullName}
                  </Link>
                </p>
              )}

              {result.status === LabResultStatus.COMPLETED ? (
                <div className="text-sm">
                  <p className="text-slate-800">
                    <span className="font-medium">Rezultat: </span>
                    {result.resultValue} {result.resultUnit}
                  </p>
                  {result.referenceRange && (
                    <p className="text-slate-500">Referentni opseg: {result.referenceRange}</p>
                  )}
                  {result.uploadedByNurse && (
                    <p className="mt-1 text-xs text-slate-500">
                      Uneo/la: {result.uploadedByNurse.fullName}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Rezultat jos nije unet.</p>
              )}

              {canFill(result) && (
                <div className="mt-3">
                  <Button size="sm" onClick={() => openFillModal(result)}>
                    Unesi rezultat
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={resultToFill !== null}
        onClose={() => setResultToFill(null)}
        title={`Unos rezultata: ${resultToFill?.testType ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResultToFill(null)}>
              Odustani
            </Button>
            <Button onClick={submitResult} isLoading={isSaving}>
              Sacuvaj rezultat
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Izmerena vrednost"
            name="resultValue"
            value={resultForm.resultValue}
            onChange={(event) =>
              setResultForm((previous) => ({ ...previous, resultValue: event.target.value }))
            }
            error={fieldErrors.resultValue}
            placeholder="npr. 11.2"
            required
          />
          <Input
            label="Jedinica mere"
            name="resultUnit"
            value={resultForm.resultUnit}
            onChange={(event) =>
              setResultForm((previous) => ({ ...previous, resultUnit: event.target.value }))
            }
            error={fieldErrors.resultUnit}
            placeholder="npr. 10^9/L"
          />
          <Input
            label="Referentni opseg"
            name="referenceRange"
            value={resultForm.referenceRange}
            onChange={(event) =>
              setResultForm((previous) => ({ ...previous, referenceRange: event.target.value }))
            }
            error={fieldErrors.referenceRange}
            placeholder="npr. 4.0 - 10.0"
          />
        </div>
      </Modal>
    </main>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Role, LabResultStatus } from '@prisma/client';
import Card from '@/components/ui/Card';
import MedicalRecordCard, { type MedicalRecord } from '@/components/medical/MedicalRecordCard';
import { type Allergy } from '@/components/medical/AllergyBadge';
import AllergyManager from '@/components/medical/AllergyManager';
import { formatDate } from '@/lib/format';

type LabResult = {
  id: string;
  testType: string;
  resultValue: string | null;
  resultUnit: string | null;
  referenceRange: string | null;
  status: LabResultStatus;
  testDate: string;
};

type PatientChart = {
  id: string;
  jmbg: string;
  dateOfBirth: string;
  bloodType: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  insuranceNumber: string | null;
  user: { id: string; fullName: string; email: string; phone: string | null };
  allergies: Allergy[];
  medicalRecords: MedicalRecord[];
  labResults: LabResult[];
};

/**
 * Karton pacijenta (/patients/[id]) - centralna stranica aplikacije.
 *
 * Sadrzi licne podatke, upozorenja o alergijama, hronolosku istoriju pregleda
 * sa propisanom terapijom i laboratorijske nalaze.
 *
 * Koriscene kuke: useSession, useState, useEffect.
 */
export default function PatientChartPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [patient, setPatient] = useState<PatientChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // useCallback cuva istu funkciju izmedju rendera, pa je useEffect ne pokrece
  // iznova. Isti poziv koristi AllergyManager da osvezi karton posle izmene.
  const loadChart = useCallback(async () => {
    const response = await fetch(`/api/patients/${params.id}`);
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Karton nije moguce ucitati.');
      setIsLoading(false);
      return;
    }
    setPatient((await response.json()).data);
    setIsLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  if (isLoading) {
    return (
      <main className="page-container">
        <p className="text-sm text-slate-500">Ucitavanje kartona...</p>
      </main>
    );
  }

  if (error || !patient) {
    return (
      <main className="page-container">
        <p role="alert" className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error || 'Karton nije pronadjen.'}
        </p>
      </main>
    );
  }

  return (
    <main className="page-container max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary-800">{patient.user.fullName}</h1>
          <p className="text-sm text-slate-500">Zdravstveni karton</p>
        </div>

        {/* Novi pregled unosi iskljucivo lekar. */}
        {role === Role.DOCTOR && (
          <Link
            href={`/medical-records/create?patientProfileId=${patient.id}`}
            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            Novi pregled
          </Link>
        )}
      </div>

      {/* Alergije idu na vrh: lekar ih mora videti pre nego sto propise terapiju. */}
      <AllergyManager
        patientProfileId={patient.id}
        allergies={patient.allergies}
        canManage={role === Role.DOCTOR || role === Role.NURSE}
        onChanged={loadChart}
      />

      <Card title="Licni podaci" className="mb-6">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Field label="JMBG" value={patient.jmbg} />
          <Field label="Datum rodjenja" value={formatDate(patient.dateOfBirth)} />
          <Field label="Krvna grupa" value={patient.bloodType} />
          <Field label="Broj osiguranja" value={patient.insuranceNumber} />
          <Field label="Telefon" value={patient.user.phone} />
          <Field label="Email" value={patient.user.email} />
          <Field label="Adresa" value={patient.address} />
          <Field
            label="Kontakt za hitne slucajeve"
            value={
              patient.emergencyContactName
                ? `${patient.emergencyContactName} (${patient.emergencyContactPhone ?? '-'})`
                : null
            }
          />
        </dl>
      </Card>

      <Card title="Laboratorijski nalazi" className="mb-6">
        {patient.labResults.length === 0 ? (
          <p className="text-sm text-slate-500">Nema unetih nalaza.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {patient.labResults.map((result) => (
              <li key={result.id} className="flex flex-wrap justify-between gap-2 py-2">
                <div>
                  <p className="font-medium text-slate-800">{result.testType}</p>
                  <p className="text-xs text-slate-500">{formatDate(result.testDate)}</p>
                </div>
                <div className="text-right">
                  {result.status === LabResultStatus.COMPLETED ? (
                    <>
                      <p className="font-medium text-slate-800">
                        {result.resultValue} {result.resultUnit}
                      </p>
                      {result.referenceRange && (
                        <p className="text-xs text-slate-500">
                          referentno: {result.referenceRange}
                        </p>
                      )}
                    </>
                  ) : (
                    <span className="rounded-full bg-warning-100 px-2.5 py-1 text-xs font-medium text-warning-700">
                      Ceka rezultat
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-slate-800">
        Istorija pregleda ({patient.medicalRecords.length})
      </h2>

      {patient.medicalRecords.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          U kartonu jos nema unetih pregleda.
        </p>
      ) : (
        <div className="space-y-4">
          {patient.medicalRecords.map((record) => (
            <MedicalRecordCard key={record.id} record={record} showDetailsLink />
          ))}
        </div>
      )}
    </main>
  );
}

// Mali pomocni prikaz "naziv - vrednost"; prazna polja se prikazuju kao crtica.
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || '-'}</dd>
    </div>
  );
}

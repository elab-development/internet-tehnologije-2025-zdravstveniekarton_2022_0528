'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Role } from '@prisma/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import MedicalRecordCard, { type MedicalRecord } from '@/components/medical/MedicalRecordCard';
import PrescriptionForm from '@/components/medical/PrescriptionForm';

type RecordDetails = MedicalRecord & {
  patientProfile: { id: string; user: { id: string; fullName: string } };
};

/**
 * Detalji jednog pregleda (/medical-records/[id]).
 *
 * Lekar koji je pregled napisao ovde propisuje terapiju i moze da ukloni
 * pogresno unet lek. Ostali korisnici vide samo prikaz.
 *
 * Koriscene kuke: useSession, useState, useEffect, useCallback.
 */
export default function MedicalRecordPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();

  const [record, setRecord] = useState<RecordDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // useCallback cuva istu funkciju izmedju rendera, pa je useEffect ispod ne
  // pokrece iznova bez potrebe. Isti poziv koristi i forma posle upisa leka.
  const loadRecord = useCallback(async () => {
    const response = await fetch(`/api/medical-records/${params.id}`);
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Pregled nije moguce ucitati.');
      setIsLoading(false);
      return;
    }
    setRecord((await response.json()).data);
    setIsLoading(false);
  }, [params.id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  async function handleDeletePrescription(prescriptionId: string) {
    const response = await fetch(`/api/prescriptions/${prescriptionId}`, { method: 'DELETE' });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Uklanjanje leka nije uspelo.');
      return;
    }
    await loadRecord();
  }

  if (isLoading) {
    return (
      <main className="page-container">
        <p className="text-sm text-slate-500">Ucitavanje pregleda...</p>
      </main>
    );
  }

  if (error || !record) {
    return (
      <main className="page-container">
        <p role="alert" className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {error || 'Pregled nije pronadjen.'}
        </p>
      </main>
    );
  }

  // Terapiju propisuje iskljucivo lekar koji je pregled i napisao.
  const canPrescribe = session?.user?.role === Role.DOCTOR && session.user.id === record.doctor.id;

  return (
    <main className="page-container max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/patients/${record.patientProfile.id}`}
          className="text-sm text-primary-700 hover:underline"
        >
          &larr; Karton pacijenta {record.patientProfile.user.fullName}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-primary-800">Detalji pregleda</h1>
      </div>

      <div className="mb-6">
        <MedicalRecordCard record={record} />
      </div>

      {canPrescribe && (
        <>
          {record.prescriptions.length > 0 && (
            <Card title="Uklanjanje pogresno unetog leka" className="mb-6">
              <ul className="divide-y divide-slate-100 text-sm">
                {record.prescriptions.map((prescription) => (
                  <li key={prescription.id} className="flex items-center justify-between py-2">
                    <span className="text-slate-800">
                      {prescription.medicationName} - {prescription.dosage}
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeletePrescription(prescription.id)}
                    >
                      Ukloni
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card
            title="Propisivanje leka"
            subtitle="Podaci o leku se automatski proveravaju u FDA bazi."
          >
            <PrescriptionForm medicalRecordId={record.id} onCreated={loadRecord} />
          </Card>
        </>
      )}
    </main>
  );
}

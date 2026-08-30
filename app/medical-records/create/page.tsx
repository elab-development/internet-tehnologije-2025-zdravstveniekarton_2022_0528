'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppointmentStatus } from '@prisma/client';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import DiagnosisAutocomplete from '@/components/medical/DiagnosisAutocomplete';
import { formatDateTime } from '@/lib/format';

type Patient = {
  id: string;
  user: { id: string; fullName: string };
};

type Appointment = {
  id: string;
  scheduledAt: string;
  reasonForVisit: string;
  status: AppointmentStatus;
  patient: { id: string };
};

/**
 * Forma za unos pregleda u karton (/medical-records/create).
 * Dostupna je samo lekaru - middleware to obezbedjuje na nivou rute.
 *
 * Koriscene kuke:
 *  - useSearchParams -> pacijent moze biti unapred izabran preko ?patientProfileId=
 *  - useEffect       -> ucitavanje pacijenata i termina
 *  - useState        -> podaci forme i greske
 *  - useRouter       -> preusmerenje na karton posle upisa
 */
function CreateMedicalRecordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Ako se do forme dolazi sa kartona pacijenta, pacijent je vec izabran.
  const [patientProfileId, setPatientProfileId] = useState(
    searchParams.get('patientProfileId') ?? '',
  );
  const [appointmentId, setAppointmentId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [diagnosisName, setDiagnosisName] = useState('');
  const [diagnosisCode, setDiagnosisCode] = useState<string | undefined>();
  const [therapyNotes, setTherapyNotes] = useState('');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pacijenti i termini se ucitavaju jednom, pri otvaranju stranice.
  useEffect(() => {
    async function loadData() {
      const [patientsResponse, appointmentsResponse] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/appointments?status=CONFIRMED'),
      ]);
      if (patientsResponse.ok) {
        setPatients((await patientsResponse.json()).data);
      }
      if (appointmentsResponse.ok) {
        setAppointments((await appointmentsResponse.json()).data);
      }
    }
    loadData();
  }, []);

  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: patient.user.fullName,
  }));

  // Nude se samo potvrdjeni termini izabranog pacijenta. Server ionako proverava
  // da termin pripada i tom pacijentu i prijavljenom lekaru.
  const selectedPatient = patients.find((patient) => patient.id === patientProfileId);
  const appointmentOptions = appointments
    .filter((appointment) => appointment.patient.id === selectedPatient?.user.id)
    .map((appointment) => ({
      value: appointment.id,
      label: `${formatDateTime(appointment.scheduledAt)} - ${appointment.reasonForVisit}`,
    }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);

    const response = await fetch('/api/medical-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientProfileId,
        // Prazan izbor se ne salje kao prazan string, nego se izostavlja.
        appointmentId: appointmentId || undefined,
        symptoms,
        diagnosisName,
        diagnosisCode,
        therapyNotes: therapyNotes || undefined,
      }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setIsSubmitting(false);
      setError(payload.error ?? 'Unos pregleda nije uspeo.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    router.push(`/patients/${patientProfileId}`);
    router.refresh();
  }

  return (
    <main className="page-container max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-primary-800">Novi pregled</h1>

      <Card
        title="Unos pregleda u karton"
        subtitle="Dijagnozu potrazite u ICD-10 bazi ili je upisite rucno."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Pacijent"
            name="patientProfileId"
            value={patientProfileId}
            onChange={(event) => {
              setPatientProfileId(event.target.value);
              setAppointmentId(''); // izbor termina vise ne vazi za novog pacijenta
            }}
            options={patientOptions}
            placeholder="-- izaberite pacijenta --"
            error={fieldErrors.patientProfileId}
            required
          />

          {appointmentOptions.length > 0 && (
            <Select
              label="Termin (opciono)"
              name="appointmentId"
              value={appointmentId}
              onChange={(event) => setAppointmentId(event.target.value)}
              options={appointmentOptions}
              placeholder="-- bez termina (hitan slucaj) --"
              error={fieldErrors.appointmentId}
            />
          )}

          <div>
            <label htmlFor="symptoms" className="mb-1 block text-sm font-medium text-slate-700">
              Simptomi
            </label>
            <textarea
              id="symptoms"
              name="symptoms"
              rows={3}
              value={symptoms}
              onChange={(event) => setSymptoms(event.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {fieldErrors.symptoms && (
              <p className="mt-1 text-xs text-danger-600">{fieldErrors.symptoms}</p>
            )}
          </div>

          <DiagnosisAutocomplete
            value={diagnosisName}
            error={fieldErrors.diagnosisName}
            onSelect={(diagnosis) => {
              setDiagnosisName(diagnosis.name);
              setDiagnosisCode(diagnosis.code);
            }}
          />

          <div>
            <label htmlFor="therapyNotes" className="mb-1 block text-sm font-medium text-slate-700">
              Terapija i napomene
            </label>
            <textarea
              id="therapyNotes"
              name="therapyNotes"
              rows={3}
              value={therapyNotes}
              onChange={(event) => setTherapyNotes(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {fieldErrors.therapyNotes && (
              <p className="mt-1 text-xs text-danger-600">{fieldErrors.therapyNotes}</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" isLoading={isSubmitting}>
              Sacuvaj pregled
            </Button>
            <Link
              href="/patients"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Odustani
            </Link>
          </div>
        </form>
      </Card>
    </main>
  );
}

/**
 * useSearchParams() cita parametre iz adrese, sto je moguce tek u browseru.
 * Zato Next.js trazi da takva komponenta bude unutar <Suspense> granice -
 * bez toga "next build" ne moze unapred da pripremi stranicu i build puca.
 *
 * Fallback je ono sto se vidi dok se komponenta ne ucita.
 */
export default function CreateMedicalRecordPage() {
  return (
    <Suspense
      fallback={
        <main className="page-container">
          <p className="text-sm text-slate-500">Ucitavanje forme...</p>
        </main>
      }
    >
      <CreateMedicalRecordPageContent />
    </Suspense>
  );
}

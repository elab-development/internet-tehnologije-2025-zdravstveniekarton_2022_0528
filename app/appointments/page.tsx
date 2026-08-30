'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Role, AppointmentStatus } from '@prisma/client';
import AppointmentCard, { type Appointment } from '@/components/appointments/AppointmentCard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { formatDateTime } from '@/lib/format';

const STATUS_FILTER_OPTIONS = [
  { value: AppointmentStatus.REQUESTED, label: 'Cekaju potvrdu' },
  { value: AppointmentStatus.CONFIRMED, label: 'Potvrdjeni' },
  { value: AppointmentStatus.COMPLETED, label: 'Obavljeni' },
  { value: AppointmentStatus.CANCELLED, label: 'Otkazani' },
];

/**
 * Lista termina (/appointments) - prilagodjena ulozi prijavljenog korisnika.
 *
 * Server sam odlucuje koje termine vraca (pacijent svoje, doktor svoje,
 * osoblje sve), pa stranica ne mora nista da filtrira po vlasnistvu.
 *
 * Koriscene kuke: useSession, useState, useEffect.
 */
export default function AppointmentsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Termin koji ceka potvrdu otkazivanja u modalu; null znaci da je modal zatvoren.
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState('');

  async function loadAppointments(status: string) {
    setIsLoading(true);
    setError('');
    const query = status ? `?status=${status}` : '';
    const response = await fetch(`/api/appointments${query}`);
    if (!response.ok) {
      setError('Nije moguce ucitati termine.');
      setIsLoading(false);
      return;
    }
    const payload = await response.json();
    setAppointments(payload.data);
    setIsLoading(false);
  }

  // Efekat se ponovo pokrece kad se promeni filter statusa.
  useEffect(() => {
    loadAppointments(statusFilter);
  }, [statusFilter]);

  /** Menja status termina i osvezava listu. */
  async function changeStatus(id: string, status: AppointmentStatus) {
    setBusyId(id);
    const response = await fetch(`/api/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setBusyId('');

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? 'Izmena termina nije uspela.');
      return;
    }
    await loadAppointments(statusFilter);
  }

  async function confirmCancel() {
    if (!appointmentToCancel) return;
    const id = appointmentToCancel.id;
    setAppointmentToCancel(null);
    await changeStatus(id, AppointmentStatus.CANCELLED);
  }

  return (
    <main className="page-container max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-800">Termini</h1>

        {/* Zakazivanje je iskljucivo pravo pacijenta. */}
        {role === Role.PATIENT && (
          <Link
            href="/appointments/create"
            className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
          >
            Zakazi termin
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
          placeholder="Svi termini"
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Ucitavanje termina...</p>
      ) : appointments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
          Nema termina za prikaz.
        </p>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              viewerRole={role ?? Role.PATIENT}
              isBusy={busyId === appointment.id}
              onConfirm={(id) => changeStatus(id, AppointmentStatus.CONFIRMED)}
              onCancelRequest={setAppointmentToCancel}
            />
          ))}
        </div>
      )}

      {/* Otkazivanje je nepovratna akcija, pa se trazi izricita potvrda. */}
      <Modal
        isOpen={appointmentToCancel !== null}
        onClose={() => setAppointmentToCancel(null)}
        title="Otkazivanje termina"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAppointmentToCancel(null)}>
              Odustani
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              Otkazi termin
            </Button>
          </>
        }
      >
        {appointmentToCancel && (
          <p>
            Da li ste sigurni da zelite da otkazete termin{' '}
            <strong>{formatDateTime(appointmentToCancel.scheduledAt)}</strong> kod{' '}
            <strong>{appointmentToCancel.doctor.fullName}</strong>? Ova akcija se ne moze ponistiti.
          </p>
        )}
      </Modal>
    </main>
  );
}

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Role, AppointmentStatus, LabResultStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/session';
import Card from '@/components/ui/Card';
import StatTile from '@/components/dashboard/StatTile';
import MedicalRecordCard from '@/components/medical/MedicalRecordCard';
import AllergyBadge from '@/components/medical/AllergyBadge';
import { formatDateTime } from '@/lib/format';

/**
 * Pocetna stranica po prijavi (/dashboard), prilagodjena ulozi korisnika.
 *
 * Ovo je SERVERSKA komponenta - podaci se citaju direktno iz baze pri
 * renderovanju, bez ijednog fetch poziva iz browsera. Prednosti:
 *  - stranica stize korisniku vec popunjena, bez "treperenja" pri ucitavanju,
 *  - u browser se ne salje JavaScript za dohvatanje podataka,
 *  - upiti ka bazi se ne mogu menjati iz browsera.
 *
 * Zato ovde nema 'use client' ni React kuka - one ovde nisu ni potrebne.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();

  // Middleware vec stiti ovu putanju; ova provera je pojas i tregeri,
  // i ujedno daje TypeScriptu sigurnost da user nije null.
  if (!user) redirect('/login');

  return (
    <main className="page-container max-w-4xl">
      <h1 className="text-2xl font-bold text-primary-800">Dobrodosli, {user.name}</h1>
      <p className="mt-1 text-sm text-slate-500">{ROLE_LABELS[user.role]}</p>

      <div className="mt-8">
        {user.role === Role.PATIENT && <PatientDashboard userId={user.id} />}
        {user.role === Role.DOCTOR && <DoctorDashboard userId={user.id} />}
        {user.role === Role.NURSE && <NurseDashboard />}
        {user.role === Role.ADMIN && <AdminDashboard />}
      </div>
    </main>
  );
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator sistema',
  DOCTOR: 'Lekar',
  NURSE: 'Medicinska sestra',
  PATIENT: 'Pacijent',
};

/** Pacijent: sopstveni karton, termini i nalazi. */
async function PatientDashboard({ userId }: { userId: string }) {
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      allergies: {
        select: { id: true, allergen: true, severity: true, notes: true },
        orderBy: { severity: 'desc' },
      },
      medicalRecords: {
        select: {
          id: true,
          visitDate: true,
          symptoms: true,
          diagnosisCode: true,
          diagnosisName: true,
          therapyNotes: true,
          doctor: {
            select: {
              id: true,
              fullName: true,
              doctorProfile: { select: { specialization: true } },
            },
          },
          prescriptions: {
            select: {
              id: true,
              medicationName: true,
              dosage: true,
              frequency: true,
              durationDays: true,
              notes: true,
            },
          },
        },
        orderBy: { visitDate: 'desc' },
        take: 3, // na pocetnoj se prikazuju samo poslednja tri pregleda
      },
      _count: { select: { medicalRecords: true, labResults: true } },
    },
  });

  if (!profile) {
    return <p className="text-sm text-slate-500">Vas karton jos nije kreiran.</p>;
  }

  const upcomingCount = await prisma.appointment.count({
    where: {
      patientId: userId,
      status: { in: [AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED] },
    },
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Predstojeci termini"
          value={upcomingCount}
          href="/appointments"
          hint="Zahtevi i potvrdjeni termini"
        />
        <StatTile label="Pregleda u kartonu" value={profile._count.medicalRecords} />
        <StatTile
          label="Laboratorijskih nalaza"
          value={profile._count.labResults}
          href="/lab-results"
        />
      </div>

      {profile.allergies.length > 0 && (
        <div className="mt-6 rounded-lg border border-warning-100 bg-warning-50 px-4 py-3">
          <p className="mb-2 text-sm font-semibold text-warning-700">Vase evidentirane alergije</p>
          <div className="flex flex-wrap gap-2">
            {profile.allergies.map((allergy) => (
              <AllergyBadge key={allergy.id} allergy={allergy} />
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-800">Poslednji pregledi</h2>
      {profile.medicalRecords.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          U vasem kartonu jos nema pregleda.
        </p>
      ) : (
        <div className="space-y-4">
          {profile.medicalRecords.map((record) => (
            <MedicalRecordCard
              key={record.id}
              record={{ ...record, visitDate: record.visitDate.toISOString() }}
            />
          ))}
        </div>
      )}
    </>
  );
}

/** Lekar: sopstveni raspored i pregledi koje je uneo. */
async function DoctorDashboard({ userId }: { userId: string }) {
  const [pendingRequests, confirmedCount, recordsCount, pendingLabs, nextAppointments] =
    await Promise.all([
      prisma.appointment.count({
        where: { doctorId: userId, status: AppointmentStatus.REQUESTED },
      }),
      prisma.appointment.count({
        where: { doctorId: userId, status: AppointmentStatus.CONFIRMED },
      }),
      prisma.medicalRecord.count({ where: { doctorId: userId } }),
      prisma.labResult.count({
        where: { requestedByDoctorId: userId, status: LabResultStatus.PENDING },
      }),
      prisma.appointment.findMany({
        where: { doctorId: userId, status: AppointmentStatus.CONFIRMED },
        select: {
          id: true,
          scheduledAt: true,
          reasonForVisit: true,
          patient: { select: { fullName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      }),
    ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Zahteva za termin"
          value={pendingRequests}
          href="/appointments?status=REQUESTED"
          highlight={pendingRequests > 0}
          hint="Cekaju potvrdu"
        />
        <StatTile label="Potvrdjenih termina" value={confirmedCount} href="/appointments" />
        <StatTile label="Unetih pregleda" value={recordsCount} />
        <StatTile
          label="Nalaza bez rezultata"
          value={pendingLabs}
          href="/lab-results?status=PENDING"
          highlight={pendingLabs > 0}
        />
      </div>

      <Card title="Naredni potvrdjeni termini" className="mt-6">
        {nextAppointments.length === 0 ? (
          <p className="text-sm text-slate-500">Nemate potvrdjenih termina.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {nextAppointments.map((appointment) => (
              <li key={appointment.id} className="py-2">
                <p className="font-medium text-slate-800">
                  {formatDateTime(appointment.scheduledAt)} - {appointment.patient.fullName}
                </p>
                <p className="text-slate-600">{appointment.reasonForVisit}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap gap-3">
        <QuickLink href="/patients" label="Pacijenti" />
        <QuickLink href="/medical-records/create" label="Novi pregled" />
        <QuickLink href="/lab-results/create" label="Naruci analizu" />
        <QuickLink href="/stats" label="Statistika" />
      </div>
    </>
  );
}

/** Sestra: raspored ustanove i nalazi koji cekaju unos rezultata. */
async function NurseDashboard() {
  const [pendingRequests, todayCount, pendingLabs, patientsCount] = await Promise.all([
    prisma.appointment.count({ where: { status: AppointmentStatus.REQUESTED } }),
    prisma.appointment.count({
      where: {
        status: AppointmentStatus.CONFIRMED,
        // Termini od danasnje ponoci do sutrasnje.
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(24, 0, 0, 0)),
        },
      },
    }),
    prisma.labResult.count({ where: { status: LabResultStatus.PENDING } }),
    prisma.patientProfile.count(),
  ]);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Zahteva za termin"
          value={pendingRequests}
          href="/appointments?status=REQUESTED"
          highlight={pendingRequests > 0}
          hint="Cekaju vasu potvrdu"
        />
        <StatTile label="Termina danas" value={todayCount} href="/appointments" />
        <StatTile
          label="Nalaza za unos"
          value={pendingLabs}
          href="/lab-results?status=PENDING"
          highlight={pendingLabs > 0}
        />
        <StatTile label="Registrovanih pacijenata" value={patientsCount} href="/patients" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <QuickLink href="/appointments" label="Termini" />
        <QuickLink href="/lab-results" label="Laboratorijski nalazi" />
        <QuickLink href="/patients" label="Pacijenti" />
      </div>
    </>
  );
}

/** Administrator: pregled naloga i obima rada ustanove. */
async function AdminDashboard() {
  const [usersByRole, patientsCount, recordsCount, appointmentsCount] = await Promise.all([
    // groupBy vraca broj naloga po ulozi jednim upitom, umesto cetiri odvojena.
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.patientProfile.count(),
    prisma.medicalRecord.count(),
    prisma.appointment.count(),
  ]);

  const countFor = (role: Role) =>
    usersByRole.find((group) => group.role === role)?._count.role ?? 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Lekara" value={countFor(Role.DOCTOR)} href="/admin" />
        <StatTile label="Sestara" value={countFor(Role.NURSE)} href="/admin" />
        <StatTile label="Pacijenata" value={patientsCount} href="/patients" />
        <StatTile label="Administratora" value={countFor(Role.ADMIN)} href="/admin" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatTile label="Ukupno pregleda" value={recordsCount} href="/stats" />
        <StatTile label="Ukupno termina" value={appointmentsCount} href="/appointments" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <QuickLink href="/admin" label="Upravljanje nalozima" />
        <QuickLink href="/stats" label="Statistika" />
      </div>
    </>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
}

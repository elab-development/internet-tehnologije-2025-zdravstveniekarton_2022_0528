'use client';

import { useCallback, useEffect, useState } from 'react';
import { Role } from '@prisma/client';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/format';

type Profile = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  createdAt: string;
  patientProfile: {
    jmbg: string;
    dateOfBirth: string;
    bloodType: string | null;
    address: string | null;
    insuranceNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
  } | null;
  doctorProfile: {
    specialization: string;
    licenseNumber: string;
    officeRoom: string | null;
  } | null;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Lekar',
  NURSE: 'Medicinska sestra',
  PATIENT: 'Pacijent',
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'].map((value) => ({
  value,
  label: value,
}));

const emptyPasswordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };

/**
 * Stranica sopstvenog profila (/profile).
 *
 * Dostupna svim prijavljenim korisnicima, a sadrzaj se prilagodjava ulozi:
 * pacijent uredjuje i podatke svog kartona, lekar oznaku ordinacije, a sestra
 * i administrator samo kontakt podatke.
 *
 * Podaci koji odredjuju identitet i ovlascenja - email, uloga, JMBG, broj
 * licence i specijalizacija - prikazuju se, ali se ne mogu menjati.
 *
 * Koriscene kuke: useState, useEffect, useCallback.
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Podaci forme za izmenu; popunjavaju se kada profil stigne sa servera.
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    address: '',
    bloodType: '',
    insuranceNumber: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    officeRoom: '',
  });
  const [saveError, setSaveError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedMessage, setSavedMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordError, setPasswordError] = useState('');
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string>>({});
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const loadProfile = useCallback(async () => {
    const response = await fetch('/api/profile');
    if (!response.ok) {
      setLoadError('Podatke o nalogu nije moguce ucitati.');
      setIsLoading(false);
      return;
    }
    const data: Profile = (await response.json()).data;
    setProfile(data);
    setForm({
      fullName: data.fullName,
      phone: data.phone ?? '',
      address: data.patientProfile?.address ?? '',
      bloodType: data.patientProfile?.bloodType ?? '',
      insuranceNumber: data.patientProfile?.insuranceNumber ?? '',
      emergencyContactName: data.patientProfile?.emergencyContactName ?? '',
      emergencyContactPhone: data.patientProfile?.emergencyContactPhone ?? '',
      officeRoom: data.doctorProfile?.officeRoom ?? '',
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setSavedMessage('');
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError('');
    setFieldErrors({});
    setSavedMessage('');
    setIsSaving(true);

    // Prazna polja se salju kao izostavljena, da se u bazu ne upisuje prazan tekst.
    const payloadBody = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [key, value.trim() === '' ? undefined : value]),
    );

    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadBody),
    });
    const payload = await response.json();
    setIsSaving(false);

    if (!response.ok) {
      setSaveError(payload.error ?? 'Izmena podataka nije uspela.');
      setFieldErrors(payload.fields ?? {});
      return;
    }

    setSavedMessage('Podaci su sacuvani.');
    await loadProfile();
  }

  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    setPasswordFieldErrors({});
    setPasswordMessage('');
    setIsChangingPassword(true);

    const response = await fetch('/api/profile/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwordForm),
    });
    const payload = await response.json();
    setIsChangingPassword(false);

    if (!response.ok) {
      setPasswordError(payload.error ?? 'Promena lozinke nije uspela.');
      setPasswordFieldErrors(payload.fields ?? {});
      return;
    }

    setPasswordForm(emptyPasswordForm);
    setPasswordMessage('Lozinka je promenjena.');
  }

  if (isLoading) {
    return (
      <main className="page-container">
        <p className="text-sm text-slate-500">Ucitavanje profila...</p>
      </main>
    );
  }

  if (loadError || !profile) {
    return (
      <main className="page-container">
        <p role="alert" className="rounded-md bg-danger-50 px-4 py-3 text-sm text-danger-700">
          {loadError || 'Profil nije pronadjen.'}
        </p>
      </main>
    );
  }

  const isPatient = profile.role === Role.PATIENT;
  const isDoctor = profile.role === Role.DOCTOR;

  return (
    <main className="page-container max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold text-primary-800">Moj profil</h1>
      <p className="mb-6 text-sm text-slate-500">{ROLE_LABELS[profile.role]}</p>

      <Card
        title="Podaci naloga"
        subtitle="Ove podatke menja administrator ustanove."
        className="mb-6"
      >
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Field label="Email adresa" value={profile.email} />
          <Field label="Uloga" value={ROLE_LABELS[profile.role]} />
          <Field label="Nalog otvoren" value={formatDate(profile.createdAt)} />

          {profile.patientProfile && (
            <>
              <Field label="JMBG" value={profile.patientProfile.jmbg} />
              <Field
                label="Datum rodjenja"
                value={formatDate(profile.patientProfile.dateOfBirth)}
              />
            </>
          )}

          {profile.doctorProfile && (
            <>
              <Field label="Specijalizacija" value={profile.doctorProfile.specialization} />
              <Field label="Broj licence" value={profile.doctorProfile.licenseNumber} />
            </>
          )}
        </dl>
      </Card>

      <Card
        title="Izmena podataka"
        subtitle="Kontakt podaci koje mozete sami azurirati."
        className="mb-6"
      >
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Ime i prezime"
            name="fullName"
            value={form.fullName}
            onChange={handleChange}
            error={fieldErrors.fullName}
            required
          />
          <Input
            label="Telefon"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            error={fieldErrors.phone}
          />

          {isPatient && (
            <>
              <Select
                label="Krvna grupa"
                name="bloodType"
                value={form.bloodType}
                onChange={handleChange}
                options={BLOOD_TYPES}
                placeholder="-- nije uneto --"
                error={fieldErrors.bloodType}
              />
              <Input
                label="Broj osiguranja"
                name="insuranceNumber"
                value={form.insuranceNumber}
                onChange={handleChange}
                error={fieldErrors.insuranceNumber}
              />
              <Input
                label="Adresa"
                name="address"
                value={form.address}
                onChange={handleChange}
                error={fieldErrors.address}
                className="sm:col-span-2"
              />
              <Input
                label="Kontakt za hitne slucajeve"
                name="emergencyContactName"
                value={form.emergencyContactName}
                onChange={handleChange}
                error={fieldErrors.emergencyContactName}
                hint="Ime osobe koju treba pozvati"
              />
              <Input
                label="Telefon kontakta"
                name="emergencyContactPhone"
                value={form.emergencyContactPhone}
                onChange={handleChange}
                error={fieldErrors.emergencyContactPhone}
              />
            </>
          )}

          {isDoctor && (
            <Input
              label="Ordinacija"
              name="officeRoom"
              value={form.officeRoom}
              onChange={handleChange}
              error={fieldErrors.officeRoom}
              hint="Broj ili oznaka prostorije"
            />
          )}

          {saveError && (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 sm:col-span-2"
            >
              {saveError}
            </p>
          )}
          {savedMessage && (
            <p className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-700 sm:col-span-2">
              {savedMessage}
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" isLoading={isSaving}>
              Sacuvaj izmene
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Promena lozinke" subtitle="Radi provere identiteta trazi se i trenutna lozinka.">
        <form onSubmit={handlePasswordChange} className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Trenutna lozinka"
            name="currentPassword"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((p) => ({ ...p, currentPassword: event.target.value }))
            }
            error={passwordFieldErrors.currentPassword}
            className="sm:col-span-2"
            required
          />
          <Input
            label="Nova lozinka"
            name="newPassword"
            type="password"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((p) => ({ ...p, newPassword: event.target.value }))
            }
            error={passwordFieldErrors.newPassword}
            hint="najmanje 8 karaktera"
            required
          />
          <Input
            label="Potvrda nove lozinke"
            name="confirmPassword"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm((p) => ({ ...p, confirmPassword: event.target.value }))
            }
            error={passwordFieldErrors.confirmPassword}
            required
          />

          {passwordError && (
            <p
              role="alert"
              className="rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700 sm:col-span-2"
            >
              {passwordError}
            </p>
          )}
          {passwordMessage && (
            <p className="rounded-md bg-success-50 px-3 py-2 text-sm text-success-700 sm:col-span-2">
              {passwordMessage}
            </p>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" isLoading={isChangingPassword}>
              Promeni lozinku
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}

// Prikaz „naziv - vrednost“ za podatke koji se samo citaju.
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || '-'}</dd>
    </div>
  );
}

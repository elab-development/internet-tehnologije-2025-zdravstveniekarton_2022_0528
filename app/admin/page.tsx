'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Role } from '@prisma/client';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { formatDate } from '@/lib/format';

type ManagedUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  doctorProfile: {
    specialization: string;
    licenseNumber: string;
    officeRoom: string | null;
  } | null;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrator',
  DOCTOR: 'Lekar',
  NURSE: 'Sestra',
  PATIENT: 'Pacijent',
};

const ROLE_FILTER_OPTIONS = [
  { value: Role.DOCTOR, label: 'Lekari' },
  { value: Role.NURSE, label: 'Sestre' },
  { value: Role.PATIENT, label: 'Pacijenti' },
  { value: Role.ADMIN, label: 'Administratori' },
];

/**
 * Administratorski panel (/admin) - upravljanje nalozima.
 *
 * Koriscene kuke: useSession, useState, useEffect, useCallback.
 */
export default function AdminPage() {
  const { data: session } = useSession();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Nalog za koji se ceka potvrda promene statusa; null znaci zatvoren modal.
  const [userToToggle, setUserToToggle] = useState<ManagedUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    const query = roleFilter ? `?role=${roleFilter}` : '';
    const response = await fetch(`/api/users${query}`);
    if (!response.ok) {
      setError('Spisak naloga nije moguce ucitati.');
      setIsLoading(false);
      return;
    }
    setUsers((await response.json()).data);
    setIsLoading(false);
  }, [roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function toggleStatus() {
    if (!userToToggle) return;
    setIsSaving(true);

    const response = await fetch(`/api/users/${userToToggle.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !userToToggle.isActive }),
    });
    const payload = await response.json();
    setIsSaving(false);
    setUserToToggle(null);

    if (!response.ok) {
      setError(payload.error ?? 'Promena statusa naloga nije uspela.');
      return;
    }
    await loadUsers();
  }

  return (
    <main className="page-container max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-primary-800">Upravljanje nalozima</h1>
        <Link
          href="/admin/create-staff"
          className="rounded-md bg-primary-700 px-4 py-2 text-sm font-medium text-white hover:bg-primary-800"
        >
          Novi nalog osoblja
        </Link>
      </div>

      <div className="mb-6 max-w-xs">
        <Select
          label="Prikazi"
          name="roleFilter"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          options={ROLE_FILTER_OPTIONS}
          placeholder="Sve naloge"
        />
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-danger-50 px-3 py-2 text-sm text-danger-700">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Ucitavanje...</p>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Korisnik</th>
                  <th className="pb-2 pr-4 font-medium">Uloga</th>
                  <th className="pb-2 pr-4 font-medium">Detalji</th>
                  <th className="pb-2 pr-4 font-medium">Kreiran</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Akcija</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className={user.isActive ? '' : 'bg-slate-50'}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-800">{user.fullName}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{ROLE_LABELS[user.role]}</td>
                    <td className="py-3 pr-4 text-xs text-slate-500">
                      {user.doctorProfile
                        ? `${user.doctorProfile.specialization}, licenca ${user.doctorProfile.licenseNumber}`
                        : (user.phone ?? '-')}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{formatDate(user.createdAt)}</td>
                    <td className="py-3 pr-4">
                      {user.isActive ? (
                        <span className="rounded-full bg-success-100 px-2.5 py-1 text-xs font-medium text-success-700">
                          Aktivan
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Deaktiviran
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {/* Administrator ne moze da deaktivira sam sebe. */}
                      {user.id !== session?.user?.id && (
                        <Button
                          size="sm"
                          variant={user.isActive ? 'danger' : 'primary'}
                          onClick={() => setUserToToggle(user)}
                        >
                          {user.isActive ? 'Deaktiviraj' : 'Aktiviraj'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={userToToggle !== null}
        onClose={() => setUserToToggle(null)}
        title={userToToggle?.isActive ? 'Deaktivacija naloga' : 'Aktivacija naloga'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setUserToToggle(null)}>
              Odustani
            </Button>
            <Button
              variant={userToToggle?.isActive ? 'danger' : 'primary'}
              onClick={toggleStatus}
              isLoading={isSaving}
            >
              Potvrdi
            </Button>
          </>
        }
      >
        {userToToggle && (
          <p>
            {userToToggle.isActive ? (
              <>
                Nalog <strong>{userToToggle.fullName}</strong> vise nece moci da se prijavi na
                sistem. Svi podaci koje je uneo ostaju sacuvani.
              </>
            ) : (
              <>
                Nalog <strong>{userToToggle.fullName}</strong> ce ponovo moci da se prijavi na
                sistem.
              </>
            )}
          </p>
        )}
      </Modal>
    </main>
  );
}

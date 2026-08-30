'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

// Kratak pregled sta koja uloga radi u sistemu.
const ROLES = [
  {
    name: 'Pacijent',
    description: 'Vidi sopstveni karton, recepte i nalaze. Salje zahtev za termin.',
  },
  {
    name: 'Sestra',
    description: 'Potvrdjuje i otkazuje termine, unosi laboratorijske nalaze i alergije.',
  },
  {
    name: 'Doktor',
    description: 'Pregleda kartone, postavlja dijagnoze, propisuje recepte i narucuje nalaze.',
  },
  {
    name: 'Administrator',
    description: 'Kreira naloge osoblja, deaktivira naloge i prati statistiku ustanove.',
  },
];

/**
 * Dugme na pocetnoj stranici koje otvara modal sa objasnjenjem uloga.
 *
 * Koriscena kuka:
 *  - useState -> pamti da li je modal otvoren
 */
export default function RolesInfoModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        Ko sve koristi aplikaciju?
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Uloge u sistemu"
        footer={
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Zatvori
          </Button>
        }
      >
        <ul className="space-y-3">
          {ROLES.map((role) => (
            <li key={role.name}>
              <p className="font-medium text-slate-800">{role.name}</p>
              <p className="text-slate-600">{role.description}</p>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

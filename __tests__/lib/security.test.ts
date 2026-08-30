import { Role, AppointmentStatus } from '@prisma/client';
import { sanitizeText } from '@/lib/security/sanitize';
import {
  canReadAppointment,
  canUpdateAppointment,
  canUpdateMedicalRecord,
  canFillLabResult,
  canManageAllergies,
} from '@/lib/security/idor';
import { getRequiredRoles } from '@/lib/permissions';
import type { SessionUser } from '@/lib/session';

/**
 * Bezbednosni testovi - najvazniji testovi u ovom projektu.
 *
 * Provera se radi nad ciste funkcije, bez baze i bez mreze, pa su testovi
 * brzi i uvek daju isti rezultat. Autorizaciona pravila su namerno izdvojena
 * u zasebne funkcije upravo zato da bi mogla ovako da se testiraju.
 */

const patientMarko: SessionUser = { id: 'user-marko', role: Role.PATIENT };
const patientAna: SessionUser = { id: 'user-ana', role: Role.PATIENT };
const doctorJovanovic: SessionUser = { id: 'user-jovanovic', role: Role.DOCTOR };
const doctorPetrovic: SessionUser = { id: 'user-petrovic', role: Role.DOCTOR };
const nurse: SessionUser = { id: 'user-sestra', role: Role.NURSE };
const admin: SessionUser = { id: 'user-admin', role: Role.ADMIN };

const markoAppointment = {
  patientId: 'user-marko',
  doctorId: 'user-jovanovic',
  status: AppointmentStatus.REQUESTED,
};

describe('sanitizeText (XSS zastita)', () => {
  it('uklanja script oznaku zajedno sa njenim sadrzajem', () => {
    expect(sanitizeText('<script>alert(1)</script>Kasalj')).toBe('Kasalj');
  });

  it('uklanja oznake ali cuva tekst oko njih', () => {
    expect(sanitizeText('Bol u <b>grudima</b> pri naporu')).toBe('Bol u grudima pri naporu');
  });

  it('uklanja opasne atribute poput onerror', () => {
    const clean = sanitizeText('<img src=x onerror=alert(1)>Temperatura 38');
    expect(clean).toBe('Temperatura 38');
    expect(clean).not.toContain('onerror');
  });

  it('uklanja sadrzaj style oznake', () => {
    expect(sanitizeText('<style>body{}</style>Test')).toBe('Test');
  });

  it('cuva matematicke znake veci i manji', () => {
    expect(sanitizeText('Temperatura > 38 i puls < 90')).toBe('Temperatura > 38 i puls < 90');
  });

  it('vraca HTML entitete u obicne karaktere', () => {
    expect(sanitizeText('Vrednost &gt; 10.5')).toBe('Vrednost > 10.5');
  });

  it('neutralise dvostruko kodiran napad', () => {
    const clean = sanitizeText('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(clean).not.toContain('<script>');
  });

  it('uklanja suvisne razmake sa krajeva', () => {
    expect(sanitizeText('  Obican tekst  ')).toBe('Obican tekst');
  });

  it('ne menja tekst bez HTML-a', () => {
    const text = 'Mirovanje, pojacan unos tecnosti, kontrola za sedam dana.';
    expect(sanitizeText(text)).toBe(text);
  });
});

describe('canReadAppointment (IDOR zastita)', () => {
  it('pacijent moze da procita svoj termin', () => {
    expect(canReadAppointment(patientMarko, markoAppointment)).toBe(true);
  });

  it('pacijent NE moze da procita tudji termin', () => {
    expect(canReadAppointment(patientAna, markoAppointment)).toBe(false);
  });

  it('doktor moze da procita termin zakazan kod njega', () => {
    expect(canReadAppointment(doctorJovanovic, markoAppointment)).toBe(true);
  });

  it('doktor NE moze da procita termin zakazan kod drugog lekara', () => {
    expect(canReadAppointment(doctorPetrovic, markoAppointment)).toBe(false);
  });

  it('sestra moze da procita svaki termin', () => {
    expect(canReadAppointment(nurse, markoAppointment)).toBe(true);
  });

  it('administrator moze da procita svaki termin', () => {
    expect(canReadAppointment(admin, markoAppointment)).toBe(true);
  });
});

describe('canUpdateAppointment (IDOR zastita)', () => {
  it('pacijent sme da otkaze sopstveni termin', () => {
    expect(canUpdateAppointment(patientMarko, markoAppointment, AppointmentStatus.CANCELLED)).toBe(
      true,
    );
  });

  it('pacijent NE sme sam da potvrdi svoj termin', () => {
    expect(canUpdateAppointment(patientMarko, markoAppointment, AppointmentStatus.CONFIRMED)).toBe(
      false,
    );
  });

  it('pacijent NE sme da otkaze tudji termin', () => {
    expect(canUpdateAppointment(patientAna, markoAppointment, AppointmentStatus.CANCELLED)).toBe(
      false,
    );
  });

  it('sestra sme da potvrdi termin', () => {
    expect(canUpdateAppointment(nurse, markoAppointment, AppointmentStatus.CONFIRMED)).toBe(true);
  });

  it('doktor sme da menja samo svoj termin', () => {
    expect(canUpdateAppointment(doctorJovanovic, markoAppointment)).toBe(true);
    expect(canUpdateAppointment(doctorPetrovic, markoAppointment)).toBe(false);
  });

  it('vec obavljen termin niko ne sme da menja', () => {
    const completed = { ...markoAppointment, status: AppointmentStatus.COMPLETED };
    expect(canUpdateAppointment(admin, completed)).toBe(false);
    expect(canUpdateAppointment(nurse, completed)).toBe(false);
    expect(canUpdateAppointment(doctorJovanovic, completed)).toBe(false);
  });

  it('vec otkazan termin niko ne sme da menja', () => {
    const cancelled = { ...markoAppointment, status: AppointmentStatus.CANCELLED };
    expect(canUpdateAppointment(nurse, cancelled, AppointmentStatus.CONFIRMED)).toBe(false);
  });
});

describe('canUpdateMedicalRecord (IDOR zastita)', () => {
  it('lekar sme da menja pregled koji je sam napisao', () => {
    expect(canUpdateMedicalRecord(doctorJovanovic, 'user-jovanovic')).toBe(true);
  });

  it('lekar NE sme da menja tudji pregled', () => {
    expect(canUpdateMedicalRecord(doctorPetrovic, 'user-jovanovic')).toBe(false);
  });

  it('sestra NE sme da menja dijagnozu ni terapiju', () => {
    expect(canUpdateMedicalRecord(nurse, 'user-jovanovic')).toBe(false);
  });

  it('administrator NE sme da menja dijagnozu ni terapiju', () => {
    expect(canUpdateMedicalRecord(admin, 'user-jovanovic')).toBe(false);
  });

  it('pacijent NE sme da menja svoj pregled', () => {
    expect(canUpdateMedicalRecord(patientMarko, 'user-jovanovic')).toBe(false);
  });
});

describe('canFillLabResult', () => {
  it('sestra sme da unese rezultat svakog nalaza', () => {
    expect(canFillLabResult(nurse, 'user-jovanovic')).toBe(true);
  });

  it('lekar sme da unese rezultat nalaza koji je sam narucio', () => {
    expect(canFillLabResult(doctorJovanovic, 'user-jovanovic')).toBe(true);
  });

  it('lekar NE sme da unese rezultat tudje narudzbine', () => {
    expect(canFillLabResult(doctorPetrovic, 'user-jovanovic')).toBe(false);
  });

  it('administrator NE sme da unosi medicinske rezultate', () => {
    expect(canFillLabResult(admin, 'user-jovanovic')).toBe(false);
  });

  it('pacijent NE sme da unosi rezultate', () => {
    expect(canFillLabResult(patientMarko, 'user-jovanovic')).toBe(false);
  });
});

describe('canManageAllergies', () => {
  it('lekar i sestra smeju da vode evidenciju alergija', () => {
    expect(canManageAllergies(doctorJovanovic)).toBe(true);
    expect(canManageAllergies(nurse)).toBe(true);
  });

  it('pacijent NE sme sam da menja svoje alergije', () => {
    expect(canManageAllergies(patientMarko)).toBe(false);
  });

  it('administrator NE sme da menja alergije', () => {
    expect(canManageAllergies(admin)).toBe(false);
  });
});

describe('getRequiredRoles (RBAC pravila ruta)', () => {
  it('administratorski panel trazi ulogu administratora', () => {
    expect(getRequiredRoles('/admin')).toEqual([Role.ADMIN]);
  });

  it('pravilo vazi i za ugnjezdene putanje', () => {
    expect(getRequiredRoles('/admin/create-staff')).toEqual([Role.ADMIN]);
  });

  it('unos pregleda je dozvoljen samo lekaru', () => {
    expect(getRequiredRoles('/medical-records/create')).toEqual([Role.DOCTOR]);
  });

  it('zakazivanje termina je dozvoljeno samo pacijentu', () => {
    expect(getRequiredRoles('/appointments/create')).toEqual([Role.PATIENT]);
  });

  it('spisak pacijenata nije dostupan pacijentu', () => {
    const roles = getRequiredRoles('/patients');
    expect(roles).not.toBeNull();
    expect(roles).not.toContain(Role.PATIENT);
  });

  it('putanja bez posebnog pravila vraca null', () => {
    expect(getRequiredRoles('/dashboard')).toBeNull();
  });

  it('slicna putanja ne pokupi tudje pravilo', () => {
    // "/administracija" ne sme da nasledi pravilo za "/admin".
    expect(getRequiredRoles('/administracija')).toBeNull();
  });
});

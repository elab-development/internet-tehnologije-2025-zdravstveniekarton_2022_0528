import {
  registerSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  createMedicalRecordSchema,
  createPrescriptionSchema,
  createLabResultSchema,
  updateLabResultSchema,
  createAllergySchema,
  createStaffSchema,
} from '@/lib/validation/schemas';
import { AppointmentStatus, AllergySeverity, Role } from '@prisma/client';

/**
 * Testovi Zod sema - prve linije odbrane od neispravnih podataka.
 *
 * Vazno je testirati i NEISPRAVNE unose, ne samo ispravne: sema koja sve
 * propusta prolazi "srecan slucaj", a ne stiti bazu ni od cega.
 */

const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

describe('registerSchema', () => {
  const validInput = {
    email: 'pacijent@primer.rs',
    password: 'lozinka123',
    fullName: 'Petar Petrovic',
    jmbg: '0101990710015',
    dateOfBirth: '1990-01-01',
  };

  it('prihvata ispravne podatke', () => {
    expect(registerSchema.safeParse(validInput).success).toBe(true);
  });

  it('odbija neispravnu email adresu', () => {
    const result = registerSchema.safeParse({ ...validInput, email: 'nijemail' });
    expect(result.success).toBe(false);
  });

  it('odbija lozinku kracu od 8 karaktera', () => {
    const result = registerSchema.safeParse({ ...validInput, password: 'kratka' });
    expect(result.success).toBe(false);
  });

  it('odbija JMBG koji nema 13 cifara', () => {
    expect(registerSchema.safeParse({ ...validInput, jmbg: '12345' }).success).toBe(false);
  });

  it('odbija JMBG sa slovima', () => {
    expect(registerSchema.safeParse({ ...validInput, jmbg: '01019907100AB' }).success).toBe(false);
  });

  it('odbija datum rodjenja u buducnosti', () => {
    const result = registerSchema.safeParse({ ...validInput, dateOfBirth: futureDate });
    expect(result.success).toBe(false);
  });

  it('cisti HTML iz imena (XSS zastita)', () => {
    const result = registerSchema.safeParse({
      ...validInput,
      fullName: '<b>Petar</b> Petrovic',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fullName).toBe('Petar Petrovic');
    }
  });

  it('odbija ime koje posle ciscenja HTML-a ostane prekratko', () => {
    // Ovo je razlog zasto se sanitizacija radi PRE provere duzine.
    const result = registerSchema.safeParse({
      ...validInput,
      fullName: '<script>alert(1)</script>',
    });
    expect(result.success).toBe(false);
  });

  it('prihvata unos bez opcionih polja', () => {
    const result = registerSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });
});

describe('createAppointmentSchema', () => {
  const validInput = {
    doctorId: 'doktor-1',
    scheduledAt: futureDate,
    reasonForVisit: 'Kontrolni pregled posle terapije',
  };

  it('prihvata ispravan zahtev za termin', () => {
    expect(createAppointmentSchema.safeParse(validInput).success).toBe(true);
  });

  it('odbija termin u proslosti', () => {
    const result = createAppointmentSchema.safeParse({ ...validInput, scheduledAt: pastDate });
    expect(result.success).toBe(false);
  });

  it('odbija razlog dolaska kraci od 5 karaktera', () => {
    const result = createAppointmentSchema.safeParse({ ...validInput, reasonForVisit: 'ok' });
    expect(result.success).toBe(false);
  });

  it('odbija zahtev bez izabranog doktora', () => {
    const result = createAppointmentSchema.safeParse({ ...validInput, doctorId: '' });
    expect(result.success).toBe(false);
  });

  it('ne prihvata status iz tela zahteva', () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      status: AppointmentStatus.CONFIRMED,
    });
    // Zod izbacuje nepoznata polja, pa status ne stize do baze.
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('status');
    }
  });
});

describe('updateAppointmentSchema', () => {
  it('prihvata promenu statusa', () => {
    const result = updateAppointmentSchema.safeParse({ status: AppointmentStatus.CONFIRMED });
    expect(result.success).toBe(true);
  });

  it('odbija prazan zahtev bez ijedne izmene', () => {
    expect(updateAppointmentSchema.safeParse({}).success).toBe(false);
  });

  it('odbija nepoznat status', () => {
    expect(updateAppointmentSchema.safeParse({ status: 'IZMISLJENO' }).success).toBe(false);
  });

  it('odbija pomeranje termina u proslost', () => {
    expect(updateAppointmentSchema.safeParse({ scheduledAt: pastDate }).success).toBe(false);
  });
});

describe('createMedicalRecordSchema', () => {
  const validInput = {
    patientProfileId: 'karton-1',
    symptoms: 'Temperatura do 38.5 i suv kasalj',
    diagnosisName: 'Akutna infekcija gornjih disajnih puteva',
  };

  it('prihvata pregled bez termina (hitan slucaj)', () => {
    expect(createMedicalRecordSchema.safeParse(validInput).success).toBe(true);
  });

  it('odbija prekratak opis simptoma', () => {
    expect(createMedicalRecordSchema.safeParse({ ...validInput, symptoms: 'ok' }).success).toBe(
      false,
    );
  });

  it('odbija prekratak naziv dijagnoze', () => {
    expect(createMedicalRecordSchema.safeParse({ ...validInput, diagnosisName: 'a' }).success).toBe(
      false,
    );
  });

  it('odbija datum pregleda u buducnosti', () => {
    const result = createMedicalRecordSchema.safeParse({ ...validInput, visitDate: futureDate });
    expect(result.success).toBe(false);
  });

  it('prihvata ICD-10 sifru dijagnoze', () => {
    const result = createMedicalRecordSchema.safeParse({ ...validInput, diagnosisCode: 'J06.9' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.diagnosisCode).toBe('J06.9');
  });

  it('cisti HTML iz simptoma ali cuva okolni tekst', () => {
    const result = createMedicalRecordSchema.safeParse({
      ...validInput,
      symptoms: 'Bol u <b>grudima</b> pri naporu',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.symptoms).toBe('Bol u grudima pri naporu');
  });

  it('ne prihvata doctorId iz tela zahteva', () => {
    const result = createMedicalRecordSchema.safeParse({ ...validInput, doctorId: 'tudji-doktor' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('doctorId');
  });
});

describe('createPrescriptionSchema', () => {
  const validInput = {
    medicalRecordId: 'pregled-1',
    medicationName: 'Paracetamol',
    dosage: '500 mg',
    frequency: 'tri puta dnevno',
    durationDays: 5,
  };

  it('prihvata ispravan recept', () => {
    expect(createPrescriptionSchema.safeParse(validInput).success).toBe(true);
  });

  it('odbija negativno trajanje terapije', () => {
    expect(createPrescriptionSchema.safeParse({ ...validInput, durationDays: -5 }).success).toBe(
      false,
    );
  });

  it('odbija trajanje nula dana', () => {
    expect(createPrescriptionSchema.safeParse({ ...validInput, durationDays: 0 }).success).toBe(
      false,
    );
  });

  it('odbija decimalno trajanje terapije', () => {
    expect(createPrescriptionSchema.safeParse({ ...validInput, durationDays: 2.5 }).success).toBe(
      false,
    );
  });

  it('odbija trajanje duze od godinu dana', () => {
    expect(createPrescriptionSchema.safeParse({ ...validInput, durationDays: 400 }).success).toBe(
      false,
    );
  });

  it('odbija trajanje poslato kao tekst', () => {
    expect(createPrescriptionSchema.safeParse({ ...validInput, durationDays: '5' }).success).toBe(
      false,
    );
  });

  it('odbija praznu dozu', () => {
    expect(createPrescriptionSchema.safeParse({ ...validInput, dosage: '' }).success).toBe(false);
  });
});

describe('createLabResultSchema', () => {
  const validInput = { patientProfileId: 'karton-1', testType: 'Kompletna krvna slika' };

  it('prihvata narudzbinu analize', () => {
    expect(createLabResultSchema.safeParse(validInput).success).toBe(true);
  });

  it('odbija prekratak naziv analize', () => {
    expect(createLabResultSchema.safeParse({ ...validInput, testType: 'ab' }).success).toBe(false);
  });

  it('ne prihvata rezultat pri narucivanju', () => {
    const result = createLabResultSchema.safeParse({ ...validInput, resultValue: '11.2' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('resultValue');
  });
});

describe('updateLabResultSchema', () => {
  it('prihvata unos rezultata', () => {
    const result = updateLabResultSchema.safeParse({
      resultValue: '11.2',
      resultUnit: '10^9/L',
      referenceRange: '4.0 - 10.0',
    });
    expect(result.success).toBe(true);
  });

  it('odbija prazan rezultat', () => {
    expect(updateLabResultSchema.safeParse({ resultValue: '' }).success).toBe(false);
  });

  it('ne prihvata status iz tela zahteva', () => {
    const result = updateLabResultSchema.safeParse({ resultValue: '5', status: 'COMPLETED' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('status');
  });
});

describe('createAllergySchema', () => {
  const validInput = {
    patientProfileId: 'karton-1',
    allergen: 'Penicilin',
    severity: AllergySeverity.SEVERE,
  };

  it('prihvata ispravnu alergiju', () => {
    expect(createAllergySchema.safeParse(validInput).success).toBe(true);
  });

  it('odbija nepoznatu tezinu reakcije', () => {
    expect(createAllergySchema.safeParse({ ...validInput, severity: 'JAKO_TESKA' }).success).toBe(
      false,
    );
  });

  it('odbija prekratak naziv alergena', () => {
    expect(createAllergySchema.safeParse({ ...validInput, allergen: 'a' }).success).toBe(false);
  });
});

describe('createStaffSchema', () => {
  const validNurse = {
    email: 'sestra2@ekarton.rs',
    password: 'lozinka123',
    fullName: 'Jovana Jovanovic',
    role: Role.NURSE,
  };

  const validDoctor = {
    ...validNurse,
    email: 'doktor2@ekarton.rs',
    role: Role.DOCTOR,
    specialization: 'Neurologija',
    licenseNumber: 'LEK-2001',
  };

  it('prihvata nalog sestre bez podataka o licenci', () => {
    expect(createStaffSchema.safeParse(validNurse).success).toBe(true);
  });

  it('prihvata nalog lekara sa specijalizacijom i licencom', () => {
    expect(createStaffSchema.safeParse(validDoctor).success).toBe(true);
  });

  it('odbija lekara bez broja licence', () => {
    const { licenseNumber: _licenseNumber, ...withoutLicense } = validDoctor;
    expect(createStaffSchema.safeParse(withoutLicense).success).toBe(false);
  });

  it('odbija lekara bez specijalizacije', () => {
    const { specialization: _specialization, ...withoutSpecialization } = validDoctor;
    expect(createStaffSchema.safeParse(withoutSpecialization).success).toBe(false);
  });

  it('ne dozvoljava kreiranje administratora', () => {
    expect(createStaffSchema.safeParse({ ...validNurse, role: Role.ADMIN }).success).toBe(false);
  });

  it('ne dozvoljava kreiranje pacijenta (pacijenti se registruju sami)', () => {
    expect(createStaffSchema.safeParse({ ...validNurse, role: Role.PATIENT }).success).toBe(false);
  });
});

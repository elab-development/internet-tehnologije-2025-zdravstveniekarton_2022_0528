import { z } from 'zod';
import { AppointmentStatus, AllergySeverity, Role } from '@prisma/client';
import { sanitizeText } from '@/lib/security/sanitize';

/**
 * Zod seme za validaciju podataka koji stizu sa klijenta.
 *
 * Validacija se radi na serveru, a ne samo u formi, jer korisnik moze da posalje
 * zahtev i zaobilazeci formu (npr. preko Postmana). Sve poruke su na srpskom da bi
 * mogle direktno da se prikazu korisniku.
 */

/**
 * Tekstualno polje koje se PRE provere duzine ocisti od HTML-a (XSS zastita).
 *
 * Redosled je bitan: prvo transform (ciscenje), pa tek onda pipe (provera).
 * Da je obrnuto, unos "<script>x</script>" bi prosao proveru minimalne duzine,
 * a u bazu bi posle ciscenja stigao prazan tekst.
 *
 * Zato se sanitizacija pise ovde, u semama, a ne u svakoj ruti posebno -
 * automatski vazi za svaki unos koji prolazi kroz validaciju.
 */
function sanitizedText(min: number, max: number, minMessage: string, maxMessage: string) {
  return z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().min(min, minMessage).max(max, maxMessage));
}

/** Isto, ali za polja koja smeju biti prazna. */
function optionalSanitizedText(max: number, maxMessage: string) {
  return z.string().transform(sanitizeText).pipe(z.string().max(max, maxMessage)).optional();
}

// JMBG ima tacno 13 cifara.
const jmbgSchema = z.string().regex(/^\d{13}$/, 'JMBG mora imati tacno 13 cifara');

// Zajednicka pravila za lozinku, da se ne ponavljaju na vise mesta.
const passwordSchema = z
  .string()
  .min(8, 'Lozinka mora imati najmanje 8 karaktera')
  .max(72, 'Lozinka moze imati najvise 72 karaktera'); // bcrypt ignorise sve preko 72 bajta

export const registerSchema = z.object({
  email: z.string().email('Neispravna email adresa'),
  password: passwordSchema,
  fullName: sanitizedText(
    3,
    100,
    'Ime i prezime moraju imati najmanje 3 karaktera',
    'Ime i prezime su predugacki',
  ),
  phone: optionalSanitizedText(30, 'Broj telefona je predugacak'),
  jmbg: jmbgSchema,
  dateOfBirth: z.coerce
    .date({ errorMap: () => ({ message: 'Neispravan datum rodjenja' }) })
    .max(new Date(), 'Datum rodjenja ne moze biti u buducnosti'),
  address: optionalSanitizedText(200, 'Adresa je predugacka'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Neispravna email adresa'),
  password: z.string().min(1, 'Unesite lozinku'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Zakazivanje termina. Pacijent bira doktora, datum i razlog dolaska.
 * Status se NE prima od klijenta - svaki novi termin krece kao REQUESTED.
 */
export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1, 'Izaberite doktora'),
  scheduledAt: z.coerce
    .date({ errorMap: () => ({ message: 'Neispravan datum i vreme' }) })
    .min(new Date(), 'Termin ne moze biti u proslosti'),
  reasonForVisit: sanitizedText(
    5,
    500,
    'Razlog dolaska mora imati najmanje 5 karaktera',
    'Razlog dolaska moze imati najvise 500 karaktera',
  ),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/**
 * Izmena termina. Oba polja su opciona, ali bar jedno mora biti poslato -
 * inace bi zahtev bio prazan i ne bi imao sta da promeni.
 */
export const updateAppointmentSchema = z
  .object({
    status: z.nativeEnum(AppointmentStatus).optional(),
    scheduledAt: z.coerce
      .date({ errorMap: () => ({ message: 'Neispravan datum i vreme' }) })
      .min(new Date(), 'Termin ne moze biti pomeren u proslost')
      .optional(),
  })
  .refine((data) => data.status !== undefined || data.scheduledAt !== undefined, {
    message: 'Navedite status ili novi datum termina',
  });

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

/**
 * Kreiranje pregleda (unos u karton).
 *
 * doctorId se NE prima od klijenta - uzima se iz sesije prijavljenog lekara,
 * da niko ne bi mogao da upise pregled u tudje ime.
 * Polje diagnosisCode je ICD-10 sifra izabrana preko eksternog NIH servisa.
 */
export const createMedicalRecordSchema = z.object({
  patientProfileId: z.string().min(1, 'Izaberite pacijenta'),
  appointmentId: z.string().optional(),
  visitDate: z.coerce
    .date({ errorMap: () => ({ message: 'Neispravan datum pregleda' }) })
    .max(new Date(), 'Datum pregleda ne moze biti u buducnosti')
    .optional(),
  symptoms: sanitizedText(
    5,
    2000,
    'Opis simptoma mora imati najmanje 5 karaktera',
    'Opis simptoma je predugacak',
  ),
  // Sifra je opciona: lekar sme da upise dijagnozu i bez nje.
  diagnosisCode: optionalSanitizedText(20, 'Sifra dijagnoze je predugacka'),
  diagnosisName: sanitizedText(
    3,
    300,
    'Naziv dijagnoze mora imati najmanje 3 karaktera',
    'Naziv dijagnoze je predugacak',
  ),
  therapyNotes: optionalSanitizedText(2000, 'Napomena o terapiji je predugacka'),
});

export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;

/**
 * Propisivanje leka uz vec unet pregled.
 *
 * Validacija je ovde posebno vazna jer je rec o terapiji: trajanje mora biti
 * ceo pozitivan broj, a doza i ucestalost ne smeju ostati prazne.
 */
export const createPrescriptionSchema = z.object({
  medicalRecordId: z.string().min(1, 'Nedostaje pregled uz koji se propisuje lek'),
  medicationName: sanitizedText(
    2,
    200,
    'Naziv leka mora imati najmanje 2 karaktera',
    'Naziv leka je predugacak',
  ),
  dosage: sanitizedText(1, 100, 'Unesite dozu', 'Doza je predugacka'),
  frequency: sanitizedText(1, 100, 'Unesite ucestalost', 'Ucestalost je predugacka'),
  durationDays: z
    .number({ invalid_type_error: 'Trajanje mora biti broj' })
    .int('Trajanje mora biti ceo broj dana')
    .positive('Trajanje mora biti vece od nule')
    .max(365, 'Trajanje ne moze biti duze od godinu dana'),
  notes: optionalSanitizedText(500, 'Napomena je predugacka'),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

/**
 * Ispravka vec unetog pregleda. Sva polja su opciona, jer lekar obicno menja
 * samo jedan deo (npr. dopuni napomenu o terapiji).
 */
export const updateMedicalRecordSchema = z
  .object({
    symptoms: sanitizedText(
      5,
      2000,
      'Opis simptoma mora imati najmanje 5 karaktera',
      'Opis simptoma je predugacak',
    ).optional(),
    diagnosisCode: optionalSanitizedText(20, 'Sifra dijagnoze je predugacka'),
    diagnosisName: sanitizedText(
      3,
      300,
      'Naziv dijagnoze mora imati najmanje 3 karaktera',
      'Naziv dijagnoze je predugacak',
    ).optional(),
    therapyNotes: optionalSanitizedText(2000, 'Napomena o terapiji je predugacka'),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Nije poslata nijedna izmena',
  });

export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;

/**
 * Narucivanje laboratorijskog nalaza (radi lekar).
 * Rezultat se ovde NE unosi - nalaz nastaje sa statusom PENDING.
 */
export const createLabResultSchema = z.object({
  patientProfileId: z.string().min(1, 'Izaberite pacijenta'),
  testType: sanitizedText(
    3,
    200,
    'Naziv analize mora imati najmanje 3 karaktera',
    'Naziv analize je predugacak',
  ),
  testDate: z.coerce.date({ errorMap: () => ({ message: 'Neispravan datum analize' }) }).optional(),
});

export type CreateLabResultInput = z.infer<typeof createLabResultSchema>;

/**
 * Unos rezultata nalaza (radi sestra).
 * Status se ne prima od klijenta - postavlja se u kodu na COMPLETED.
 */
export const updateLabResultSchema = z.object({
  resultValue: sanitizedText(1, 100, 'Unesite izmerenu vrednost', 'Vrednost je predugacka'),
  resultUnit: optionalSanitizedText(50, 'Jedinica je predugacka'),
  referenceRange: optionalSanitizedText(100, 'Referentni opseg je predugacak'),
});

export type UpdateLabResultInput = z.infer<typeof updateLabResultSchema>;

/**
 * Unos alergije pacijenta. Unose je lekar i sestra, jer je to podatak koji se
 * prikuplja pri prijemu pacijenta, a ne dijagnoza.
 */
export const createAllergySchema = z.object({
  patientProfileId: z.string().min(1, 'Izaberite pacijenta'),
  allergen: sanitizedText(
    2,
    200,
    'Naziv alergena mora imati najmanje 2 karaktera',
    'Naziv alergena je predugacak',
  ),
  severity: z.nativeEnum(AllergySeverity, {
    errorMap: () => ({ message: 'Izaberite tezinu reakcije' }),
  }),
  notes: optionalSanitizedText(500, 'Napomena je predugacka'),
});

export type CreateAllergyInput = z.infer<typeof createAllergySchema>;

/**
 * Kreiranje naloga osoblja (radi administrator).
 *
 * Dozvoljene su samo uloge DOCTOR i NURSE - administrator ne moze kroz ovu
 * formu da napravi drugog administratora, niti pacijenta (pacijenti se
 * registruju sami). Za lekara su specijalizacija i broj licence obavezni.
 */
export const createStaffSchema = z
  .object({
    email: z.string().email('Neispravna email adresa'),
    password: passwordSchema,
    fullName: sanitizedText(
      3,
      100,
      'Ime i prezime moraju imati najmanje 3 karaktera',
      'Ime i prezime su predugacki',
    ),
    phone: optionalSanitizedText(30, 'Broj telefona je predugacak'),
    role: z.enum([Role.DOCTOR, Role.NURSE], {
      errorMap: () => ({ message: 'Izaberite ulogu: lekar ili sestra' }),
    }),
    specialization: optionalSanitizedText(100, 'Specijalizacija je predugacka'),
    licenseNumber: optionalSanitizedText(50, 'Broj licence je predugacak'),
    officeRoom: optionalSanitizedText(20, 'Oznaka ordinacije je predugacka'),
  })
  .refine((data) => data.role !== Role.DOCTOR || (data.specialization && data.licenseNumber), {
    message: 'Za lekara su obavezni specijalizacija i broj licence',
    path: ['specialization'],
  });

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/** Aktivacija odnosno deaktivacija naloga. */
export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ invalid_type_error: 'Vrednost mora biti tacno ili netacno' }),
});

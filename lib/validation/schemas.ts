import { z } from 'zod';
import { AppointmentStatus, AllergySeverity } from '@prisma/client';

/**
 * Zod seme za validaciju podataka koji stizu sa klijenta.
 *
 * Validacija se radi na serveru, a ne samo u formi, jer korisnik moze da posalje
 * zahtev i zaobilazeci formu (npr. preko Postmana). Sve poruke su na srpskom da bi
 * mogle direktno da se prikazu korisniku.
 */

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
  fullName: z.string().min(3, 'Ime i prezime moraju imati najmanje 3 karaktera').max(100),
  phone: z.string().max(30).optional(),
  jmbg: jmbgSchema,
  dateOfBirth: z.coerce
    .date({ errorMap: () => ({ message: 'Neispravan datum rodjenja' }) })
    .max(new Date(), 'Datum rodjenja ne moze biti u buducnosti'),
  address: z.string().max(200).optional(),
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
  reasonForVisit: z
    .string()
    .min(5, 'Razlog dolaska mora imati najmanje 5 karaktera')
    .max(500, 'Razlog dolaska moze imati najvise 500 karaktera'),
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
  symptoms: z
    .string()
    .min(5, 'Opis simptoma mora imati najmanje 5 karaktera')
    .max(2000, 'Opis simptoma je predugacak'),
  // Sifra je opciona: lekar sme da upise dijagnozu i bez nje.
  diagnosisCode: z.string().max(20, 'Sifra dijagnoze je predugacka').optional(),
  diagnosisName: z
    .string()
    .min(3, 'Naziv dijagnoze mora imati najmanje 3 karaktera')
    .max(300, 'Naziv dijagnoze je predugacak'),
  therapyNotes: z.string().max(2000, 'Napomena o terapiji je predugacka').optional(),
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
  medicationName: z
    .string()
    .min(2, 'Naziv leka mora imati najmanje 2 karaktera')
    .max(200, 'Naziv leka je predugacak'),
  dosage: z.string().min(1, 'Unesite dozu').max(100, 'Doza je predugacka'),
  frequency: z.string().min(1, 'Unesite ucestalost').max(100, 'Ucestalost je predugacka'),
  durationDays: z
    .number({ invalid_type_error: 'Trajanje mora biti broj' })
    .int('Trajanje mora biti ceo broj dana')
    .positive('Trajanje mora biti vece od nule')
    .max(365, 'Trajanje ne moze biti duze od godinu dana'),
  notes: z.string().max(500, 'Napomena je predugacka').optional(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;

/**
 * Ispravka vec unetog pregleda. Sva polja su opciona, jer lekar obicno menja
 * samo jedan deo (npr. dopuni napomenu o terapiji).
 */
export const updateMedicalRecordSchema = z
  .object({
    symptoms: z
      .string()
      .min(5, 'Opis simptoma mora imati najmanje 5 karaktera')
      .max(2000)
      .optional(),
    diagnosisCode: z.string().max(20).optional(),
    diagnosisName: z
      .string()
      .min(3, 'Naziv dijagnoze mora imati najmanje 3 karaktera')
      .max(300)
      .optional(),
    therapyNotes: z.string().max(2000).optional(),
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
  testType: z
    .string()
    .min(3, 'Naziv analize mora imati najmanje 3 karaktera')
    .max(200, 'Naziv analize je predugacak'),
  testDate: z.coerce.date({ errorMap: () => ({ message: 'Neispravan datum analize' }) }).optional(),
});

export type CreateLabResultInput = z.infer<typeof createLabResultSchema>;

/**
 * Unos rezultata nalaza (radi sestra).
 * Status se ne prima od klijenta - postavlja se u kodu na COMPLETED.
 */
export const updateLabResultSchema = z.object({
  resultValue: z.string().min(1, 'Unesite izmerenu vrednost').max(100, 'Vrednost je predugacka'),
  resultUnit: z.string().max(50, 'Jedinica je predugacka').optional(),
  referenceRange: z.string().max(100, 'Referentni opseg je predugacak').optional(),
});

export type UpdateLabResultInput = z.infer<typeof updateLabResultSchema>;

/**
 * Unos alergije pacijenta. Unose je lekar i sestra, jer je to podatak koji se
 * prikuplja pri prijemu pacijenta, a ne dijagnoza.
 */
export const createAllergySchema = z.object({
  patientProfileId: z.string().min(1, 'Izaberite pacijenta'),
  allergen: z
    .string()
    .min(2, 'Naziv alergena mora imati najmanje 2 karaktera')
    .max(200, 'Naziv alergena je predugacak'),
  severity: z.nativeEnum(AllergySeverity, {
    errorMap: () => ({ message: 'Izaberite tezinu reakcije' }),
  }),
  notes: z.string().max(500, 'Napomena je predugacka').optional(),
});

export type CreateAllergyInput = z.infer<typeof createAllergySchema>;

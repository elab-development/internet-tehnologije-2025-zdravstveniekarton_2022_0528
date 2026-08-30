import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';

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

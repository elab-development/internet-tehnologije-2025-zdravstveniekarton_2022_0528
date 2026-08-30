/**
 * Seed skripta - puni bazu demo podacima da se aplikacija moze odmah isprobati.
 * Pokretanje:  npm run db:seed
 *
 * Sve lozinke demo naloga su "lozinka123". Skripta je namerno napisana tako da
 * moze da se pokrene vise puta - prvo brise postojece podatke, pa ih ponovo kreira.
 */
import {
  PrismaClient,
  Role,
  AppointmentStatus,
  LabResultStatus,
  AllergySeverity,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'lozinka123';

async function main() {
  // Brisanje ide obrnutim redosledom od kreiranja, da se ne prekrse strani kljucevi.
  await prisma.prescription.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.allergy.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.user.deleteMany();

  // bcrypt je namerno spor algoritam - hesujemo jednom i koristimo za sve demo naloge.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // --- Administrator ---
  await prisma.user.create({
    data: {
      email: 'admin@ekarton.rs',
      passwordHash,
      fullName: 'Nikola Administrator',
      role: Role.ADMIN,
      phone: '011/1234-567',
    },
  });

  // --- Doktori ---
  const doctorJovanovic = await prisma.user.create({
    data: {
      email: 'jovanovic@ekarton.rs',
      passwordHash,
      fullName: 'Dr Milan Jovanovic',
      role: Role.DOCTOR,
      phone: '060/111-2222',
      doctorProfile: {
        create: { specialization: 'Opsta medicina', licenseNumber: 'LEK-1001', officeRoom: '12' },
      },
    },
  });

  const doctorPetrovic = await prisma.user.create({
    data: {
      email: 'petrovic@ekarton.rs',
      passwordHash,
      fullName: 'Dr Jelena Petrovic',
      role: Role.DOCTOR,
      phone: '060/333-4444',
      doctorProfile: {
        create: { specialization: 'Kardiologija', licenseNumber: 'LEK-1002', officeRoom: '7' },
      },
    },
  });

  // --- Medicinska sestra ---
  const nurse = await prisma.user.create({
    data: {
      email: 'sestra@ekarton.rs',
      passwordHash,
      fullName: 'Milica Nikolic',
      role: Role.NURSE,
      phone: '060/555-6666',
    },
  });

  // --- Pacijenti ---
  const patientMarko = await prisma.user.create({
    data: {
      email: 'marko@primer.rs',
      passwordHash,
      fullName: 'Marko Markovic',
      role: Role.PATIENT,
      phone: '063/777-8888',
      patientProfile: {
        create: {
          jmbg: '0101990710015',
          dateOfBirth: new Date('1990-01-01'),
          bloodType: 'A+',
          address: 'Bulevar kralja Aleksandra 73, Beograd',
          emergencyContactName: 'Jovana Markovic',
          emergencyContactPhone: '063/999-0000',
          insuranceNumber: 'OSG-556677',
        },
      },
    },
    include: { patientProfile: true },
  });

  const patientAna = await prisma.user.create({
    data: {
      email: 'ana@primer.rs',
      passwordHash,
      fullName: 'Ana Anic',
      role: Role.PATIENT,
      phone: '064/222-3333',
      patientProfile: {
        create: {
          jmbg: '1505988715023',
          dateOfBirth: new Date('1988-05-15'),
          bloodType: '0-',
          address: 'Nemanjina 4, Beograd',
          emergencyContactName: 'Petar Anic',
          emergencyContactPhone: '064/444-5555',
          insuranceNumber: 'OSG-112233',
        },
      },
    },
    include: { patientProfile: true },
  });

  // Znak uzvika govori TypeScriptu da profil sigurno postoji - upravo smo ga kreirali.
  const markoProfileId = patientMarko.patientProfile!.id;
  const anaProfileId = patientAna.patientProfile!.id;

  // --- Termini u razlicitim statusima, da se vidi ceo zivotni ciklus ---
  const completedAppointment = await prisma.appointment.create({
    data: {
      patientId: patientMarko.id,
      doctorId: doctorJovanovic.id,
      scheduledAt: new Date('2026-08-10T09:00:00'),
      reasonForVisit: 'Povisena temperatura i kasalj vec cetiri dana',
      status: AppointmentStatus.COMPLETED,
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patientAna.id,
      doctorId: doctorPetrovic.id,
      scheduledAt: new Date('2026-09-15T11:30:00'),
      reasonForVisit: 'Kontrola krvnog pritiska',
      status: AppointmentStatus.CONFIRMED,
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patientMarko.id,
      doctorId: doctorPetrovic.id,
      scheduledAt: new Date('2026-09-20T08:15:00'),
      reasonForVisit: 'Bol u grudima pri naporu',
      status: AppointmentStatus.REQUESTED,
    },
  });

  // --- Pregled nastao iz obavljenog termina, sa propisanom terapijom ---
  await prisma.medicalRecord.create({
    data: {
      appointmentId: completedAppointment.id,
      patientProfileId: markoProfileId,
      doctorId: doctorJovanovic.id,
      visitDate: new Date('2026-08-10T09:10:00'),
      symptoms: 'Temperatura do 38.5, suv kasalj, malaksalost.',
      diagnosisName: 'Akutna infekcija gornjih disajnih puteva',
      therapyNotes: 'Mirovanje, pojacan unos tecnosti, kontrola za sedam dana.',
      prescriptions: {
        create: [
          {
            medicationName: 'Paracetamol',
            dosage: '500 mg',
            frequency: 'tri puta dnevno',
            durationDays: 5,
            notes: 'Uzimati posle obroka.',
          },
          {
            medicationName: 'Amoksicilin',
            dosage: '875 mg',
            frequency: 'dva puta dnevno',
            durationDays: 7,
          },
        ],
      },
    },
  });

  // Pregled bez termina - pokazuje da appointmentId sme da bude prazan (hitan slucaj).
  await prisma.medicalRecord.create({
    data: {
      patientProfileId: anaProfileId,
      doctorId: doctorPetrovic.id,
      visitDate: new Date('2026-07-02T13:00:00'),
      symptoms: 'Glavobolja i vrtoglavica, izmeren pritisak 160/100.',
      diagnosisName: 'Povisen krvni pritisak',
      therapyNotes: 'Smanjiti unos soli, dnevno merenje pritiska.',
    },
  });

  // --- Laboratorijski nalazi: jedan zavrsen, jedan jos na cekanju ---
  await prisma.labResult.create({
    data: {
      patientProfileId: markoProfileId,
      requestedByDoctorId: doctorJovanovic.id,
      uploadedByNurseId: nurse.id,
      testType: 'Kompletna krvna slika',
      resultValue: '11.2',
      resultUnit: '10^9/L',
      referenceRange: '4.0 - 10.0',
      status: LabResultStatus.COMPLETED,
      testDate: new Date('2026-08-11T08:00:00'),
    },
  });

  await prisma.labResult.create({
    data: {
      patientProfileId: anaProfileId,
      requestedByDoctorId: doctorPetrovic.id,
      testType: 'Lipidni status',
      status: LabResultStatus.PENDING,
    },
  });

  // --- Alergije, koje se kasnije prikazuju kao upozorenje u kartonu ---
  await prisma.allergy.create({
    data: {
      patientProfileId: markoProfileId,
      allergen: 'Penicilin',
      severity: AllergySeverity.SEVERE,
      notes: 'Zabelezena jaka kozna reakcija 2019. godine.',
    },
  });

  await prisma.allergy.create({
    data: {
      patientProfileId: anaProfileId,
      allergen: 'Polen ambrozije',
      severity: AllergySeverity.MILD,
    },
  });

  console.log('Baza je popunjena demo podacima.');
  console.log('Lozinka za sve demo naloge: ' + DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error('Greska pri punjenju baze:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

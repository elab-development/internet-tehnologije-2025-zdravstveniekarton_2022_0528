import { Role, Prisma, AppointmentStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/session';
import { jsonOk, jsonAuthError } from '@/lib/api';

/**
 * GET /api/stats - podaci za grafikone na stranici statistike.
 *
 * Dostupno administratoru i lekaru, ali sa razlicitim opsegom:
 *  - administrator vidi statistiku cele ustanove,
 *  - lekar vidi iskljucivo sopstvene preglede.
 *
 * Opseg se odredjuje na serveru, iz uloge pozivaoca. Lekar ne moze nikakvim
 * parametrom da prosiri prikaz na tudje podatke.
 */

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Maj',
  'Jun',
  'Jul',
  'Avg',
  'Sep',
  'Okt',
  'Nov',
  'Dec',
];

export async function GET() {
  const auth = await requireRole([Role.ADMIN, Role.DOCTOR]);
  if (auth.error) return jsonAuthError(auth.error);

  const isDoctor = auth.user.role === Role.DOCTOR;

  // Lekaru se svi upiti ogranicavaju na njegove preglede.
  const recordFilter: Prisma.MedicalRecordWhereInput = isDoctor ? { doctorId: auth.user.id } : {};

  // Pocetak meseca od pre 11 meseci - zajedno sa tekucim to je 12 meseci.
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [recordsInRange, diagnosisGroups, totalRecords, totalPrescriptions, appointmentGroups] =
    await Promise.all([
      // Za grafik po mesecima uzimaju se samo datumi, ne celi pregledi.
      prisma.medicalRecord.findMany({
        where: { ...recordFilter, visitDate: { gte: rangeStart } },
        select: { visitDate: true },
      }),

      // groupBy radi grupisanje u BAZI - ne povlaci se svaki pregled u aplikaciju
      // samo da bi se prebrojale dijagnoze.
      prisma.medicalRecord.groupBy({
        by: ['diagnosisName'],
        where: recordFilter,
        _count: { diagnosisName: true },
        orderBy: { _count: { diagnosisName: 'desc' } },
        take: 7, // sedam najcescih dijagnoza, ostalo bi bio sum na grafiku
      }),

      prisma.medicalRecord.count({ where: recordFilter }),

      prisma.prescription.count({
        where: isDoctor ? { medicalRecord: { doctorId: auth.user.id } } : {},
      }),

      prisma.appointment.groupBy({
        by: ['status'],
        where: isDoctor ? { doctorId: auth.user.id } : {},
        _count: { status: true },
      }),
    ]);

  // Grupisanje po mesecima se radi u aplikaciji, jer bi u bazi trazilo
  // SQL funkciju date_trunc i pisanje sirovog upita. Podataka je malo
  // (samo poslednjih 12 meseci), pa je ovo jednostavnije i citljivije.
  const monthlyCounts = new Map<string, number>();
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthlyCounts.set(`${date.getFullYear()}-${date.getMonth()}`, 0);
  }
  for (const record of recordsInRange) {
    const key = `${record.visitDate.getFullYear()}-${record.visitDate.getMonth()}`;
    if (monthlyCounts.has(key)) {
      monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
    }
  }

  const visitsPerMonth = Array.from(monthlyCounts.entries()).map(([key, count]) => {
    const [year, month] = key.split('-').map(Number);
    return { label: `${MONTH_NAMES[month]} ${year}`, count };
  });

  const topDiagnoses = diagnosisGroups.map((group) => ({
    name: group.diagnosisName,
    count: group._count.diagnosisName,
  }));

  const appointmentsByStatus = Object.values(AppointmentStatus).map((status) => ({
    status,
    count: appointmentGroups.find((group) => group.status === status)?._count.status ?? 0,
  }));

  return jsonOk({
    // Opseg se vraca klijentu da stranica moze da napise cija je statistika.
    scope: isDoctor ? 'DOCTOR' : 'ALL',
    totals: {
      records: totalRecords,
      prescriptions: totalPrescriptions,
    },
    visitsPerMonth,
    topDiagnoses,
    appointmentsByStatus,
  });
}

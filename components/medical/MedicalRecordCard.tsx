import Link from 'next/link';
import Card from '@/components/ui/Card';
import { formatDate } from '@/lib/format';

export type Prescription = {
  id: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  notes: string | null;
};

export type MedicalRecord = {
  id: string;
  visitDate: string;
  symptoms: string;
  diagnosisCode: string | null;
  diagnosisName: string;
  therapyNotes: string | null;
  doctor: {
    id: string;
    fullName: string;
    doctorProfile: { specialization: string } | null;
  };
  prescriptions: Prescription[];
};

/**
 * Prikaz jednog pregleda u kartonu: dijagnoza, simptomi, terapija i recepti.
 *
 * Komponenta je namerno "glupa" - samo prikazuje prosledjene podatke, bez
 * ijednog poziva ka serveru. Zato se moze koristiti i u kartonu pacijenta i
 * kasnije na stranici pojedinacnog pregleda.
 */
export default function MedicalRecordCard({
  record,
  showDetailsLink = false,
}: {
  record: MedicalRecord;
  /** Prikazuje vezu ka stranici pregleda; iskljucuje se na samoj toj stranici. */
  showDetailsLink?: boolean;
}) {
  return (
    <Card
      title={record.diagnosisName}
      subtitle={`${formatDate(record.visitDate)} - ${record.doctor.fullName}${
        record.doctor.doctorProfile ? ` (${record.doctor.doctorProfile.specialization})` : ''
      }`}
      actions={
        // Sifra se prikazuje samo ako je lekar izabrao dijagnozu iz ICD-10 baze.
        record.diagnosisCode ? (
          <span className="rounded bg-primary-50 px-2 py-1 font-mono text-xs text-primary-700">
            {record.diagnosisCode}
          </span>
        ) : null
      }
    >
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="font-medium text-slate-500">Simptomi</dt>
          <dd className="mt-0.5 whitespace-pre-line text-slate-800">{record.symptoms}</dd>
        </div>

        {record.therapyNotes && (
          <div>
            <dt className="font-medium text-slate-500">Terapija i napomene</dt>
            <dd className="mt-0.5 whitespace-pre-line text-slate-800">{record.therapyNotes}</dd>
          </div>
        )}

        {record.prescriptions.length > 0 && (
          <div>
            <dt className="font-medium text-slate-500">Propisani lekovi</dt>
            <dd className="mt-1">
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {record.prescriptions.map((prescription) => (
                  <li key={prescription.id} className="px-3 py-2">
                    <p className="font-medium text-slate-800">{prescription.medicationName}</p>
                    <p className="text-slate-600">
                      {prescription.dosage}, {prescription.frequency}, {prescription.durationDays}{' '}
                      dana
                    </p>
                    {prescription.notes && (
                      <p className="mt-0.5 text-xs text-slate-500">{prescription.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>

      {showDetailsLink && (
        <Link
          href={`/medical-records/${record.id}`}
          className="mt-3 inline-block text-sm text-primary-700 hover:underline"
        >
          Detalji pregleda i terapija
        </Link>
      )}
    </Card>
  );
}

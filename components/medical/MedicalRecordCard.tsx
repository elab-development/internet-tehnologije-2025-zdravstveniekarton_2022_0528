import Link from 'next/link';
import { LabResultStatus } from '@prisma/client';
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

export type RecordLabResult = {
  id: string;
  testType: string;
  resultValue: string | null;
  resultUnit: string | null;
  referenceRange: string | null;
  status: LabResultStatus;
  testDate: string;
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
  /** Nalazi naruceni tokom ovog pregleda; stariji pregledi ih mogu nemati. */
  labResults?: RecordLabResult[];
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

        {record.labResults && record.labResults.length > 0 && (
          <div>
            <dt className="font-medium text-slate-500">Narucene analize</dt>
            <dd className="mt-1">
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {record.labResults.map((lab) => (
                  <li key={lab.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                    <span className="font-medium text-slate-800">{lab.testType}</span>
                    {lab.status === LabResultStatus.COMPLETED ? (
                      <span className="text-slate-700">
                        {lab.resultValue} {lab.resultUnit}
                        {lab.referenceRange && (
                          <span className="text-slate-500"> (ref. {lab.referenceRange})</span>
                        )}
                      </span>
                    ) : (
                      <span className="rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700">
                        Ceka rezultat
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </dd>
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

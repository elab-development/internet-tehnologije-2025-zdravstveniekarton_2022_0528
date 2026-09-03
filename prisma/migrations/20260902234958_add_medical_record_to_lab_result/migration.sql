-- AlterTable
ALTER TABLE "LabResult" ADD COLUMN     "medicalRecordId" TEXT;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_medicalRecordId_fkey" FOREIGN KEY ("medicalRecordId") REFERENCES "MedicalRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

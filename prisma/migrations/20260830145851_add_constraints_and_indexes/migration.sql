-- CreateIndex
CREATE INDEX "Appointment_scheduledAt_idx" ON "Appointment"("scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorProfile_licenseNumber_key" ON "DoctorProfile"("licenseNumber");

-- CreateIndex
CREATE INDEX "MedicalRecord_patientProfileId_visitDate_idx" ON "MedicalRecord"("patientProfileId", "visitDate");

-- CreateIndex
CREATE UNIQUE INDEX "PatientProfile_jmbg_key" ON "PatientProfile"("jmbg");


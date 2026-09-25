CREATE INDEX "appointments_starts_id_idx" ON "appointments" USING btree ("starts_at","id");--> statement-breakpoint
CREATE INDEX "doctors_last_name_id_idx" ON "doctors" USING btree ("last_name","id");--> statement-breakpoint
CREATE INDEX "patients_last_name_id_idx" ON "patients" USING btree ("last_name","id");
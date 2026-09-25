-- A doctor can't have two scheduled appointments whose times overlap.
-- The service checks this too, but only the database can guarantee it when
-- two bookings arrive at the same moment. btree_gist lets a GiST index
-- compare the plain doctor_id column alongside the time range.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_double_booking"
  EXCLUDE USING gist (
    "doctor_id" WITH =,
    tstzrange("starts_at", "ends_at") WITH &&
  ) WHERE ("status" = 'scheduled');
--> statement-breakpoint
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_ends_after_starts" CHECK ("ends_at" > "starts_at");

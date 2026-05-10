ALTER TABLE "tennis_reservations" ADD COLUMN "reserved_by_name" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "tennis_reservations" ADD COLUMN "reserved_by_contact" text DEFAULT '' NOT NULL;

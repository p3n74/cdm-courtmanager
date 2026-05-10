CREATE TABLE "pickleball_reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"slot_start" timestamp with time zone NOT NULL,
	"court_berth" integer NOT NULL,
	"homeowner_id" uuid,
	"reserved_by_name" text NOT NULL,
	"reserved_by_contact" text NOT NULL,
	"no_show" boolean DEFAULT false NOT NULL,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickleball_reservations_slot_berth_unique" UNIQUE("slot_start","court_berth"),
	CONSTRAINT "pickleball_reservations_manila_hours" CHECK (
        EXTRACT(MINUTE FROM ("pickleball_reservations"."slot_start" AT TIME ZONE 'Asia/Manila')) = 0
        AND EXTRACT(SECOND FROM ("pickleball_reservations"."slot_start" AT TIME ZONE 'Asia/Manila')) = 0
        AND EXTRACT(HOUR FROM ("pickleball_reservations"."slot_start" AT TIME ZONE 'Asia/Manila')) >= 16
        AND EXTRACT(HOUR FROM ("pickleball_reservations"."slot_start" AT TIME ZONE 'Asia/Manila')) <= 21
      ),
	CONSTRAINT "pickleball_reservations_court_berth_ok" CHECK ("court_berth" >= 1 AND "court_berth" <= 4)
);
--> statement-breakpoint
ALTER TABLE "pickleball_reservations" ADD CONSTRAINT "pickleball_reservations_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "pickleball_reservations" ADD CONSTRAINT "pickleball_reservations_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

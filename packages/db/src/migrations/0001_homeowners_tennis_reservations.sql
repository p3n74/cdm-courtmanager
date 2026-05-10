CREATE TABLE "homeowners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase" integer NOT NULL,
	"block" integer NOT NULL,
	"lot" integer NOT NULL,
	CONSTRAINT "homeowners_phase_block_lot_unique" UNIQUE("phase","block","lot")
);
--> statement-breakpoint
ALTER TABLE "tennis_reservations" ADD COLUMN "no_show" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "tennis_reservations" ADD COLUMN "homeowner_id" uuid;
--> statement-breakpoint
ALTER TABLE "tennis_reservations" DROP COLUMN "player_id";
--> statement-breakpoint
ALTER TABLE "tennis_reservations" ADD CONSTRAINT "tennis_reservations_homeowner_id_homeowners_id_fk" FOREIGN KEY ("homeowner_id") REFERENCES "public"."homeowners"("id") ON DELETE restrict ON UPDATE no action;

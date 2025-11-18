CREATE TABLE "settings" (
	"settingsId" text PRIMARY KEY NOT NULL,
	"globalMemoryReservation" text,
	"globalMemoryLimit" text,
	"globalCpuReservation" text,
	"globalCpuLimit" text,
	"createdAt" text NOT NULL,
	"updatedAt" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN "memoryReservation" text;--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN "memoryLimit" text;--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN "cpuReservation" text;--> statement-breakpoint
ALTER TABLE "compose" ADD COLUMN "cpuLimit" text;
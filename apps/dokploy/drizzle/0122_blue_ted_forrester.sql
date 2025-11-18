ALTER TABLE "destination" ALTER COLUMN "accessKey" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "destination" ALTER COLUMN "secretAccessKey" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "destination" ALTER COLUMN "bucket" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "destination" ALTER COLUMN "region" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "destination" ALTER COLUMN "endpoint" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "destination" ADD COLUMN "provider_type" text DEFAULT 's3';--> statement-breakpoint
ALTER TABLE "destination" ADD COLUMN "rclone_config" text;--> statement-breakpoint
ALTER TABLE "destination" ADD COLUMN "custom_config" text;--> statement-breakpoint
ALTER TABLE "destination" ADD COLUMN "last_tested_at" timestamp;--> statement-breakpoint
ALTER TABLE "destination" ADD COLUMN "last_error" text;
-- Add multi-provider support to destination table
ALTER TABLE "destination" ADD COLUMN "provider_type" text DEFAULT 's3';
ALTER TABLE "destination" ADD COLUMN "rclone_config" text;
ALTER TABLE "destination" ADD COLUMN "custom_config" text;
ALTER TABLE "destination" ADD COLUMN "last_tested_at" timestamp;
ALTER TABLE "destination" ADD COLUMN "last_error" text;

-- Set existing destinations to S3 provider type
UPDATE "destination" SET "provider_type" = 's3' WHERE "provider_type" IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_destination_provider_type" ON "destination"("provider_type");
CREATE INDEX IF NOT EXISTS "idx_destination_organization" ON "destination"("organizationId");

-- Make legacy S3 fields optional (for backward compatibility)
ALTER TABLE "destination" ALTER COLUMN "accessKey" DROP NOT NULL;
ALTER TABLE "destination" ALTER COLUMN "secretAccessKey" DROP NOT NULL;
ALTER TABLE "destination" ALTER COLUMN "bucket" DROP NOT NULL;
ALTER TABLE "destination" ALTER COLUMN "region" DROP NOT NULL;
ALTER TABLE "destination" ALTER COLUMN "endpoint" DROP NOT NULL;

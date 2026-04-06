-- Add rxNumber and status columns to PrescriptionRecord
ALTER TABLE "PrescriptionRecord"
  ADD COLUMN "rxNumber" TEXT,
  ADD COLUMN "status"   TEXT;

-- Create ProviderAddress table
CREATE TABLE "ProviderAddress" (
  "id"             TEXT         NOT NULL,
  "providerId"     TEXT         NOT NULL,
  "organizationId" TEXT         NOT NULL,
  "label"          TEXT,
  "address"        TEXT         NOT NULL,
  "city"           TEXT,
  "state"          TEXT,
  "zip"            TEXT,
  "isPrimary"      BOOLEAN      NOT NULL DEFAULT false,
  "source"         TEXT         NOT NULL DEFAULT 'manual',
  "createdAt"      TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ  NOT NULL,

  CONSTRAINT "ProviderAddress_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "ProviderAddress"
  ADD CONSTRAINT "ProviderAddress_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE;

ALTER TABLE "ProviderAddress"
  ADD CONSTRAINT "ProviderAddress_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id");

-- Indexes
CREATE INDEX "ProviderAddress_providerId_idx"     ON "ProviderAddress"("providerId");
CREATE INDEX "ProviderAddress_organizationId_idx" ON "ProviderAddress"("organizationId");

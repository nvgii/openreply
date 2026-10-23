-- Comments are only handled once a campaign is active. Stamp existing rows
-- with the migration time so a campaign that is already running does not go
-- back and DM comments from before this update.
ALTER TABLE "Automation" ADD COLUMN "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

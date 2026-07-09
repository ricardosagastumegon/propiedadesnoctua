ALTER TABLE "OrganizationSettings" ADD COLUMN "intermediaryCode" TEXT;
CREATE UNIQUE INDEX "OrganizationSettings_intermediaryCode_key" ON "OrganizationSettings"("intermediaryCode");

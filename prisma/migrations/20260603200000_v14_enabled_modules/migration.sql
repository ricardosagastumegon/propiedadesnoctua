-- Módulos habilitados por organización (null = todos)
ALTER TABLE "OrganizationSettings" ADD COLUMN "enabledModules" JSONB;

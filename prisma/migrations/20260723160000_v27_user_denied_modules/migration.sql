-- Bloqueo de módulos por-usuario (override sobre el rol). Ej. un ADMIN sin Configuración.
ALTER TABLE "User" ADD COLUMN "deniedModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

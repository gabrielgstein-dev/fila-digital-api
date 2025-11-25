CREATE TYPE "CorporateUserRole" AS ENUM
('OPERADOR', 'GERENTE', 'GESTOR', 'ADMINISTRADOR');

CREATE TABLE "corporate_users"
(
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "password" TEXT,
  "googleId" TEXT,
  "role" "CorporateUserRole" NOT NULL DEFAULT 'OPERADOR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "tenantId" TEXT NOT NULL,
  "cpf" TEXT NOT NULL,
  "phone" TEXT,
  "department" TEXT,
  "position" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isProtected" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "corporate_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "corporate_users_email_key" ON "corporate_users"("email");
CREATE UNIQUE INDEX "corporate_users_googleId_key" ON "corporate_users"("googleId");
CREATE UNIQUE INDEX "corporate_users_cpf_key" ON "corporate_users"("cpf");

ALTER TABLE "corporate_users" ADD CONSTRAINT "corporate_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "corporate_user_permissions"
(
  "id" TEXT NOT NULL,
  "corporateUserId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "corporate_user_permissions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "corporate_user_permissions" ADD CONSTRAINT "corporate_user_permissions_corporateUserId_fkey" FOREIGN KEY ("corporateUserId") REFERENCES "corporate_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "corporate_user_permissions_corporateUserId_resource_action_key" ON "corporate_user_permissions"("corporateUserId", "resource", "action");

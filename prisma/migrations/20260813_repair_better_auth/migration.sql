-- Migración de reparación: la migración 20260729032148_better_auth quedó marcada
-- como aplicada en _prisma_migrations sin haberse ejecutado realmente en la BD.
-- Este script es idempotente: se puede correr sobre una BD en cualquier estado
-- intermedio y deja el schema alineado con schema.prisma.

BEGIN;

-- ─────────────────────────────────────────────
-- USER: columnas de Better Auth
-- ─────────────────────────────────────────────

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "image" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "address" TEXT;

-- Backfill de name para filas existentes antes de ponerlo NOT NULL
UPDATE "User"
SET "name" = TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", ''))
WHERE "name" IS NULL OR "name" = '';

UPDATE "User" SET "name" = "email" WHERE "name" IS NULL OR "name" = '';

ALTER TABLE "User" ALTER COLUMN "name" SET NOT NULL;

-- firstName / lastName pasan a opcionales
ALTER TABLE "User" ALTER COLUMN "firstName" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName"  DROP NOT NULL;

-- La contraseña ahora vive en Account.password; si quedó NOT NULL rompe los inserts
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";

-- ─────────────────────────────────────────────
-- SESSION / ACCOUNT / VERIFICATION
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Session" (
    "id"        TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token"     TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId"    TEXT NOT NULL,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Account" (
    "id"                    TEXT NOT NULL,
    "accountId"             TEXT NOT NULL,
    "providerId"            TEXT NOT NULL,
    "userId"                TEXT NOT NULL,
    "accessToken"           TEXT,
    "refreshToken"          TEXT,
    "idToken"               TEXT,
    "accessTokenExpiresAt"  TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope"                 TEXT,
    "password"              TEXT,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Verification" (
    "id"         TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");

-- Foreign keys (ADD CONSTRAINT no soporta IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Session_userId_fkey') THEN
    ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_userId_fkey') THEN
    ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- ORDER: snapshot de datos de entrega
-- ─────────────────────────────────────────────

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "lastName"  TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "email"     TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "phone"     TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "address"   TEXT;

UPDATE "Order" SET "firstName" = '' WHERE "firstName" IS NULL;
UPDATE "Order" SET "lastName"  = '' WHERE "lastName"  IS NULL;
UPDATE "Order" SET "email"     = '' WHERE "email"     IS NULL;
UPDATE "Order" SET "phone"     = '' WHERE "phone"     IS NULL;
UPDATE "Order" SET "address"   = '' WHERE "address"   IS NULL;

ALTER TABLE "Order" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "lastName"  SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "email"     SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "phone"     SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "address"   SET NOT NULL;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_addressId_fkey";
ALTER TABLE "Order" DROP COLUMN IF EXISTS "addressId";

-- ─────────────────────────────────────────────
-- ORDERITEM: snapshot de producto
-- ─────────────────────────────────────────────

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "size" TEXT;

UPDATE "OrderItem" SET "name" = 'Producto' WHERE "name" IS NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "variantId" DROP NOT NULL;

-- ─────────────────────────────────────────────
-- Tablas obsoletas
-- ─────────────────────────────────────────────

DROP TABLE IF EXISTS "CartItem";
DROP TABLE IF EXISTS "Cart";
DROP TABLE IF EXISTS "Address";

COMMIT;

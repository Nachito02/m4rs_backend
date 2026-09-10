-- Imágenes del "Universo visual" (home + /universo).
-- Tabla independiente: sin FK a Product ni User, se puede vaciar sin efectos.

BEGIN;

CREATE TABLE IF NOT EXISTS "GalleryImage" (
  "id"        TEXT NOT NULL,
  "url"       TEXT NOT NULL,
  "publicId"  TEXT,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GalleryImage_order_idx" ON "GalleryImage"("order");

COMMIT;

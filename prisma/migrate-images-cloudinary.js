/**
 * Sube las imágenes locales (/images/xxx) a Cloudinary
 * y actualiza las URLs en la base de datos.
 *
 * Uso: node prisma/migrate-images-cloudinary.js
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma    = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBuffer(buffer) {
  return new Promise((resolve, reject) =>
    cloudinary.uploader
      .upload_stream({ folder: "m4rs/products" }, (err, result) =>
        err ? reject(err) : resolve(result.secure_url)
      )
      .end(buffer)
  );
}

const images = await prisma.productImage.findMany();
let updated = 0;

for (const img of images) {
  if (!img.url.startsWith("/images/")) {
    console.log(`⏭  Saltando (ya es URL externa): ${img.url}`);
    continue;
  }

  const filename = img.url.replace("/images/", "");
  const filePath = join(__dirname, "../public/images", filename);

  try {
    const buffer = await readFile(filePath);
    const newUrl = await uploadBuffer(buffer);

    await prisma.productImage.update({ where: { id: img.id }, data: { url: newUrl } });
    console.log(`✅  ${img.url} → ${newUrl}`);
    updated++;
  } catch (err) {
    console.error(`❌  Error con ${img.url}:`, err.message);
  }
}

console.log(`\nMigración completa: ${updated}/${images.length} imágenes actualizadas.`);
await prisma.$disconnect();

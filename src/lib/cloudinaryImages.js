import cloudinary from "./cloudinary.js";

// Extrae el public_id de una URL de Cloudinary para poder borrarla.
// Solo sirve como fallback: si la URL trae transformaciones en el path
// la regex captura de más. Cuando se guardó el publicId, usar ese.
export function cloudinaryPublicId(url) {
  if (!url || !url.includes("res.cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
  return match ? match[1] : null;
}

export async function destroyPublicIds(ids) {
  const clean = ids.filter(Boolean);
  await Promise.allSettled(clean.map((id) => cloudinary.uploader.destroy(id)));
}

export async function deleteCloudinaryImages(urls) {
  await destroyPublicIds(urls.map(cloudinaryPublicId));
}

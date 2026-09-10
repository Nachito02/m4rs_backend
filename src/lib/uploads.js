import multer from "multer";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

// El cliente manda una clave, nunca una ruta: así no puede escribir
// en cualquier carpeta de la cuenta de Cloudinary.
export const UPLOAD_FOLDERS = {
  products: "m4rs/products",
  gallery:  "m4rs/gallery",
};

// Sin límite, un POST grande se bufferea entero en la RAM del proceso.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 10 },
  fileFilter: (req, file, cb) =>
    ALLOWED_MIME.has(file.mimetype)
      ? cb(null, true)
      : cb(new Error("UNSUPPORTED_MEDIA_TYPE")),
});

export function resolveFolder(key) {
  return UPLOAD_FOLDERS[key] ?? UPLOAD_FOLDERS.products;
}

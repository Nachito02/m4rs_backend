import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// GET /api/gallery?limit=4
router.get("/", async (req, res, next) => {
  try {
    const raw  = Number(req.query.limit);
    const take = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 100) : undefined;

    const select = { id: true, url: true };  // publicId es infraestructura, no se expone

    // La galería es cronológica (las nuevas al final), así que con limit
    // devolvemos la cola —las más recientes— pero en el mismo orden de lectura.
    if (take) {
      const recent = await prisma.galleryImage.findMany({
        orderBy: [{ order: "desc" }, { createdAt: "desc" }],
        take,
        select,
      });
      return res.json({ images: recent.reverse() });
    }

    const images = await prisma.galleryImage.findMany({
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select,
    });

    res.json({ images });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router }      from "express";
import { requireAdmin } from "../middleware/auth.js";
import cloudinary       from "../lib/cloudinary.js";
import prisma           from "../lib/prisma.js";
import { upload, resolveFolder } from "../lib/uploads.js";
import {
  cloudinaryPublicId,
  deleteCloudinaryImages,
  destroyPublicIds,
} from "../lib/cloudinaryImages.js";

const router = Router();

const productInclude = {
  variants:    { orderBy: { price: "asc" } },
  images:      { orderBy: { order: "asc" } },
  features:    { orderBy: { order: "asc" } },
  composition: true,
  care:        { orderBy: { order: "asc" } },
  categories:  { include: { category: true } },
};

// ── Upload imagen a Cloudinary ────────────────────────────
router.post("/upload", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No se recibió imagen" });

    const folder = resolveFolder(req.body.folder);

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    next(err);
  }
});

// ── Usuarios ──────────────────────────────────────────────
router.get("/users", requireAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true, createdAt: true },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

router.put("/users/:id/role", requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["ADMIN", "CUSTOMER"].includes(role)) return res.status(400).json({ error: "Rol inválido" });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// ── Productos — lista completa (incluye inactivos) ────────
router.get("/products", requireAdmin, async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: productInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ products });
  } catch (err) {
    next(err);
  }
});

// ── Producto por slug ─────────────────────────────────────
router.get("/products/:slug", requireAdmin, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where:   { slug: req.params.slug },
      include: productInclude,
    });
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// ── Crear producto ────────────────────────────────────────
router.post("/products", requireAdmin, async (req, res, next) => {
  try {
    const { name, slug, description, fitGuide, isActive, images, variants, features, composition, care, categoryIds } = req.body;

    const product = await prisma.product.create({
      data: {
        name, slug, description,
        fitGuide: fitGuide || null,
        isActive:  isActive ?? true,
        images:      { create: images?.map((url, i) => ({ url, order: i, isPrimary: i === 0 })) ?? [] },
        variants:    { create: variants?.map((v) => ({ sku: v.sku || `${slug}-${v.size}`, size: v.size, price: Number(v.price), stock: Number(v.stock) })) ?? [] },
        features:    { create: features?.map((text, i) => ({ text, order: i })) ?? [] },
        composition: { create: composition?.map(({ label, value }) => ({ label, value })) ?? [] },
        care:        { create: care?.map((text, i) => ({ text, order: i })) ?? [] },
        categories:  { create: categoryIds?.map((categoryId) => ({ categoryId })) ?? [] },
      },
      include: productInclude,
    });

    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
});

// ── Actualizar producto ───────────────────────────────────
router.put("/products/:slug", requireAdmin, async (req, res, next) => {
  try {
    const { name, slug: newSlug, description, fitGuide, isActive, images, variants, features, composition, care, categoryIds } = req.body;

    const existing = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { images: true },
    });
    if (!existing) return res.status(404).json({ error: "Producto no encontrado" });

    // Detectar imágenes que ya no están en el nuevo set para borrarlas de Cloudinary
    const newUrls = new Set(images ?? []);
    const orphanedUrls = existing.images
      .map((i) => i.url)
      .filter((url) => !newUrls.has(url));

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: existing.id } }),
      prisma.productVariant.deleteMany({ where: { productId: existing.id } }),
      prisma.productFeature.deleteMany({ where: { productId: existing.id } }),
      prisma.productComposition.deleteMany({ where: { productId: existing.id } }),
      prisma.productCare.deleteMany({ where: { productId: existing.id } }),
      prisma.categoryOnProduct.deleteMany({ where: { productId: existing.id } }),
    ]);

    // Borrar de Cloudinary en background — no bloqueamos la respuesta
    if (orphanedUrls.length) deleteCloudinaryImages(orphanedUrls);

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name,
        slug:     newSlug ?? existing.slug,
        description,
        fitGuide: fitGuide || null,
        isActive:  isActive ?? existing.isActive,
        images:      { create: images?.map((url, i) => ({ url, order: i, isPrimary: i === 0 })) ?? [] },
        variants:    { create: variants?.map((v) => ({ sku: v.sku || `${newSlug || existing.slug}-${v.size}`, size: v.size, price: Number(v.price), stock: Number(v.stock) })) ?? [] },
        features:    { create: features?.map((text, i) => ({ text, order: i })) ?? [] },
        composition: { create: composition?.map(({ label, value }) => ({ label, value })) ?? [] },
        care:        { create: care?.map((text, i) => ({ text, order: i })) ?? [] },
        categories:  { create: categoryIds?.map((categoryId) => ({ categoryId })) ?? [] },
      },
      include: productInclude,
    });

    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// ── Eliminar producto ─────────────────────────────────────
router.delete("/products/:slug", requireAdmin, async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { images: true },
    });
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    const imageUrls = product.images.map((i) => i.url);
    await prisma.product.delete({ where: { id: product.id } });

    if (imageUrls.length) deleteCloudinaryImages(imageUrls);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── Órdenes ───────────────────────────────────────────────
router.get("/orders", requireAdmin, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        user:  { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

router.patch("/orders/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ["IN_PREPARATION", "READY", "SHIPPED", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Status inválido" });
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

// ── Galería (Universo visual) ─────────────────────────────

const galleryOrder = [{ order: "asc" }, { createdAt: "asc" }];

router.get("/gallery", requireAdmin, async (req, res, next) => {
  try {
    const images = await prisma.galleryImage.findMany({ orderBy: galleryOrder });
    res.json({ images });
  } catch (err) {
    next(err);
  }
});

router.post("/gallery", requireAdmin, async (req, res, next) => {
  try {
    const { url, publicId } = req.body;

    // Sin validar, un request armado a mano mete cualquier URL externa en el home
    const prefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
    if (typeof url !== "string" || !url.startsWith(prefix)) {
      return res.status(400).json({ error: "URL inválida" });
    }

    // Las nuevas van al final: la galería queda cronológica
    const last = await prisma.galleryImage.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const image = await prisma.galleryImage.create({
      data: {
        url,
        publicId: typeof publicId === "string" ? publicId : null,
        order: (last?.order ?? -1) + 1,
      },
    });

    res.status(201).json({ image });
  } catch (err) {
    next(err);
  }
});

// Va antes de cualquier /gallery/:id para que Express no lo tome como parámetro
router.put("/gallery/order", requireAdmin, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return res.status(400).json({ error: "ids inválido" });
    }

    await prisma.$transaction(
      ids.map((id, order) => prisma.galleryImage.update({ where: { id }, data: { order } }))
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/gallery/:id", requireAdmin, async (req, res, next) => {
  try {
    const image = await prisma.galleryImage.findUnique({ where: { id: req.params.id } });
    if (!image) return res.status(404).json({ error: "Imagen no encontrada" });

    // Primero la fila: si Cloudinary falla no queremos una fila apuntando a nada
    await prisma.galleryImage.delete({ where: { id: image.id } });

    const publicId = image.publicId ?? cloudinaryPublicId(image.url);
    if (publicId) destroyPublicIds([publicId]);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

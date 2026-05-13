import { Router }      from "express";
import { PrismaClient } from "@prisma/client";
import multer           from "multer";
import { requireAdmin } from "../middleware/auth.js";
import cloudinary       from "../lib/cloudinary.js";

const router = Router();
const prisma  = new PrismaClient();
const upload  = multer({ storage: multer.memoryStorage() });

// ── Helpers ───────────────────────────────────────────────
const productInclude = {
  variants:    { orderBy: { price: "asc" } },
  images:      { orderBy: { order: "asc" } },
  features:    { orderBy: { order: "asc" } },
  composition: true,
  care:        { orderBy: { order: "asc" } },
  categories:  { include: { category: true } },
};

// ── Upload imagen a Cloudinary ────────────────────────────
router.post("/upload", requireAdmin, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No se recibió imagen" });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "m4rs/products" },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(req.file.buffer);
  });

  res.json({ url: result.secure_url, publicId: result.public_id });
});

// ── Usuarios ──────────────────────────────────────────────
router.get("/users", requireAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, firstName: true, lastName: true, email: true, role: true, phone: true, createdAt: true },
  });
  res.json({ users });
});

router.put("/users/:id/role", requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!["ADMIN", "CUSTOMER"].includes(role)) return res.status(400).json({ error: "Rol inválido" });
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, role: true },
  });
  res.json({ user });
});

// ── Productos — lista completa (incluye inactivos) ────────
router.get("/products", requireAdmin, async (req, res) => {
  const products = await prisma.product.findMany({
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ products });
});

// ── Producto por slug ─────────────────────────────────────
router.get("/products/:slug", requireAdmin, async (req, res) => {
  const product = await prisma.product.findUnique({
    where:   { slug: req.params.slug },
    include: productInclude,
  });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  res.json({ product });
});

// ── Crear producto ────────────────────────────────────────
router.post("/products", requireAdmin, async (req, res) => {
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
});

// ── Actualizar producto ───────────────────────────────────
router.put("/products/:slug", requireAdmin, async (req, res) => {
  const { name, slug: newSlug, description, fitGuide, isActive, images, variants, features, composition, care, categoryIds } = req.body;

  const existing = await prisma.product.findUnique({ where: { slug: req.params.slug } });
  if (!existing) return res.status(404).json({ error: "Producto no encontrado" });

  // Borrar relaciones y recrear (más simple que diff)
  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: existing.id } }),
    prisma.productVariant.deleteMany({ where: { productId: existing.id } }),
    prisma.productFeature.deleteMany({ where: { productId: existing.id } }),
    prisma.productComposition.deleteMany({ where: { productId: existing.id } }),
    prisma.productCare.deleteMany({ where: { productId: existing.id } }),
    prisma.categoryOnProduct.deleteMany({ where: { productId: existing.id } }),
  ]);

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
});

// ── Eliminar producto ─────────────────────────────────────
router.delete("/products/:slug", requireAdmin, async (req, res) => {
  const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
  if (!product) return res.status(404).json({ error: "Producto no encontrado" });
  await prisma.product.delete({ where: { id: product.id } });
  res.json({ ok: true });
});

export default router;

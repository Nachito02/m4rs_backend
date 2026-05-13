import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

const productInclude = {
  variants: true,
  images:      { orderBy: { order: "asc" } },
  features:    { orderBy: { order: "asc" } },
  composition: true,
  care:        { orderBy: { order: "asc" } },
  categories:  { include: { category: true } },
};

// GET /api/products
router.get("/", async (req, res) => {
  const { category } = req.query;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(category && {
        categories: { some: { category: { slug: category } } },
      }),
    },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });

  res.json(products);
});

// GET /api/products/:slug
router.get("/:slug", async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: productInclude,
  });

  if (!product) return res.status(404).json({ error: "Producto no encontrado" });

  res.json(product);
});

export default router;

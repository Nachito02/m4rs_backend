import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

const productInclude = {
  variants: true,
  images:      { orderBy: { order: "asc" } },
  features:    { orderBy: { order: "asc" } },
  composition: true,
  care:        { orderBy: { order: "asc" } },
  categories:  { include: { category: true } },
};

// GET /api/products
router.get("/", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug
router.get("/:slug", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug, isActive: true },
      include: productInclude,
    });

    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    res.json(product);
  } catch (err) {
    next(err);
  }
});

export default router;

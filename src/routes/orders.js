import { Router } from "express";
import prisma from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/orders — guarda la orden antes de redirigir a WhatsApp
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const { contact, items, subtotal, shipping, total, notes } = req.body;

    if (!contact || !items?.length) {
      return res.status(400).json({ error: "Datos de orden incompletos" });
    }

    const order = await prisma.order.create({
      data: {
        userId:      req.user.id,
        status:      "IN_PREPARATION",
        subtotal:    Math.round(subtotal),
        shippingCost: Math.round(shipping),
        total:       Math.round(total),
        notes:       notes || null,
        firstName:   contact.firstName,
        lastName:    contact.lastName,
        email:       contact.email,
        phone:       contact.phone,
        address:     contact.address,
        items: {
          create: items.map((item) => ({
            name:       item.title,
            size:       item.size ?? null,
            quantity:   item.quantity ?? 1,
            unitPrice:  Math.round(item.unitPrice),
            totalPrice: Math.round(item.unitPrice * (item.quantity ?? 1)),
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
});

// GET /api/orders — órdenes del usuario autenticado
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
});

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = Router();

const userSelect = {
  id: true, name: true, firstName: true, lastName: true,
  email: true, role: true, phone: true, address: true, createdAt: true,
};

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: userSelect,
    });
    if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/me
router.put("/me", requireAuth, async (req, res, next) => {
  try {
    const { firstName, lastName, phone, address } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName  !== undefined && { lastName }),
        ...(phone     !== undefined && { phone }),
        ...(address   !== undefined && { address }),
        ...(firstName !== undefined && lastName !== undefined && {
          name: `${firstName} ${lastName}`.trim(),
        }),
      },
      select: userSelect,
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;

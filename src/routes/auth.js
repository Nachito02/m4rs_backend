import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const router  = Router();
const prisma  = new PrismaClient();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
};

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// ── POST /api/auth/register ───────────────────────────────
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "El email ya está registrado" });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user   = await prisma.user.create({
    data: { firstName, lastName, email, password: hashed },
  });

  const token = signToken(user);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.status(201).json({ user: safeUser(user) });
});

// ── POST /api/auth/login ──────────────────────────────────
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Credenciales incorrectas" });
  }

  const token = signToken(user);
  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({ user: safeUser(user) });
});

// ── POST /api/auth/logout ─────────────────────────────────
router.post("/logout", (_req, res) => {
  res.clearCookie("token", { httpOnly: true, sameSite: "lax" });
  res.json({ ok: true });
});

// ── GET /api/auth/me ──────────────────────────────────────
router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true, phone: true, address: true, createdAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  res.json({ user });
});

// ── PUT /api/auth/me ──────────────────────────────────────
router.put("/me", requireAuth, async (req, res) => {
  const { firstName, lastName, phone, address } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(firstName && { firstName }),
      ...(lastName  && { lastName }),
      ...(phone     !== undefined && { phone }),
      ...(address   !== undefined && { address }),
    },
    select: {
      id: true, firstName: true, lastName: true,
      email: true, role: true, phone: true, address: true, createdAt: true,
    },
  });

  res.json({ user });
});

export default router;

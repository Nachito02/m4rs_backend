import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { auth } from "./lib/auth.js";
import authRoutes    from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import paymentRoutes from "./routes/payments.js";
import adminRoutes   from "./routes/admin.js";
import orderRoutes   from "./routes/orders.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app  = express();
const PORT = process.env.PORT || 3000;

// Detrás de Nginx: confiar en el primer proxy para que req.ip sea la IP real
// del cliente (necesario para que express-rate-limit funcione por usuario).
app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Rate limit estricto solo en rutas de auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos. Intentá de nuevo en 15 minutos." },
});
app.use("/api/auth/sign-in", authLimiter);
app.use("/api/auth/sign-up", authLimiter);

// Better Auth maneja sus propias rutas en /api/auth/*
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());

app.use("/images", express.static(join(__dirname, "../public/images")));

app.use("/api/auth",     authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/orders",   orderRoutes);

// Error handler global
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

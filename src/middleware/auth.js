import { auth } from "../lib/auth.js";

export async function requireAuth(req, res, next) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autenticado" });
  req.user = session.user;
  req.session = session.session;
  next();
}

export async function requireAdmin(req, res, next) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return res.status(401).json({ error: "No autenticado" });
  if (session.user.role !== "ADMIN") return res.status(403).json({ error: "Acceso denegado" });
  req.user = session.user;
  req.session = session.session;
  next();
}

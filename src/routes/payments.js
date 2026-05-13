import { Router } from "express";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { requireAuth } from "../middleware/auth.js";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const router = Router();

// Crea preferencia para el Payment Brick (wallet + otras opciones)
router.post("/preference", requireAuth, async (req, res) => {
  try {
    const { items, payer } = req.body;
    const backUrl = `${process.env.FRONTEND_URL}/pago`;

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        purpose: "wallet_purchase",
        items: items.map((i) => ({
          id:          String(i.id),
          title:       i.title,
          quantity:    Number(i.quantity ?? 1),
          unit_price:  Number(i.price),
          currency_id: "ARS",
        })),
        payer: {
          email:   payer.email,
          name:    payer.firstName ?? "",
          surname: payer.lastName  ?? "",
        },
        back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
      },
    });

    res.status(201).json({ preferenceId: result.id });
  } catch (err) {
    console.error("[preference error]", JSON.stringify(err, null, 2));
    res.status(500).json({ error: err?.message ?? "Error al crear la preferencia" });
  }
});

// Procesa pago con tarjeta (token del brick)
router.post("/process", requireAuth, (req, res) => {
  const payment = new Payment(client);
  payment
    .create({ body: req.body })
    .then(({ status, status_detail, id }) => {
      if (status === "approved" || status === "in_process" || status === "pending") {
        return res.status(201).json({ status, detail: status_detail, id });
      }
      res.status(400).json({ error: "Pago rechazado", status, detail: status_detail });
    })
    .catch((err) => {
      console.error("[process error]", JSON.stringify(err, null, 2));
      const msg = err?.cause?.[0]?.description ?? err?.message ?? "Error al procesar el pago";
      res.status(500).json({ error: msg });
    });
});

export default router;

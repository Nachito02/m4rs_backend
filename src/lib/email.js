import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "M4RS <no-reply@m4rs.store>";

// Los clientes de correo no soportan CSS variables ni clases: todo va inline.
// Paleta fija en modo oscuro para mantener la identidad de la marca.
const COLORS = {
  bg:     "#0a0a0a",
  panel:  "#111111",
  text:   "#f5f5f5",
  soft:   "#8a8a8a",
  border: "#2a2a2a",
};

function resetPasswordTemplate({ name, url }) {
  const greeting = name ? `Hola ${name},` : "Hola,";

  return `<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background:${COLORS.bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      Restablecé tu contraseña de M4RS. El enlace vence en 1 hora.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.bg};padding:48px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${COLORS.panel};border:1px solid ${COLORS.border};">
            <tr>
              <td style="padding:40px 40px 0 40px;text-align:center;">
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.5em;text-transform:uppercase;color:${COLORS.text};">
                  M4RS
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 0 40px;">
                <div style="height:1px;background:${COLORS.border};line-height:1px;font-size:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 0 40px;">
                <p style="margin:0 0 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:10px;font-weight:600;letter-spacing:0.35em;text-transform:uppercase;color:${COLORS.soft};">
                  Seguridad
                </p>
                <h1 style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:22px;font-weight:300;letter-spacing:0.02em;color:${COLORS.text};">
                  Restablecé tu contraseña
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 0 40px;">
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:${COLORS.soft};">
                  ${greeting} recibimos un pedido para restablecer la contraseña de tu cuenta.
                  Hacé clic en el botón para elegir una nueva.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 0 40px;">
                <a href="${url}"
                   style="display:block;padding:16px 24px;background:${COLORS.text};color:${COLORS.bg};font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;text-align:center;text-decoration:none;">
                  Crear nueva contraseña
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 0 40px;">
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.7;color:${COLORS.soft};">
                  El enlace vence en 1 hora y sirve una sola vez.
                  Si no pediste esto, ignorá el mensaje: tu contraseña no cambia.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 40px 0 40px;">
                <div style="height:1px;background:${COLORS.border};line-height:1px;font-size:0;">&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 40px 40px;">
                <p style="margin:0 0 8px 0;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${COLORS.soft};">
                  ¿No funciona el botón?
                </p>
                <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;word-break:break-all;color:${COLORS.soft};">
                  ${url}
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0 0;font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.3em;text-transform:uppercase;color:${COLORS.soft};">
            M4RS
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function resetPasswordText({ name, url }) {
  const greeting = name ? `Hola ${name},` : "Hola,";
  return [
    "M4RS",
    "",
    `${greeting} recibimos un pedido para restablecer la contraseña de tu cuenta.`,
    "",
    "Abrí este enlace para elegir una nueva:",
    url,
    "",
    "El enlace vence en 1 hora y sirve una sola vez.",
    "Si no pediste esto, ignorá el mensaje: tu contraseña no cambia.",
  ].join("\n");
}

export async function sendResetPasswordEmail({ to, name, url }) {
  if (!resend) {
    // Sin API key (dev): el link va al log para poder probar el flujo.
    console.warn(`[email] RESEND_API_KEY ausente. Link de reset para ${to}:\n${url}`);
    return;
  }

  const { error } = await resend.emails.send({
    from:    FROM,
    to,
    subject: "Restablecé tu contraseña — M4RS",
    html:    resetPasswordTemplate({ name, url }),
    text:    resetPasswordText({ name, url }),
  });

  if (error) throw new Error(`Resend: ${error.message ?? "fallo al enviar"}`);
}

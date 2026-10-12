package mail

import (
	"fmt"
	"html"
)

func VerifyEmail(to, appURL, link string) Message {
	return build(to, appURL,
		"Confirma tu email en Fluently",
		"Confirma tu email",
		"Gracias por registrarte en Fluently. Para activar tu cuenta, confirma tu email con este enlace (caduca en 48 horas):",
		"Confirmar email",
		link,
		"Si no te has registrado en Fluently, ignora este mensaje.",
	)
}

func ResetPassword(to, appURL, link string) Message {
	return build(to, appURL,
		"Restablece tu contraseña de Fluently",
		"Restablece tu contraseña",
		"Hemos recibido una solicitud para cambiar la contraseña de tu cuenta de Fluently. Usa este enlace para elegir una nueva (caduca en 1 hora):",
		"Cambiar contraseña",
		link,
		"Si no lo has pedido tú, ignora este mensaje: tu contraseña no cambiará.",
	)
}

// appURL is the site the logo is loaded from: mail clients need an absolute URL, and a PNG (Gmail drops SVG).
func build(to, appURL, subject, heading, intro, button, link, footer string) Message {
	text := fmt.Sprintf("%s\n\n%s\n\n%s\n\n%s\n", heading, intro, link, footer)
	h := html.EscapeString
	body := fmt.Sprintf(`<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a">
<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px">
<p style="margin:0 0 24px;font-weight:700;font-size:18px;line-height:32px;color:#4f46e5"><img src="%s/icon-192.png" width="32" height="32" alt="" style="vertical-align:middle;margin-right:8px;border:0">Fluently</p>
<h1 style="margin:0 0 12px;font-size:22px">%s</h1>
<p style="margin:0 0 24px;line-height:1.5;color:#334155">%s</p>
<p style="margin:0 0 24px"><a href="%s" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">%s</a></p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#64748b;word-break:break-all">Si el botón no funciona, copia este enlace en tu navegador:<br>%s</p>
<p style="margin:0;font-size:13px;color:#64748b">%s</p>
</div></body></html>`, h(appURL), h(heading), h(intro), h(link), h(button), h(link), h(footer))
	return Message{To: to, Subject: subject, Text: text, HTML: body}
}

package com.calendary.mail.application

private const val BRAND_COLOR = "#f0671c"
private const val TEXT_COLOR = "#1f2430"
private const val MUTED_COLOR = "#6b7280"
private const val BACKGROUND_COLOR = "#f4f1ec"
private const val CARD_COLOR = "#ffffff"
private const val BORDER_COLOR = "#e5e0d8"

/** Renders the plain-text body of a [SendMailCommand] as a small branded HTML email. */
object MailTemplate {
	fun render(subject: String, body: String, actionLabel: String?, actionUrl: String?, publicBaseUrl: String): String {
		val paragraphs = body.trim()
			.split(Regex("\\n\\s*\\n"))
			.filter { it.isNotBlank() }
			.joinToString("") { paragraph ->
				"<p style=\"margin:0 0 16px;font-size:15px;line-height:1.6;color:$TEXT_COLOR;\">" +
					escapeHtml(paragraph.trim()).replace("\n", "<br/>") +
					"</p>"
			}

		val button = if (!actionLabel.isNullOrBlank() && !actionUrl.isNullOrBlank()) {
			"""
			<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
				<tr>
					<td style="border-radius:8px;background-color:$BRAND_COLOR;">
						<a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(actionLabel)}</a>
					</td>
				</tr>
			</table>
			"""
		} else {
			""
		}

		return """
			<!doctype html>
			<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>${escapeHtml(subject)}</title>
			</head>
			<body style="margin:0;padding:24px;background-color:$BACKGROUND_COLOR;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
				<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
					<tr>
						<td align="center">
							<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;background-color:$CARD_COLOR;border:1px solid $BORDER_COLOR;border-radius:12px;overflow:hidden;">
								<tr>
									<td style="padding:24px 32px 0;">
										<div style="font-size:20px;font-weight:700;color:$BRAND_COLOR;">Calendary</div>
									</td>
								</tr>
								<tr>
									<td style="padding:20px 32px 8px;">
										<h1 style="margin:0 0 16px;font-size:18px;font-weight:600;color:$TEXT_COLOR;">${escapeHtml(subject)}</h1>
										$paragraphs
										$button
									</td>
								</tr>
								<tr>
									<td style="padding:16px 32px 24px;border-top:1px solid $BORDER_COLOR;">
										<p style="margin:0;font-size:12px;color:$MUTED_COLOR;">Sent by Calendary &middot; <a href="${escapeHtml(publicBaseUrl)}" style="color:$MUTED_COLOR;">${escapeHtml(publicBaseUrl)}</a></p>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</body>
			</html>
		""".trimIndent()
	}

	private fun escapeHtml(value: String): String = value
		.replace("&", "&amp;")
		.replace("<", "&lt;")
		.replace(">", "&gt;")
		.replace("\"", "&quot;")
		.replace("'", "&#39;")
}

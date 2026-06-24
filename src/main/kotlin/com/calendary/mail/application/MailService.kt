package com.calendary.mail.application

import com.calendary.mail.config.MailProperties
import org.slf4j.LoggerFactory
import org.springframework.core.env.Environment
import org.springframework.mail.MailException
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.mail.javamail.MimeMessageHelper
import org.springframework.stereotype.Service

@Service
class MailService(
	private val mailSender: JavaMailSender?,
	private val appMail: MailProperties,
	private val environment: Environment,
) {
	private val logger = LoggerFactory.getLogger(MailService::class.java)

	fun send(command: SendMailCommand) {
		val sender = mailSender
		if (environment.getProperty("spring.mail.host").isNullOrBlank() || appMail.from.isBlank() || sender == null) {
			logger.info("Mail skipped because SMTP is not configured. to={} subject={}", command.to, command.subject)
			return
		}

		val message = sender.createMimeMessage()
		val helper = MimeMessageHelper(message, true, "UTF-8")
		helper.setFrom(appMail.from)
		if (appMail.replyTo.isNotBlank()) {
			helper.setReplyTo(appMail.replyTo)
		}
		helper.setTo(command.to)
		helper.setSubject(command.subject)
		helper.setText(
			command.body,
			MailTemplate.render(command.subject, command.body, command.actionLabel, command.actionUrl, appMail.publicBaseUrl),
		)

		try {
			sender.send(message)
		} catch (error: MailException) {
			logger.warn("Mail delivery failed. to={} subject={}", command.to, command.subject, error)
		}
	}
}

data class SendMailCommand(
	val to: String,
	val subject: String,
	val body: String,
	val actionLabel: String? = null,
	val actionUrl: String? = null,
)

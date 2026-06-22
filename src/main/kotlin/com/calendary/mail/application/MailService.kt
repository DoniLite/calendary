package com.calendary.mail.application

import com.calendary.mail.config.MailProperties
import org.slf4j.LoggerFactory
import org.springframework.core.env.Environment
import org.springframework.mail.MailException
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSender
import org.springframework.stereotype.Service

@Service
class MailService(
	private val mailSender: JavaMailSender?,
	private val appMail: MailProperties,
	private val environment: Environment,
) {
	private val logger = LoggerFactory.getLogger(MailService::class.java)

	fun send(command: SendMailCommand) {
		if (environment.getProperty("spring.mail.host").isNullOrBlank() || appMail.from.isBlank()) {
			logger.info("Mail skipped because SMTP is not configured. to={} subject={}", command.to, command.subject)
			return
		}

		val message = SimpleMailMessage()
		message.from = appMail.from
		if (appMail.replyTo.isNotBlank()) {
			message.replyTo = appMail.replyTo
		}
		message.setTo(command.to)
		message.subject = command.subject
		message.text = command.body

		try {
			mailSender?.send(message)
		} catch (error: MailException) {
			logger.warn("Mail delivery failed. to={} subject={}", command.to, command.subject, error)
		}
	}
}

data class SendMailCommand(
	val to: String,
	val subject: String,
	val body: String,
)

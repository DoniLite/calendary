package com.calendary.mail.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.mail")
data class MailProperties(
	val from: String = "",
	val replyTo: String = "",
	val publicBaseUrl: String = "http://localhost:8080",
)

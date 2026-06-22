package com.calendary.conferencing.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.google.calendar")
data class GoogleCalendarProperties(
	val enabled: Boolean = false,
	val calendarId: String = "",
	val serviceAccountEmail: String = "",
	val privateKey: String = "",
	val tokenUri: String = "https://oauth2.googleapis.com/token",
	val apiBaseUrl: String = "https://www.googleapis.com/calendar/v3",
)

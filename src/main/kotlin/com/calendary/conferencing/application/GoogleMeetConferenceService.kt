package com.calendary.conferencing.application

import com.calendary.conferencing.config.GoogleCalendarProperties
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.PKCS8EncodedKeySpec
import java.time.Instant
import java.util.Base64
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service

@Service
@ConditionalOnProperty(prefix = "app.google.calendar", name = ["enabled"], havingValue = "true")
class GoogleMeetConferenceService(
	private val properties: GoogleCalendarProperties,
) : ConferenceService {
	private val http = HttpClient.newHttpClient()

	override fun createMeeting(command: CreateConferenceCommand): ConferenceResult {
		require(properties.calendarId.isNotBlank()) { "Google calendar id is required." }
		require(properties.serviceAccountEmail.isNotBlank()) { "Google service account email is required." }
		require(properties.privateKey.isNotBlank()) { "Google service account private key is required." }

		val accessToken = requestAccessToken()
		val calendarId = encode(properties.calendarId)
		val request = HttpRequest.newBuilder(
			URI.create("${properties.apiBaseUrl}/calendars/$calendarId/events?conferenceDataVersion=1&sendUpdates=all"),
		)
			.header("Authorization", "Bearer $accessToken")
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(command.toGoogleEventJson()))
			.build()
		val response = http.send(request, HttpResponse.BodyHandlers.ofString())
		check(response.statusCode() in 200..299) { "Google Calendar event creation failed with status ${response.statusCode()}." }
		val body = response.body()
		val conferenceUrl = extractJsonString(body, "hangoutLink")
			?: extractEntryPointUri(body)
			?: error("Google Calendar response did not include a Meet link.")
		return ConferenceResult(
			url = conferenceUrl,
			externalCalendarEventId = extractJsonString(body, "id"),
		)
	}

	private fun requestAccessToken(): String {
		val now = Instant.now().epochSecond
		val header = """{"alg":"RS256","typ":"JWT"}"""
		val claim = """
			{"iss":"${properties.serviceAccountEmail}","scope":"https://www.googleapis.com/auth/calendar.events","aud":"${properties.tokenUri}","iat":$now,"exp":${now + 3600}}
		""".trimIndent()
		val unsignedJwt = "${base64Url(header.toByteArray())}.${base64Url(claim.toByteArray())}"
		val jwt = "$unsignedJwt.${sign(unsignedJwt)}"
		val form = "grant_type=${encode("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encode(jwt)}"
		val request = HttpRequest.newBuilder(URI.create(properties.tokenUri))
			.header("Content-Type", "application/x-www-form-urlencoded")
			.POST(HttpRequest.BodyPublishers.ofString(form))
			.build()
		val response = http.send(request, HttpResponse.BodyHandlers.ofString())
		check(response.statusCode() in 200..299) { "Google OAuth token request failed with status ${response.statusCode()}." }
		return extractJsonString(response.body(), "access_token")
			?: error("Google OAuth response did not include access_token.")
	}

	private fun CreateConferenceCommand.toGoogleEventJson(): String =
		"""
		{
		  "summary": "${json(title)}",
		  "description": "${json(description)}",
		  "start": {"dateTime": "$startsAt", "timeZone": "${json(timezone)}"},
		  "end": {"dateTime": "$endsAt", "timeZone": "${json(timezone)}"},
		  "attendees": [{"email": "${json(attendeeEmail)}"}],
		  "conferenceData": {
		    "createRequest": {
		      "requestId": "$requestId",
		      "conferenceSolutionKey": {"type": "hangoutsMeet"}
		    }
		  }
		}
		""".trimIndent()

	private fun sign(unsignedJwt: String): String {
		val keyBytes = properties.privateKey
			.replace("\\n", "\n")
			.replace("-----BEGIN PRIVATE KEY-----", "")
			.replace("-----END PRIVATE KEY-----", "")
			.replace(Regex("\\s"), "")
			.let { Base64.getDecoder().decode(it) }
		val privateKey = KeyFactory.getInstance("RSA").generatePrivate(PKCS8EncodedKeySpec(keyBytes))
		val signature = Signature.getInstance("SHA256withRSA")
		signature.initSign(privateKey)
		signature.update(unsignedJwt.toByteArray(StandardCharsets.UTF_8))
		return base64Url(signature.sign())
	}

	private fun extractEntryPointUri(json: String): String? {
		val videoEntry = Regex(""""entryPointType"\s*:\s*"video"[\s\S]*?"uri"\s*:\s*"([^"]+)"""")
		return videoEntry.find(json)?.groupValues?.get(1)
	}

	private fun extractJsonString(json: String, field: String): String? {
		val regex = Regex(""""$field"\s*:\s*"([^"]*)"""")
		return regex.find(json)?.groupValues?.get(1)
	}

	private fun json(value: String): String =
		value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")

	private fun encode(value: String): String =
		URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20")

	private fun base64Url(bytes: ByteArray): String =
		Base64.getUrlEncoder().withoutPadding().encodeToString(bytes)
}

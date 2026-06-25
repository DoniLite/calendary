package com.calendary.storage.application

import com.calendary.storage.config.B2StorageProperties
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Base64
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service

@Service
@ConditionalOnProperty(prefix = "app.storage.b2", name = ["enabled"], havingValue = "true")
class B2ObjectStorageService(
	private val properties: B2StorageProperties,
) : ObjectStorageService {
	private val http = HttpClient.newHttpClient()

	override fun upload(command: UploadObjectCommand): StoredObject {
		require(properties.keyId.isNotBlank()) { "B2 key id is required." }
		require(properties.applicationKey.isNotBlank()) { "B2 application key is required." }
		require(properties.bucketId.isNotBlank()) { "B2 bucket id is required." }

		val auth = authorize()
		val uploadTarget = getUploadUrl(auth)
		val encodedName = encodePath(command.key)
		val request = HttpRequest.newBuilder(URI.create(uploadTarget.uploadUrl))
			.header("Authorization", uploadTarget.authorizationToken)
			.header("X-Bz-File-Name", encodedName)
			.header("Content-Type", command.contentType)
			.header("X-Bz-Content-Sha1", sha1(command.bytes))
			.POST(HttpRequest.BodyPublishers.ofByteArray(command.bytes))
			.build()
		val response = http.send(request, HttpResponse.BodyHandlers.ofString())
		check(response.statusCode() in 200..299) { "B2 upload failed with status ${response.statusCode()}." }
		return StoredObject(key = command.key)
	}

	override fun downloadUrl(key: String, originalFilename: String, contentType: String): String {
		// Without b2ContentDisposition/b2ContentType overrides, B2 still serves the file, but
		// some browsers/OSes fall back to guessing the type from the storage key alone — a bare
		// UUID with no extension — and land on a generic "unknown file" handler instead of
		// downloading it as the real PDF/image. The override must be requested in
		// b2_get_download_authorization AND repeated verbatim as a query parameter on the final
		// URL, or B2 rejects it.
		val disposition = "attachment; filename=\"${sanitizeHeaderValue(originalFilename)}\""
		return signedDownloadUrl(key, mapOf("b2ContentDisposition" to disposition, "b2ContentType" to contentType))
	}

	override fun inlineUrl(key: String): String = signedDownloadUrl(key, emptyMap())

	private fun signedDownloadUrl(key: String, overrides: Map<String, String>): String {
		require(properties.bucketName.isNotBlank()) { "B2 bucket name is required." }
		val auth = authorize()
		val prefix = key.substringBeforeLast('/', missingDelimiterValue = key)
		val overrideFields = overrides.entries.joinToString("") { (field, value) -> ""","$field":"${escapeJson(value)}"""" }
		val body = """{"bucketId":"${properties.bucketId}","fileNamePrefix":"$prefix","validDurationInSeconds":${properties.downloadTtlSeconds}$overrideFields}"""
		val request = HttpRequest.newBuilder(URI.create("${auth.apiUrl}/b2api/v2/b2_get_download_authorization"))
			.header("Authorization", auth.authorizationToken)
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(body))
			.build()
		val response = http.send(request, HttpResponse.BodyHandlers.ofString())
		check(response.statusCode() in 200..299) { "B2 download authorization failed with status ${response.statusCode()}." }
		val token = extractJsonString(response.body(), "authorizationToken")
		val overrideParams = overrides.entries.joinToString("") { (field, value) -> "&$field=${URLEncoder.encode(value, StandardCharsets.UTF_8)}" }
		return "${auth.downloadUrl}/file/${properties.bucketName}/${encodePath(key)}?Authorization=$token$overrideParams"
	}

	private fun authorize(): B2Authorization {
		val credentials = Base64.getEncoder()
			.encodeToString("${properties.keyId}:${properties.applicationKey}".toByteArray(StandardCharsets.UTF_8))
		val request = HttpRequest.newBuilder(URI.create("https://api.backblazeb2.com/b2api/v2/b2_authorize_account"))
			.header("Authorization", "Basic $credentials")
			.GET()
			.build()
		val response = http.send(request, HttpResponse.BodyHandlers.ofString())
		check(response.statusCode() in 200..299) { "B2 authorization failed with status ${response.statusCode()}." }
		return B2Authorization(
			apiUrl = extractJsonString(response.body(), "apiUrl"),
			downloadUrl = extractJsonString(response.body(), "downloadUrl"),
			authorizationToken = extractJsonString(response.body(), "authorizationToken"),
		)
	}

	private fun getUploadUrl(auth: B2Authorization): B2UploadTarget {
		val body = """{"bucketId":"${properties.bucketId}"}"""
		val request = HttpRequest.newBuilder(URI.create("${auth.apiUrl}/b2api/v2/b2_get_upload_url"))
			.header("Authorization", auth.authorizationToken)
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(body))
			.build()
		val response = http.send(request, HttpResponse.BodyHandlers.ofString())
		check(response.statusCode() in 200..299) { "B2 upload url failed with status ${response.statusCode()}." }
		return B2UploadTarget(
			uploadUrl = extractJsonString(response.body(), "uploadUrl"),
			authorizationToken = extractJsonString(response.body(), "authorizationToken"),
		)
	}

	private fun extractJsonString(json: String, field: String): String {
		val regex = Regex(""""$field"\s*:\s*"([^"]*)"""")
		return regex.find(json)?.groupValues?.get(1)
			?: error("B2 response is missing field $field.")
	}

	private fun encodePath(value: String): String =
		value.split("/").joinToString("/") { URLEncoder.encode(it, StandardCharsets.UTF_8).replace("+", "%20") }

	// Drops characters that would either break out of the JSON string or let a crafted filename
	// inject extra header lines into the Content-Disposition response header.
	private fun sanitizeHeaderValue(value: String): String =
		value.replace(Regex("[\r\n\"]"), "_")

	private fun escapeJson(value: String): String =
		value.replace("\\", "\\\\").replace("\"", "\\\"")

	private fun sha1(bytes: ByteArray): String =
		MessageDigest.getInstance("SHA-1").digest(bytes).joinToString("") { "%02x".format(it) }
}

private data class B2Authorization(
	val apiUrl: String,
	val downloadUrl: String,
	val authorizationToken: String,
)

private data class B2UploadTarget(
	val uploadUrl: String,
	val authorizationToken: String,
)

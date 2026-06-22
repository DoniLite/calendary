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

	override fun downloadUrl(key: String): String {
		require(properties.bucketName.isNotBlank()) { "B2 bucket name is required." }
		val auth = authorize()
		val prefix = key.substringBeforeLast('/', missingDelimiterValue = key)
		val body = """{"bucketId":"${properties.bucketId}","fileNamePrefix":"$prefix","validDurationInSeconds":${properties.downloadTtlSeconds}}"""
		val request = HttpRequest.newBuilder(URI.create("${auth.apiUrl}/b2api/v2/b2_get_download_authorization"))
			.header("Authorization", auth.authorizationToken)
			.header("Content-Type", "application/json")
			.POST(HttpRequest.BodyPublishers.ofString(body))
			.build()
		val response = http.send(request, HttpResponse.BodyHandlers.ofString())
		check(response.statusCode() in 200..299) { "B2 download authorization failed with status ${response.statusCode()}." }
		val token = extractJsonString(response.body(), "authorizationToken")
		return "${auth.downloadUrl}/file/${properties.bucketName}/${encodePath(key)}?Authorization=$token"
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

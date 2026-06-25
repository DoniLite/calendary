package com.calendary.storage.application

interface ObjectStorageService {
	fun upload(command: UploadObjectCommand): StoredObject

	// originalFilename/contentType let the implementation force the browser to download the
	// file under its real name/type instead of guessing from the storage key (a bare UUID with
	// no extension), which is what made browsers fall back to an "unknown file" handler.
	fun downloadUrl(key: String, originalFilename: String, contentType: String): String

	// For content meant to be rendered in place (e.g. an <img> tag) rather than saved to disk —
	// no Content-Disposition override, relying on the Content-Type already set at upload time.
	fun inlineUrl(key: String): String
}

data class UploadObjectCommand(
	val key: String,
	val contentType: String,
	val bytes: ByteArray,
)

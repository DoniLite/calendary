package com.calendary.storage.application

interface ObjectStorageService {
	fun upload(command: UploadObjectCommand): StoredObject

	fun downloadUrl(key: String): String
}

data class UploadObjectCommand(
	val key: String,
	val contentType: String,
	val bytes: ByteArray,
)

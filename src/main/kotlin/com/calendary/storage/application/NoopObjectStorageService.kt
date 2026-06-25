package com.calendary.storage.application

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service

@Service
@ConditionalOnProperty(prefix = "app.storage.b2", name = ["enabled"], havingValue = "false", matchIfMissing = true)
class NoopObjectStorageService : ObjectStorageService {
	override fun upload(command: UploadObjectCommand): StoredObject =
		StoredObject(key = command.key)

	override fun downloadUrl(key: String, originalFilename: String, contentType: String): String =
		"b2-disabled://$key"

	override fun inlineUrl(key: String): String =
		"b2-disabled://$key"
}

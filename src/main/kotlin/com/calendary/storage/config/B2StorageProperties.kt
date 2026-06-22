package com.calendary.storage.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "app.storage.b2")
data class B2StorageProperties(
	val enabled: Boolean = false,
	val keyId: String = "",
	val applicationKey: String = "",
	val bucketId: String = "",
	val bucketName: String = "",
	val downloadTtlSeconds: Long = 900,
)

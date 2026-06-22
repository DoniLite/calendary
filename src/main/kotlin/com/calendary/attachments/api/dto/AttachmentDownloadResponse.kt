package com.calendary.attachments.api.dto

data class AttachmentDownloadResponse(
	val attachment: AttachmentResponse,
	val url: String,
)

package com.calendary.attachments.api.dto

import com.calendary.attachments.domain.Attachment
import com.calendary.resources.domain.ResourceType
import java.time.Instant
import java.util.UUID

data class AttachmentResponse(
	val id: UUID,
	val resourceType: ResourceType,
	val resourceId: UUID,
	val originalFilename: String,
	val contentType: String,
	val sizeBytes: Long,
	val checksumSha256: String?,
	val createdAt: Instant,
)

fun Attachment.toResponse(): AttachmentResponse =
	AttachmentResponse(
		id = id,
		resourceType = resourceType,
		resourceId = resourceId,
		originalFilename = originalFilename,
		contentType = contentType,
		sizeBytes = sizeBytes,
		checksumSha256 = checksumSha256,
		createdAt = createdAt,
	)

package com.calendary.attachments.application

import com.calendary.attachments.domain.Attachment
import com.calendary.attachments.infra.AttachmentRepository
import com.calendary.resources.application.ResourceAccessService
import com.calendary.resources.domain.ResourceType
import com.calendary.storage.application.ObjectStorageService
import com.calendary.storage.application.UploadObjectCommand
import com.calendary.users.infra.UserAccountRepository
import java.security.MessageDigest
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AttachmentService(
	private val attachments: AttachmentRepository,
	private val users: UserAccountRepository,
	private val resources: ResourceAccessService,
	private val storage: ObjectStorageService,
) {
	@Transactional
	fun upload(command: UploadAttachmentCommand): Attachment {
		require(command.originalFilename.isNotBlank()) { "Attachment filename is required." }
		require(command.bytes.isNotEmpty()) { "Attachment file is empty." }
		require(command.contentType in allowedContentTypes) { "Only PDF and image attachments are supported." }

		val workspace = resources.requireWrite(command.resourceType, command.resourceId, command.userId)
		val uploader = users.findById(command.userId).orElseThrow { IllegalArgumentException("User not found.") }
		val key = "workspaces/${workspace.id}/${command.resourceType.name.lowercase()}/${command.resourceId}/${UUID.randomUUID()}-${sanitize(command.originalFilename)}"
		val stored = storage.upload(
			UploadObjectCommand(
				key = key,
				contentType = command.contentType,
				bytes = command.bytes,
			),
		)
		return attachments.save(
			Attachment(
				workspace = workspace,
				uploadedBy = uploader,
				resourceType = command.resourceType,
				resourceId = command.resourceId,
				originalFilename = command.originalFilename,
				contentType = command.contentType,
				sizeBytes = command.bytes.size.toLong(),
				storageKey = stored.key,
				checksumSha256 = sha256(command.bytes),
			),
		)
	}

	@Transactional(readOnly = true)
	fun list(resourceType: ResourceType, resourceId: UUID, userId: UUID): List<Attachment> {
		resources.requireRead(resourceType, resourceId, userId)
		return attachments.findByResourceTypeAndResourceIdOrderByCreatedAtDesc(resourceType, resourceId)
	}

	@Transactional(readOnly = true)
	fun download(resourceType: ResourceType, resourceId: UUID, attachmentId: UUID, userId: UUID): AttachmentDownload {
		resources.requireRead(resourceType, resourceId, userId)
		val attachment = attachments.findByIdAndResourceTypeAndResourceId(attachmentId, resourceType, resourceId)
			.orElseThrow { IllegalArgumentException("Attachment not found.") }
		return AttachmentDownload(
			attachment = attachment,
			url = storage.downloadUrl(attachment.storageKey),
		)
	}

	private fun sanitize(filename: String): String =
		filename.trim().replace(Regex("[^A-Za-z0-9._-]"), "_").take(180)

	private fun sha256(bytes: ByteArray): String =
		MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }

	companion object {
		private val allowedContentTypes = setOf(
			"application/pdf",
			"image/png",
			"image/jpeg",
			"image/gif",
			"image/webp",
		)
	}
}

data class UploadAttachmentCommand(
	val resourceType: ResourceType,
	val resourceId: UUID,
	val userId: UUID,
	val originalFilename: String,
	val contentType: String,
	val bytes: ByteArray,
)

data class AttachmentDownload(
	val attachment: Attachment,
	val url: String,
)

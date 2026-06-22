package com.calendary.attachments.api

import com.calendary.attachments.api.dto.AttachmentDownloadResponse
import com.calendary.attachments.api.dto.AttachmentListResponse
import com.calendary.attachments.api.dto.AttachmentResponse
import com.calendary.attachments.api.dto.toResponse
import com.calendary.attachments.application.AttachmentService
import com.calendary.attachments.application.UploadAttachmentCommand
import com.calendary.auth.application.AuthSessionService
import com.calendary.resources.domain.ResourceType
import jakarta.servlet.http.HttpServletRequest
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/resources/{resourceType}/{resourceId}/attachments")
class AttachmentController(
	private val sessions: AuthSessionService,
	private val attachments: AttachmentService,
) {
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	fun upload(
		@PathVariable resourceType: ResourceType,
		@PathVariable resourceId: UUID,
		@RequestParam("file") file: MultipartFile,
		httpRequest: HttpServletRequest,
	): AttachmentResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return attachments.upload(
			UploadAttachmentCommand(
				resourceType = resourceType,
				resourceId = resourceId,
				userId = currentUser.id,
				originalFilename = file.originalFilename ?: "attachment",
				contentType = file.contentType ?: "application/octet-stream",
				bytes = file.bytes,
			),
		).toResponse()
	}

	@GetMapping
	fun list(
		@PathVariable resourceType: ResourceType,
		@PathVariable resourceId: UUID,
		httpRequest: HttpServletRequest,
	): AttachmentListResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return attachments.list(resourceType, resourceId, currentUser.id).toResponse()
	}

	@GetMapping("/{id}/download-url")
	fun downloadUrl(
		@PathVariable resourceType: ResourceType,
		@PathVariable resourceId: UUID,
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	): AttachmentDownloadResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		val download = attachments.download(resourceType, resourceId, id, currentUser.id)
		return AttachmentDownloadResponse(
			attachment = download.attachment.toResponse(),
			url = download.url,
		)
	}
}

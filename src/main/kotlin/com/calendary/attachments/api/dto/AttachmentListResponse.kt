package com.calendary.attachments.api.dto

import com.calendary.attachments.domain.Attachment

data class AttachmentListResponse(
	val attachments: List<AttachmentResponse>,
)

fun List<Attachment>.toResponse(): AttachmentListResponse =
	AttachmentListResponse(map { it.toResponse() })

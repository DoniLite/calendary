package com.calendary.collaboration.api.dto

import com.calendary.collaboration.domain.ResourceShare
import com.calendary.collaboration.domain.ShareStatus
import com.calendary.resources.domain.ResourceType
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import java.time.Instant
import java.util.UUID

data class CollaborationResponse(
	val id: UUID,
	val resourceType: ResourceType,
	val resourceId: UUID,
	val ownerWorkspaceId: UUID,
	val requestedById: UUID,
	val requestedByEmail: String,
	val recipientId: UUID,
	val recipientEmail: String,
	val accessLevel: WorkspaceAccessLevel,
	val status: ShareStatus,
	val message: String,
	val decidedAt: Instant?,
)

fun ResourceShare.toResponse(): CollaborationResponse =
	CollaborationResponse(
		id = id,
		resourceType = resourceType,
		resourceId = resourceId,
		ownerWorkspaceId = ownerWorkspace?.id ?: error("Share has no owner workspace."),
		requestedById = requestedBy?.id ?: error("Share has no requester."),
		requestedByEmail = requestedBy?.email ?: error("Share has no requester."),
		recipientId = recipient?.id ?: error("Share has no recipient."),
		recipientEmail = recipient?.email ?: error("Share has no recipient."),
		accessLevel = accessLevel,
		status = status,
		message = message,
		decidedAt = decidedAt,
	)

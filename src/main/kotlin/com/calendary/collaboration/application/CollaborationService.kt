package com.calendary.collaboration.application

import com.calendary.collaboration.domain.ResourceShare
import com.calendary.collaboration.domain.ShareStatus
import com.calendary.collaboration.infra.ResourceShareRepository
import com.calendary.notifications.application.CreateNotificationCommand
import com.calendary.notifications.application.NotificationService
import com.calendary.notifications.domain.NotificationType
import com.calendary.resources.application.ResourceAccessService
import com.calendary.resources.domain.ResourceType
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CollaborationService(
	private val shares: ResourceShareRepository,
	private val users: UserAccountRepository,
	private val resourceAccess: ResourceAccessService,
	private val notifications: NotificationService,
) {
	@Transactional
	fun propose(command: ProposeCollaborationCommand): ResourceShare {
		require(command.recipientEmail.isNotBlank()) { "Recipient email is required." }
		require(command.accessLevel == WorkspaceAccessLevel.READ || command.accessLevel == WorkspaceAccessLevel.WRITE) {
			"Collaboration access must be READ or WRITE."
		}
		val ownerWorkspace = resourceAccess.requireRead(command.resourceType, command.resourceId, command.requestedById)
		val requestedBy = users.findById(command.requestedById).orElseThrow { IllegalArgumentException("Requester not found.") }
		val recipient = users.findByEmailIgnoreCase(command.recipientEmail.trim())
			.orElseThrow { IllegalArgumentException("Recipient not found.") }
		require(recipient.id != requestedBy.id) { "Cannot share a resource with yourself." }

		val share = shares.save(
			ResourceShare(
				resourceType = command.resourceType,
				resourceId = command.resourceId,
				ownerWorkspace = ownerWorkspace,
				requestedBy = requestedBy,
				recipient = recipient,
				accessLevel = command.accessLevel,
				status = ShareStatus.PENDING,
				message = command.message,
			),
		)
		notifications.notify(
			CreateNotificationCommand(
				recipientId = recipient.id,
				type = NotificationType.COLLABORATION_REQUESTED,
				title = "New collaboration request",
				body = "${requestedBy.email} wants to share a ${command.resourceType.name.lowercase()} with you.",
				resourceType = command.resourceType.name,
				resourceId = command.resourceId,
				actionUrl = "/collaborations/${share.id}",
			),
		)
		return share
	}

	@Transactional(readOnly = true)
	fun inbox(userId: UUID): List<ResourceShare> =
		shares.findByRecipientIdOrderByCreatedAtDesc(userId)

	@Transactional(readOnly = true)
	fun sent(userId: UUID): List<ResourceShare> =
		shares.findByRequestedByIdOrderByCreatedAtDesc(userId)

	@Transactional
	fun accept(shareId: UUID, userId: UUID): ResourceShare {
		val share = shares.findByIdAndRecipientId(shareId, userId)
			.orElseThrow { IllegalArgumentException("Collaboration request not found.") }
		require(share.status == ShareStatus.PENDING) { "Only pending collaboration requests can be accepted." }
		share.status = ShareStatus.ACCEPTED
		share.decidedAt = Instant.now()
		notifications.notify(
			CreateNotificationCommand(
				recipientId = share.requestedBy?.id ?: error("Share has no requester."),
				type = NotificationType.COLLABORATION_ACCEPTED,
				title = "Collaboration accepted",
				body = "${share.recipient?.email} accepted your collaboration request.",
				resourceType = share.resourceType.name,
				resourceId = share.resourceId,
				actionUrl = "/collaborations/${share.id}",
			),
		)
		return share
	}

	@Transactional
	fun reject(shareId: UUID, userId: UUID): ResourceShare {
		val share = shares.findByIdAndRecipientId(shareId, userId)
			.orElseThrow { IllegalArgumentException("Collaboration request not found.") }
		require(share.status == ShareStatus.PENDING) { "Only pending collaboration requests can be rejected." }
		share.status = ShareStatus.REJECTED
		share.decidedAt = Instant.now()
		notifications.notify(
			CreateNotificationCommand(
				recipientId = share.requestedBy?.id ?: error("Share has no requester."),
				type = NotificationType.COLLABORATION_REJECTED,
				title = "Collaboration rejected",
				body = "${share.recipient?.email} rejected your collaboration request.",
				resourceType = share.resourceType.name,
				resourceId = share.resourceId,
				actionUrl = "/collaborations/${share.id}",
			),
		)
		return share
	}
}

data class ProposeCollaborationCommand(
	val requestedById: UUID,
	val resourceType: ResourceType,
	val resourceId: UUID,
	val recipientEmail: String,
	val accessLevel: WorkspaceAccessLevel,
	val message: String = "",
)

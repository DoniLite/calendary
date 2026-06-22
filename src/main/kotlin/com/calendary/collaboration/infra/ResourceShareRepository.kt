package com.calendary.collaboration.infra

import com.calendary.collaboration.domain.ResourceShare
import com.calendary.collaboration.domain.ShareStatus
import com.calendary.resources.domain.ResourceType
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface ResourceShareRepository : JpaRepository<ResourceShare, UUID> {
	fun findByIdAndRecipientId(id: UUID, recipientId: UUID): Optional<ResourceShare>

	fun findByRecipientIdOrderByCreatedAtDesc(recipientId: UUID): List<ResourceShare>

	fun findByRequestedByIdOrderByCreatedAtDesc(requestedById: UUID): List<ResourceShare>

	fun existsByResourceTypeAndResourceIdAndRecipientIdAndStatus(
		resourceType: ResourceType,
		resourceId: UUID,
		recipientId: UUID,
		status: ShareStatus,
	): Boolean

	fun existsByResourceTypeAndResourceIdAndRecipientIdAndStatusAndAccessLevel(
		resourceType: ResourceType,
		resourceId: UUID,
		recipientId: UUID,
		status: ShareStatus,
		accessLevel: com.calendary.workspaces.domain.WorkspaceAccessLevel,
	): Boolean
}

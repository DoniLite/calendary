package com.calendary.attachments.infra

import com.calendary.attachments.domain.Attachment
import com.calendary.resources.domain.ResourceType
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface AttachmentRepository : JpaRepository<Attachment, UUID> {
	fun findByResourceTypeAndResourceIdOrderByCreatedAtDesc(resourceType: ResourceType, resourceId: UUID): List<Attachment>

	fun findByIdAndResourceTypeAndResourceId(id: UUID, resourceType: ResourceType, resourceId: UUID): Optional<Attachment>

	fun deleteByResourceTypeAndResourceId(resourceType: ResourceType, resourceId: UUID)

	fun deleteByResourceTypeAndResourceIdIn(resourceType: ResourceType, resourceIds: Collection<UUID>)
}

package com.calendary.workspaces.infra

import com.calendary.workspaces.domain.Workspace
import com.calendary.workspaces.domain.WorkspaceType
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface WorkspaceRepository : JpaRepository<Workspace, UUID> {
	fun countByOwnerId(ownerId: UUID): Long

	fun findFirstByOwnerIdAndType(ownerId: UUID, type: WorkspaceType): Optional<Workspace>

	fun findByPublicSlugIgnoreCase(publicSlug: String): Optional<Workspace>

	fun existsByPublicSlugIgnoreCaseAndIdNot(publicSlug: String, id: UUID): Boolean
}

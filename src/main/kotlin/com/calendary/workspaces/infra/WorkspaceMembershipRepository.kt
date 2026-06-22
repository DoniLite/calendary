package com.calendary.workspaces.infra

import com.calendary.workspaces.domain.WorkspaceMembership
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository

interface WorkspaceMembershipRepository : JpaRepository<WorkspaceMembership, UUID> {
	fun countByUserId(userId: UUID): Long

	fun findByWorkspaceIdAndUserId(workspaceId: UUID, userId: UUID): Optional<WorkspaceMembership>

	@EntityGraph(attributePaths = ["workspace"])
	fun findByUserIdOrderByCreatedAtAsc(userId: UUID): List<WorkspaceMembership>
}

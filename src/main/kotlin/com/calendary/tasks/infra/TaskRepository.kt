package com.calendary.tasks.infra

import com.calendary.tasks.domain.Task
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface TaskRepository : JpaRepository<Task, UUID> {
	fun findByIdAndWorkspaceId(id: UUID, workspaceId: UUID): Optional<Task>

	fun findByWorkspaceIdOrderByCreatedAtDesc(workspaceId: UUID): List<Task>
}

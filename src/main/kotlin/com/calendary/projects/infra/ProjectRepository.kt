package com.calendary.projects.infra

import com.calendary.projects.domain.Project
import com.calendary.projects.domain.ProjectType
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface ProjectRepository : JpaRepository<Project, UUID> {
	fun findByIdAndWorkspaceId(id: UUID, workspaceId: UUID): Optional<Project>

	fun findByWorkspaceIdOrderByCreatedAtDesc(workspaceId: UUID): List<Project>

	fun findByWorkspaceIdAndTypeOrderByCreatedAtDesc(workspaceId: UUID, type: ProjectType): List<Project>
}

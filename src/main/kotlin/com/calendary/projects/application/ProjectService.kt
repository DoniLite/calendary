package com.calendary.projects.application

import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.projects.domain.Project
import com.calendary.projects.domain.ProjectStatus
import com.calendary.projects.domain.ProjectType
import com.calendary.projects.infra.ProjectRepository
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.application.WorkspaceAccessService
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ProjectService(
	private val projects: ProjectRepository,
	private val users: UserAccountRepository,
	private val workspaceAccess: WorkspaceAccessService,
) {
	@Transactional
	fun create(command: CreateProjectCommand): Project {
		require(command.title.isNotBlank()) { "Project title is required." }
		val workspace = workspaceAccess.requireWrite(command.workspaceId, command.userId)
		val creator = users.findById(command.userId).orElseThrow { IllegalArgumentException("User not found.") }
		val parent = command.parentProjectId?.let {
			projects.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Parent project not found.") }
		}
		require(command.type == ProjectType.PROJECT || parent != null) { "Epic requires a parent project." }
		require(command.type == ProjectType.EPIC || parent == null) { "Project cannot have a parent project." }

		return projects.save(
			Project(
				workspace = workspace,
				createdBy = creator,
				parentProject = parent,
				title = command.title.trim(),
				description = command.description,
				type = command.type,
				status = command.status,
				visibility = command.visibility,
				startsAt = command.startsAt,
				dueAt = command.dueAt,
			),
		)
	}

	@Transactional(readOnly = true)
	fun list(workspaceId: UUID, userId: UUID, type: ProjectType?): List<Project> {
		workspaceAccess.requireRead(workspaceId, userId)
		return if (type == null) {
			projects.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
		} else {
			projects.findByWorkspaceIdAndTypeOrderByCreatedAtDesc(workspaceId, type)
		}
	}

	@Transactional(readOnly = true)
	fun get(workspaceId: UUID, projectId: UUID, userId: UUID): Project {
		workspaceAccess.requireRead(workspaceId, userId)
		return projects.findByIdAndWorkspaceId(projectId, workspaceId)
			.orElseThrow { IllegalArgumentException("Project not found.") }
	}

	@Transactional
	fun update(command: UpdateProjectCommand): Project {
		require(command.title.isNotBlank()) { "Project title is required." }
		workspaceAccess.requireWrite(command.workspaceId, command.userId)
		val project = projects.findByIdAndWorkspaceId(command.projectId, command.workspaceId)
			.orElseThrow { IllegalArgumentException("Project not found.") }
		val parent = command.parentProjectId?.let {
			projects.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Parent project not found.") }
		}
		require(command.type == ProjectType.PROJECT || parent != null) { "Epic requires a parent project." }
		require(command.type == ProjectType.EPIC || parent == null) { "Project cannot have a parent project." }
		require(parent?.id != project.id) { "Project cannot be its own parent." }

		project.parentProject = parent
		project.title = command.title.trim()
		project.description = command.description
		project.type = command.type
		project.status = command.status
		project.visibility = command.visibility
		project.startsAt = command.startsAt
		project.dueAt = command.dueAt
		return project
	}
}

data class CreateProjectCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val title: String,
	val description: String = "",
	val type: ProjectType = ProjectType.PROJECT,
	val status: ProjectStatus = ProjectStatus.ACTIVE,
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val parentProjectId: UUID? = null,
	val startsAt: Instant? = null,
	val dueAt: Instant? = null,
)

data class UpdateProjectCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val projectId: UUID,
	val title: String,
	val description: String = "",
	val type: ProjectType = ProjectType.PROJECT,
	val status: ProjectStatus = ProjectStatus.ACTIVE,
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val parentProjectId: UUID? = null,
	val startsAt: Instant? = null,
	val dueAt: Instant? = null,
)

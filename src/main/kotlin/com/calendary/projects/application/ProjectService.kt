package com.calendary.projects.application

import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarBlock
import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.calendar.infra.CalendarBlockRepository
import com.calendary.projects.domain.Project
import com.calendary.projects.domain.ProjectStatus
import com.calendary.projects.domain.ProjectType
import com.calendary.projects.infra.ProjectRepository
import com.calendary.resources.application.ResourceAccessService
import com.calendary.resources.domain.ResourceType
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.application.WorkspaceAccessService
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class ProjectService(
	private val projects: ProjectRepository,
	private val calendarBlocks: CalendarBlockRepository,
	private val users: UserAccountRepository,
	private val workspaceAccess: WorkspaceAccessService,
	private val resourceAccess: ResourceAccessService,
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
		requireValidPlanning(command.startsAt, command.dueAt)

		val project = projects.save(
			Project(
				workspace = workspace,
				createdBy = creator,
				parentProject = parent,
				title = command.title.trim(),
				description = command.description,
				type = command.type,
				status = command.status,
				visibility = command.visibility,
				colorPreset = command.colorPreset,
				startsAt = command.startsAt,
				dueAt = command.dueAt,
			),
		)
		syncCalendarBlock(project)
		return project
	}

	@Transactional(readOnly = true)
	fun list(workspaceId: UUID, userId: UUID, type: ProjectType?): List<Project> {
		workspaceAccess.requireRead(workspaceId, userId)
		val isOwner = workspaceAccess.isOwner(workspaceId, userId)
		val found = if (type == null) {
			projects.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
		} else {
			projects.findByWorkspaceIdAndTypeOrderByCreatedAtDesc(workspaceId, type)
		}
		return found.filter { isOwner || resourceAccess.isVisibleToCollaborator(ResourceType.PROJECT, it.id, userId) }
	}

	@Transactional(readOnly = true)
	fun get(workspaceId: UUID, projectId: UUID, userId: UUID): Project {
		workspaceAccess.requireRead(workspaceId, userId)
		val project = projects.findByIdAndWorkspaceId(projectId, workspaceId)
			.orElseThrow { IllegalArgumentException("Project not found.") }
		if (!workspaceAccess.isOwner(workspaceId, userId) && !resourceAccess.isVisibleToCollaborator(ResourceType.PROJECT, project.id, userId)) {
			throw IllegalArgumentException("Project not found.")
		}
		return project
	}

	@Transactional
	fun update(command: UpdateProjectCommand): Project {
		require(command.title.isNotBlank()) { "Project title is required." }
		val project = projects.findByIdAndWorkspaceId(command.projectId, command.workspaceId)
			.orElseThrow { IllegalArgumentException("Project not found.") }
		resourceAccess.requireWrite(ResourceType.PROJECT, project.id, command.userId)
		val parent = command.parentProjectId?.let {
			projects.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Parent project not found.") }
		}
		require(command.type == ProjectType.PROJECT || parent != null) { "Epic requires a parent project." }
		require(command.type == ProjectType.EPIC || parent == null) { "Project cannot have a parent project." }
		require(parent?.id != project.id) { "Project cannot be its own parent." }
		requireValidPlanning(command.startsAt, command.dueAt)

		project.parentProject = parent
		project.title = command.title.trim()
		project.description = command.description
		project.type = command.type
		project.status = command.status
		project.visibility = command.visibility
		project.colorPreset = command.colorPreset
		project.startsAt = command.startsAt
		project.dueAt = command.dueAt
		syncCalendarBlock(project)
		return project
	}

	private fun requireValidPlanning(startsAt: Instant?, dueAt: Instant?) {
		if (startsAt != null || dueAt != null) {
			require(startsAt != null && dueAt != null) { "Project planning requires start and due date." }
			require(dueAt.isAfter(startsAt)) { "Project due date must be after start." }
		}
	}

	private fun syncCalendarBlock(project: Project) {
		val existingBlock = calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.PROJECT, project.id)
		val startsAt = project.startsAt
		val dueAt = project.dueAt
		if (startsAt != null && dueAt != null) {
			val block = existingBlock.orElseGet {
				CalendarBlock(
					workspace = project.workspace,
					sourceType = CalendarBlockSourceType.PROJECT,
					sourceId = project.id,
				)
			}
			block.title = project.title
			block.startsAt = startsAt
			block.endsAt = dueAt
			block.timezone = "UTC"
			block.visibility = project.visibility
			block.colorPreset = project.colorPreset
			block.busy = project.status != ProjectStatus.DONE && project.status != ProjectStatus.ARCHIVED
			if (existingBlock.isEmpty) {
				calendarBlocks.save(block)
			}
		} else {
			existingBlock.ifPresent { calendarBlocks.delete(it) }
		}
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
	val colorPreset: CalendarColorPreset = CalendarColorPreset.ORANGE,
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
	val colorPreset: CalendarColorPreset = CalendarColorPreset.ORANGE,
	val parentProjectId: UUID? = null,
	val startsAt: Instant? = null,
	val dueAt: Instant? = null,
)

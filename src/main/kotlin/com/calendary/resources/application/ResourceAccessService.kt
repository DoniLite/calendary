package com.calendary.resources.application

import com.calendary.collaboration.domain.ShareStatus
import com.calendary.collaboration.infra.ResourceShareRepository
import com.calendary.common.api.ForbiddenException
import com.calendary.events.infra.EventRepository
import com.calendary.projects.infra.ProjectRepository
import com.calendary.resources.domain.ResourceType
import com.calendary.tasks.infra.TaskRepository
import com.calendary.workspaces.application.WorkspaceAccessService
import com.calendary.workspaces.domain.Workspace
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class ResourceAccessService(
	private val events: EventRepository,
	private val tasks: TaskRepository,
	private val projects: ProjectRepository,
	private val shares: ResourceShareRepository,
	private val workspaceAccess: WorkspaceAccessService,
) {
	fun resolveOwnerWorkspace(resourceType: ResourceType, resourceId: UUID): Workspace =
		when (resourceType) {
			ResourceType.EVENT -> events.findById(resourceId).orElseThrow { IllegalArgumentException("Event not found.") }.workspace
			ResourceType.TASK -> tasks.findById(resourceId).orElseThrow { IllegalArgumentException("Task not found.") }.workspace
			ResourceType.PROJECT -> projects.findById(resourceId).orElseThrow { IllegalArgumentException("Project not found.") }.workspace
		} ?: error("Resource has no workspace.")

	fun requireRead(resourceType: ResourceType, resourceId: UUID, userId: UUID): Workspace {
		val workspace = resolveOwnerWorkspace(resourceType, resourceId)
		if (workspaceAccess.canRead(workspace.id, userId)) {
			return workspace
		}
		if (shares.existsByResourceTypeAndResourceIdAndRecipientIdAndStatus(resourceType, resourceId, userId, ShareStatus.ACCEPTED)) {
			return workspace
		}
		throw ForbiddenException("Resource access denied.")
	}

	fun requireWrite(resourceType: ResourceType, resourceId: UUID, userId: UUID): Workspace {
		val workspace = resolveOwnerWorkspace(resourceType, resourceId)
		if (workspaceAccess.canWrite(workspace.id, userId)) {
			return workspace
		}
		if (
			shares.existsByResourceTypeAndResourceIdAndRecipientIdAndStatusAndAccessLevel(
				resourceType,
				resourceId,
				userId,
				ShareStatus.ACCEPTED,
				WorkspaceAccessLevel.WRITE,
			)
		) {
			return workspace
		}
		throw ForbiddenException("Resource write access denied.")
	}
}

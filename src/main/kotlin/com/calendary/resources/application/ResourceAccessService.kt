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
		if (workspaceAccess.isOwner(workspace.id, userId)) {
			return workspace
		}
		if (workspaceAccess.canRead(workspace.id, userId) && isVisibleToCollaborator(resourceType, resourceId, userId)) {
			return workspace
		}
		throw ForbiddenException("Resource access denied.")
	}

	fun requireWrite(resourceType: ResourceType, resourceId: UUID, userId: UUID): Workspace {
		val workspace = resolveOwnerWorkspace(resourceType, resourceId)
		if (workspaceAccess.isOwner(workspace.id, userId)) {
			return workspace
		}
		if (workspaceAccess.canWrite(workspace.id, userId) && isVisibleToCollaborator(resourceType, resourceId, userId, requireWrite = true)) {
			return workspace
		}
		throw ForbiddenException("Resource write access denied.")
	}

	// Workspace membership lets a collaborator create resources in someone else's workspace, but
	// it must not make every existing resource visible by default — only the workspace OWNER (the
	// super admin, on their own workspace) sees everything. A non-owner member only sees what they
	// created themselves or what's been explicitly shared with them, with sharing cascading from a
	// Project/Epic down to its tasks (sharing the parent is enough; no need to re-share every task
	// in it individually).
	fun isVisibleToCollaborator(resourceType: ResourceType, resourceId: UUID, userId: UUID, requireWrite: Boolean = false): Boolean {
		val directShare = if (requireWrite) {
			shares.existsByResourceTypeAndResourceIdAndRecipientIdAndStatusAndAccessLevel(resourceType, resourceId, userId, ShareStatus.ACCEPTED, WorkspaceAccessLevel.WRITE)
		} else {
			shares.existsByResourceTypeAndResourceIdAndRecipientIdAndStatus(resourceType, resourceId, userId, ShareStatus.ACCEPTED)
		}
		if (directShare) return true
		return when (resourceType) {
			ResourceType.TASK -> tasks.findById(resourceId).map { task ->
				task.createdBy?.id == userId ||
					task.project?.id?.let { isVisibleToCollaborator(ResourceType.PROJECT, it, userId, requireWrite) } == true ||
					task.epic?.id?.let { isVisibleToCollaborator(ResourceType.PROJECT, it, userId, requireWrite) } == true
			}.orElse(false)
			ResourceType.PROJECT -> projects.findById(resourceId).map { it.createdBy?.id == userId }.orElse(false)
			ResourceType.EVENT -> events.findById(resourceId).map { it.createdBy?.id == userId }.orElse(false)
		}
	}
}

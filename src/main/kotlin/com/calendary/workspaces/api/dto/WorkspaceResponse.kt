package com.calendary.workspaces.api.dto

import com.calendary.workspaces.domain.WorkspaceMembership
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.domain.WorkspaceType
import java.util.UUID

data class WorkspaceResponse(
	val id: UUID,
	val name: String,
	val publicSlug: String,
	val defaultTimezone: String,
	val type: WorkspaceType,
	val accessLevel: WorkspaceAccessLevel,
	val ownerId: UUID,
)

fun WorkspaceMembership.toResponse(): WorkspaceResponse {
	val workspace = workspace ?: error("Membership has no workspace.")
	return WorkspaceResponse(
		id = workspace.id,
		name = workspace.name,
		publicSlug = workspace.publicSlug,
		defaultTimezone = workspace.defaultTimezone,
		type = workspace.type,
		accessLevel = accessLevel,
		ownerId = workspace.owner?.id ?: error("Workspace has no owner."),
	)
}

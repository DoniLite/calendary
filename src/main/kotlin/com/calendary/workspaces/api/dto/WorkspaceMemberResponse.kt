package com.calendary.workspaces.api.dto

import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.domain.WorkspaceMembership
import java.util.UUID

data class WorkspaceMemberResponse(
	val id: UUID,
	val email: String,
	val accessLevel: WorkspaceAccessLevel,
)

data class WorkspaceMemberListResponse(
	val items: List<WorkspaceMemberResponse>,
)

fun List<WorkspaceMembership>.toMemberListResponse(): WorkspaceMemberListResponse =
	WorkspaceMemberListResponse(
		items = mapNotNull { membership ->
			membership.user?.let { user -> WorkspaceMemberResponse(id = user.id, email = user.email, accessLevel = membership.accessLevel) }
		},
	)

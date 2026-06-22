package com.calendary.workspaces.api.dto

import com.calendary.workspaces.domain.WorkspaceMembership

data class WorkspaceListResponse(
	val items: List<WorkspaceResponse>,
)

fun List<WorkspaceMembership>.toResponse(): WorkspaceListResponse =
	WorkspaceListResponse(items = map { it.toResponse() })

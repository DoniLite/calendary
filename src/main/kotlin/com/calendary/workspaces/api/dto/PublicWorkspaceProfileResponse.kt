package com.calendary.workspaces.api.dto

import com.calendary.workspaces.domain.Workspace
import java.util.UUID

data class PublicWorkspaceProfileResponse(
	val id: UUID,
	val name: String,
	val publicSlug: String,
	val defaultTimezone: String,
)

fun Workspace.toPublicProfileResponse(): PublicWorkspaceProfileResponse =
	PublicWorkspaceProfileResponse(
		id = id,
		name = name,
		publicSlug = publicSlug,
		defaultTimezone = defaultTimezone,
	)

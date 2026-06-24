package com.calendary.workspaces.api.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

data class UpdateWorkspaceSettingsRequest(
	@field:NotBlank
	val name: String,
	@field:NotBlank
	@field:Pattern(regexp = "^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$")
	val publicSlug: String,
	@field:NotBlank
	val defaultTimezone: String,
)

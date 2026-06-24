package com.calendary.workspaces.api.dto

import jakarta.validation.constraints.NotBlank

data class UpdateWorkspaceThemeRequest(
	@field:NotBlank
	val theme: String,
)

/**
 * Kept in sync with `frontend/src/features/theme/themes.ts`. The frontend is the source of
 * truth for theme metadata (label, accent color, light/dark mode); the backend only needs to
 * know which ids are valid so it can reject garbage before it's persisted.
 */
val validWorkspaceThemes = setOf(
	"solar-orange",
	"paper-green",
	"clear-blue",
	"ember-dark",
	"graphite-cyan",
	"plum-night",
)

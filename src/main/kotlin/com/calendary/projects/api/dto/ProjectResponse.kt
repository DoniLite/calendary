package com.calendary.projects.api.dto

import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.projects.domain.Project
import com.calendary.projects.domain.ProjectStatus
import com.calendary.projects.domain.ProjectType
import java.time.Instant
import java.util.UUID

data class ProjectResponse(
	val id: UUID,
	val workspaceId: UUID,
	val parentProjectId: UUID?,
	val title: String,
	val description: String,
	val type: ProjectType,
	val status: ProjectStatus,
	val visibility: CalendarVisibility,
	val startsAt: Instant?,
	val dueAt: Instant?,
)

fun Project.toResponse(): ProjectResponse =
	ProjectResponse(
		id = id,
		workspaceId = workspace?.id ?: error("Project has no workspace."),
		parentProjectId = parentProject?.id,
		title = title,
		description = description,
		type = type,
		status = status,
		visibility = visibility,
		startsAt = startsAt,
		dueAt = dueAt,
	)

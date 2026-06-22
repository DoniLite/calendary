package com.calendary.projects.api.dto

import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.projects.domain.ProjectStatus
import com.calendary.projects.domain.ProjectType
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

data class UpdateProjectRequest(
	@field:NotBlank
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

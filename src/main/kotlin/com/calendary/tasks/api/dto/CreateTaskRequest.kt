package com.calendary.tasks.api.dto

import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.tasks.domain.TaskPriority
import com.calendary.tasks.domain.TaskStatus
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.util.UUID

data class CreateTaskRequest(
	@field:NotBlank
	val title: String,
	val description: String = "",
	val status: TaskStatus = TaskStatus.TODO,
	val priority: TaskPriority = TaskPriority.MEDIUM,
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val dueAt: Instant? = null,
	val projectId: UUID? = null,
	val epicId: UUID? = null,
	val parentTaskId: UUID? = null,
	val estimateMinutes: Int? = null,
	val plannedStart: Instant? = null,
	val plannedEnd: Instant? = null,
	val timezone: String = "UTC",
)

package com.calendary.tasks.api.dto

import com.calendary.calendar.api.dto.CalendarColorResponse
import com.calendary.calendar.api.dto.toResponse
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.tasks.domain.Task
import com.calendary.tasks.domain.TaskPriority
import com.calendary.tasks.domain.TaskStatus
import java.time.Instant
import java.util.UUID

data class TaskResponse(
	val id: UUID,
	val workspaceId: UUID,
	val title: String,
	val description: String,
	val status: TaskStatus,
	val priority: TaskPriority,
	val visibility: CalendarVisibility,
	val color: CalendarColorResponse,
	val dueAt: Instant?,
	val projectId: UUID?,
	val epicId: UUID?,
	val parentTaskId: UUID?,
	val estimateMinutes: Int?,
)

fun Task.toResponse(): TaskResponse =
	TaskResponse(
		id = id,
		workspaceId = workspace?.id ?: error("Task has no workspace."),
		title = title,
		description = description,
		status = status,
		priority = priority,
		visibility = visibility,
		color = colorPreset.toResponse(),
		dueAt = dueAt,
		projectId = project?.id,
		epicId = epic?.id,
		parentTaskId = parentTask?.id,
		estimateMinutes = estimateMinutes,
	)

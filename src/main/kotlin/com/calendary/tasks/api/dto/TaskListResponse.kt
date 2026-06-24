package com.calendary.tasks.api.dto

import com.calendary.tasks.application.TaskWithSchedule

data class TaskListResponse(
	val items: List<TaskResponse>,
)

fun TaskWithSchedule.toResponse(): TaskResponse =
	task.toResponse(plannedStart = block?.startsAt, plannedEnd = block?.endsAt, timezone = block?.timezone)

fun List<TaskWithSchedule>.toResponse(): TaskListResponse =
	TaskListResponse(items = map { it.toResponse() })

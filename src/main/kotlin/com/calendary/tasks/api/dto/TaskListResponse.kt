package com.calendary.tasks.api.dto

import com.calendary.tasks.domain.Task

data class TaskListResponse(
	val items: List<TaskResponse>,
)

fun List<Task>.toResponse(): TaskListResponse =
	TaskListResponse(items = map { it.toResponse() })

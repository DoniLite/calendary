package com.calendary.tasks.api.dto

import com.calendary.tasks.domain.TaskStatus

data class UpdateTaskStatusRequest(
	val status: TaskStatus,
)

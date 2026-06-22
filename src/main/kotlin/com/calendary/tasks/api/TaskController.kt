package com.calendary.tasks.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.tasks.api.dto.CreateTaskRequest
import com.calendary.tasks.api.dto.TaskListResponse
import com.calendary.tasks.api.dto.TaskResponse
import com.calendary.tasks.api.dto.UpdateTaskRequest
import com.calendary.tasks.api.dto.toResponse
import com.calendary.tasks.application.CreateTaskCommand
import com.calendary.tasks.application.TaskService
import com.calendary.tasks.application.UpdateTaskCommand
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/tasks")
class TaskController(
	private val sessions: AuthSessionService,
	private val tasks: TaskService,
) {
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	fun create(
		@PathVariable workspaceId: UUID,
		@Valid @RequestBody request: CreateTaskRequest,
		httpRequest: HttpServletRequest,
	): TaskResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return tasks.create(
			CreateTaskCommand(
				workspaceId = workspaceId,
				userId = currentUser.id,
				title = request.title,
				description = request.description,
				status = request.status,
				priority = request.priority,
				visibility = request.visibility,
				colorPreset = request.colorPreset,
				dueAt = request.dueAt,
				projectId = request.projectId,
				epicId = request.epicId,
				parentTaskId = request.parentTaskId,
				estimateMinutes = request.estimateMinutes,
				plannedStart = request.plannedStart,
				plannedEnd = request.plannedEnd,
				timezone = request.timezone,
			),
		).toResponse()
	}

	@GetMapping
	fun list(
		@PathVariable workspaceId: UUID,
		httpRequest: HttpServletRequest,
	): TaskListResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return tasks.list(workspaceId, currentUser.id).toResponse()
	}

	@PatchMapping("/{id}")
	fun update(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		@Valid @RequestBody request: UpdateTaskRequest,
		httpRequest: HttpServletRequest,
	): TaskResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return tasks.update(
			UpdateTaskCommand(
				workspaceId = workspaceId,
				userId = currentUser.id,
				taskId = id,
				title = request.title,
				description = request.description,
				status = request.status,
				priority = request.priority,
				visibility = request.visibility,
				colorPreset = request.colorPreset,
				dueAt = request.dueAt,
				projectId = request.projectId,
				epicId = request.epicId,
				parentTaskId = request.parentTaskId,
				estimateMinutes = request.estimateMinutes,
				plannedStart = request.plannedStart,
				plannedEnd = request.plannedEnd,
				timezone = request.timezone,
			),
		).toResponse()
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun delete(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	) {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		tasks.delete(workspaceId, id, currentUser.id)
	}
}

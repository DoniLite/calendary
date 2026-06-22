package com.calendary.projects.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.projects.api.dto.CreateProjectRequest
import com.calendary.projects.api.dto.ProjectListResponse
import com.calendary.projects.api.dto.ProjectResponse
import com.calendary.projects.api.dto.UpdateProjectRequest
import com.calendary.projects.api.dto.toResponse
import com.calendary.projects.application.CreateProjectCommand
import com.calendary.projects.application.ProjectService
import com.calendary.projects.application.UpdateProjectCommand
import com.calendary.projects.domain.ProjectType
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/projects")
class ProjectController(
	private val sessions: AuthSessionService,
	private val projects: ProjectService,
) {
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	fun create(
		@PathVariable workspaceId: UUID,
		@Valid @RequestBody request: CreateProjectRequest,
		httpRequest: HttpServletRequest,
	): ProjectResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return projects.create(
			CreateProjectCommand(
				workspaceId = workspaceId,
				userId = currentUser.id,
				title = request.title,
				description = request.description,
				type = request.type,
				status = request.status,
				visibility = request.visibility,
				parentProjectId = request.parentProjectId,
				startsAt = request.startsAt,
				dueAt = request.dueAt,
			),
		).toResponse()
	}

	@GetMapping
	fun list(
		@PathVariable workspaceId: UUID,
		@RequestParam(required = false) type: ProjectType?,
		httpRequest: HttpServletRequest,
	): ProjectListResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return projects.list(workspaceId, currentUser.id, type).toResponse()
	}

	@GetMapping("/{id}")
	fun get(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	): ProjectResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return projects.get(workspaceId, id, currentUser.id).toResponse()
	}

	@PatchMapping("/{id}")
	fun update(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		@Valid @RequestBody request: UpdateProjectRequest,
		httpRequest: HttpServletRequest,
	): ProjectResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return projects.update(
			UpdateProjectCommand(
				workspaceId = workspaceId,
				userId = currentUser.id,
				projectId = id,
				title = request.title,
				description = request.description,
				type = request.type,
				status = request.status,
				visibility = request.visibility,
				parentProjectId = request.parentProjectId,
				startsAt = request.startsAt,
				dueAt = request.dueAt,
			),
		).toResponse()
	}
}

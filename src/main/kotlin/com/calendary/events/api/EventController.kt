package com.calendary.events.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.events.api.dto.CreateEventRequest
import com.calendary.events.api.dto.EventResponse
import com.calendary.events.api.dto.UpdateEventRequest
import com.calendary.events.api.dto.toResponse
import com.calendary.events.application.CreateEventCommand
import com.calendary.events.application.EventService
import com.calendary.events.application.UpdateEventCommand
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
@RequestMapping("/api/workspaces/{workspaceId}/events")
class EventController(
	private val sessions: AuthSessionService,
	private val events: EventService,
) {
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	fun create(
		@PathVariable workspaceId: UUID,
		@Valid @RequestBody request: CreateEventRequest,
		httpRequest: HttpServletRequest,
	): EventResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return events.create(
			CreateEventCommand(
				workspaceId = workspaceId,
				userId = currentUser.id,
				title = request.title,
				description = request.description,
				startsAt = request.startsAt,
				endsAt = request.endsAt,
				timezone = request.timezone,
				visibility = request.visibility,
			),
		).toResponse()
	}

	@GetMapping("/{id}")
	fun get(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	): EventResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return events.get(workspaceId, id, currentUser.id).toResponse()
	}

	@PatchMapping("/{id}")
	fun update(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		@Valid @RequestBody request: UpdateEventRequest,
		httpRequest: HttpServletRequest,
	): EventResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return events.update(
			UpdateEventCommand(
				workspaceId = workspaceId,
				userId = currentUser.id,
				eventId = id,
				title = request.title,
				description = request.description,
				startsAt = request.startsAt,
				endsAt = request.endsAt,
				timezone = request.timezone,
				visibility = request.visibility,
				status = request.status,
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
		events.delete(workspaceId, id, currentUser.id)
	}
}

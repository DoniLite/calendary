package com.calendary.collaboration.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.collaboration.api.dto.CollaborationListResponse
import com.calendary.collaboration.api.dto.CollaborationResponse
import com.calendary.collaboration.api.dto.ProposeCollaborationRequest
import com.calendary.collaboration.api.dto.toResponse
import com.calendary.collaboration.application.CollaborationService
import com.calendary.collaboration.application.ProposeCollaborationCommand
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
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.transaction.annotation.Transactional

@RestController
@RequestMapping("/api/collaborations")
class CollaborationController(
	private val sessions: AuthSessionService,
	private val collaborations: CollaborationService,
) {
	// .toResponse() reads requestedBy.email/recipient.email, lazily fetched ManyToOne relations —
	// with spring.jpa.open-in-view=false the Hibernate session is gone by the time the controller
	// runs unless the whole method (service call + mapping) stays inside one transaction.
	@PostMapping
	@ResponseStatus(HttpStatus.CREATED)
	@Transactional
	fun propose(
		@Valid @RequestBody request: ProposeCollaborationRequest,
		httpRequest: HttpServletRequest,
	): CollaborationResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return collaborations.propose(
			ProposeCollaborationCommand(
				requestedById = currentUser.id,
				resourceType = request.resourceType,
				resourceId = request.resourceId,
				recipientEmail = request.recipientEmail,
				accessLevel = request.accessLevel,
				message = request.message,
			),
		).toResponse()
	}

	@GetMapping("/inbox")
	@Transactional
	fun inbox(httpRequest: HttpServletRequest): CollaborationListResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return collaborations.inbox(currentUser.id).toResponse()
	}

	@GetMapping("/sent")
	@Transactional
	fun sent(httpRequest: HttpServletRequest): CollaborationListResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return collaborations.sent(currentUser.id).toResponse()
	}

	@PatchMapping("/{id}/accept")
	@Transactional
	fun accept(
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	): CollaborationResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return collaborations.accept(id, currentUser.id).toResponse()
	}

	@PatchMapping("/{id}/reject")
	@Transactional
	fun reject(
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	): CollaborationResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return collaborations.reject(id, currentUser.id).toResponse()
	}
}

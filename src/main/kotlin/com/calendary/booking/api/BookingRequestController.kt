package com.calendary.booking.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.booking.api.dto.BookingRequestListResponse
import com.calendary.booking.api.dto.BookingRequestResponse
import com.calendary.booking.api.dto.toResponse
import com.calendary.booking.application.BookingRequestService
import com.calendary.booking.application.DecideBookingRequestCommand
import com.calendary.workspaces.application.WorkspaceAccessService
import jakarta.servlet.http.HttpServletRequest
import java.util.UUID
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/booking-requests")
class BookingRequestController(
	private val sessions: AuthSessionService,
	private val workspaceAccess: WorkspaceAccessService,
	private val bookingRequests: BookingRequestService,
) {
	@GetMapping
	fun list(
		@PathVariable workspaceId: UUID,
		httpRequest: HttpServletRequest,
	): BookingRequestListResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		workspaceAccess.requireRead(workspaceId, currentUser.id)
		return bookingRequests.listForWorkspace(workspaceId).toResponse()
	}

	@PatchMapping("/{id}/accept")
	fun accept(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	): BookingRequestResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		workspaceAccess.requireWrite(workspaceId, currentUser.id)
		return bookingRequests.accept(
			DecideBookingRequestCommand(
				workspaceId = workspaceId,
				bookingRequestId = id,
				decidedByUserId = currentUser.id,
			),
		).toResponse()
	}

	@PatchMapping("/{id}/reject")
	fun reject(
		@PathVariable workspaceId: UUID,
		@PathVariable id: UUID,
		httpRequest: HttpServletRequest,
	): BookingRequestResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		workspaceAccess.requireWrite(workspaceId, currentUser.id)
		return bookingRequests.reject(
			DecideBookingRequestCommand(
				workspaceId = workspaceId,
				bookingRequestId = id,
				decidedByUserId = currentUser.id,
			),
		).toResponse()
	}
}

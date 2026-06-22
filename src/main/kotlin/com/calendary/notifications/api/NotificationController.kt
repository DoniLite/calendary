package com.calendary.notifications.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.notifications.api.dto.NotificationListResponse
import com.calendary.notifications.api.dto.NotificationResponse
import com.calendary.notifications.api.dto.toResponse
import com.calendary.notifications.application.NotificationService
import jakarta.servlet.http.HttpServletRequest
import java.util.UUID
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/notifications")
class NotificationController(
	private val sessions: AuthSessionService,
	private val notifications: NotificationService,
) {
	@GetMapping
	fun list(request: HttpServletRequest): NotificationListResponse {
		val currentUser = sessions.currentUser(request.getSession(false))
		return notifications.listForUser(currentUser.id).toResponse()
	}

	@PatchMapping("/{id}/read")
	fun markAsRead(
		@PathVariable id: UUID,
		request: HttpServletRequest,
	): NotificationResponse {
		val currentUser = sessions.currentUser(request.getSession(false))
		return notifications.markAsRead(id, currentUser.id).toResponse()
	}

	@PatchMapping("/read-all")
	fun markAllAsRead(request: HttpServletRequest): NotificationListResponse {
		val currentUser = sessions.currentUser(request.getSession(false))
		return notifications.markAllAsRead(currentUser.id).toResponse()
	}
}

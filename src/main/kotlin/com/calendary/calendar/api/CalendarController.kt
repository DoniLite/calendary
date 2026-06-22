package com.calendary.calendar.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.calendar.api.dto.CalendarResponse
import com.calendary.calendar.api.dto.toResponse
import com.calendary.calendar.application.CalendarQuery
import com.calendary.calendar.application.CalendarQueryService
import jakarta.servlet.http.HttpServletRequest
import java.time.Instant
import java.util.UUID
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/calendar")
class CalendarController(
	private val sessions: AuthSessionService,
	private val calendar: CalendarQueryService,
) {
	@GetMapping
	fun getCalendar(
		@PathVariable workspaceId: UUID,
		@RequestParam start: Instant,
		@RequestParam end: Instant,
		httpRequest: HttpServletRequest,
	): CalendarResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		return calendar.getCalendar(
			CalendarQuery(
				workspaceId = workspaceId,
				userId = currentUser.id,
				start = start,
				end = end,
			),
		).toResponse()
	}
}

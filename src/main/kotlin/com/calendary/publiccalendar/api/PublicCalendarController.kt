package com.calendary.publiccalendar.api

import com.calendary.booking.api.dto.BookingRequestResponse
import com.calendary.booking.api.dto.CreateBookingRequest
import com.calendary.booking.api.dto.toResponse
import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.booking.application.BookingRequestService
import com.calendary.booking.application.CreateBookingRequestCommand
import com.calendary.publiccalendar.api.dto.PublicCalendarItemResponse
import com.calendary.publiccalendar.api.dto.PublicCalendarResponse
import com.calendary.publiccalendar.api.dto.PublicAvailabilityResponse
import com.calendary.publiccalendar.api.dto.toResponse
import com.calendary.publiccalendar.application.PublicAvailabilityQuery
import com.calendary.publiccalendar.application.PublicCalendarItemQuery
import com.calendary.publiccalendar.application.PublicCalendarQuery
import com.calendary.publiccalendar.application.PublicCalendarService
import jakarta.validation.Valid
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/public/workspaces/{workspaceId}")
class PublicCalendarController(
	private val publicCalendar: PublicCalendarService,
	private val bookingRequests: BookingRequestService,
) {
	@GetMapping("/calendar")
	fun getCalendar(
		@PathVariable workspaceId: UUID,
		@RequestParam start: Instant,
		@RequestParam end: Instant,
	): PublicCalendarResponse =
		publicCalendar.getPublicCalendar(
			PublicCalendarQuery(
				workspaceId = workspaceId,
				start = start,
				end = end,
			),
		).toResponse()

	@GetMapping("/calendar/{sourceType}/{sourceId}")
	fun getCalendarItem(
		@PathVariable workspaceId: UUID,
		@PathVariable sourceType: CalendarBlockSourceType,
		@PathVariable sourceId: UUID,
	): PublicCalendarItemResponse =
		publicCalendar.getPublicCalendarItem(
			PublicCalendarItemQuery(
				workspaceId = workspaceId,
				sourceType = sourceType,
				sourceId = sourceId,
			),
		).toResponse()

	@GetMapping("/availability")
	fun getAvailability(
		@PathVariable workspaceId: UUID,
		@RequestParam start: Instant,
		@RequestParam end: Instant,
		@RequestParam(defaultValue = "30") slotMinutes: Int,
	): PublicAvailabilityResponse =
		publicCalendar.getAvailability(
			PublicAvailabilityQuery(
				workspaceId = workspaceId,
				start = start,
				end = end,
				slotMinutes = slotMinutes,
			),
		).toResponse()

	@PostMapping("/booking-requests")
	@ResponseStatus(HttpStatus.CREATED)
	fun createBookingRequest(
		@PathVariable workspaceId: UUID,
		@Valid @RequestBody request: CreateBookingRequest,
	): BookingRequestResponse =
		bookingRequests.create(
			CreateBookingRequestCommand(
				workspaceId = workspaceId,
				requesterName = request.requesterName,
				requesterEmail = request.requesterEmail,
				message = request.message,
				startsAt = request.startsAt,
				endsAt = request.endsAt,
				timezone = request.timezone,
			),
		).toResponse()
}

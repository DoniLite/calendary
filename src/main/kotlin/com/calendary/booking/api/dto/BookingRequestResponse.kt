package com.calendary.booking.api.dto

import com.calendary.booking.domain.BookingRequest
import com.calendary.booking.domain.BookingRequestStatus
import java.time.Instant
import java.util.UUID

data class BookingRequestResponse(
	val id: UUID,
	val workspaceId: UUID,
	val requesterName: String,
	val requesterEmail: String,
	val message: String,
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String,
	val status: BookingRequestStatus,
)

fun BookingRequest.toResponse(): BookingRequestResponse =
	BookingRequestResponse(
		id = id,
		workspaceId = workspace?.id ?: error("Booking request has no workspace."),
		requesterName = requesterName,
		requesterEmail = requesterEmail,
		message = message,
		startsAt = startsAt,
		endsAt = endsAt,
		timezone = timezone,
		status = status,
	)

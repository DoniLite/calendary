package com.calendary.publiccalendar.api.dto

import com.calendary.publiccalendar.application.PublicAvailabilitySlot
import com.calendary.publiccalendar.application.PublicAvailabilityView
import java.time.Instant
import java.util.UUID

data class PublicAvailabilityResponse(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
	val slotMinutes: Int,
	val slots: List<PublicAvailabilitySlotResponse>,
)

data class PublicAvailabilitySlotResponse(
	val startsAt: Instant,
	val endsAt: Instant,
	val available: Boolean,
)

fun PublicAvailabilityView.toResponse(): PublicAvailabilityResponse =
	PublicAvailabilityResponse(
		workspaceId = workspaceId,
		start = start,
		end = end,
		slotMinutes = slotMinutes,
		slots = slots.map { it.toResponse() },
	)

fun PublicAvailabilitySlot.toResponse(): PublicAvailabilitySlotResponse =
	PublicAvailabilitySlotResponse(
		startsAt = startsAt,
		endsAt = endsAt,
		available = available,
	)

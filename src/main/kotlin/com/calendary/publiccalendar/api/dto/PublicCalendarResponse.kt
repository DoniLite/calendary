package com.calendary.publiccalendar.api.dto

import com.calendary.publiccalendar.application.PublicCalendarView
import java.time.Instant
import java.util.UUID

data class PublicCalendarResponse(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
	val items: List<PublicCalendarItemResponse>,
)

fun PublicCalendarView.toResponse(): PublicCalendarResponse =
	PublicCalendarResponse(
		workspaceId = workspaceId,
		start = start,
		end = end,
		items = items.map { it.toResponse() },
	)

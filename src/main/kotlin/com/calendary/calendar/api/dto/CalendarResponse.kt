package com.calendary.calendar.api.dto

import com.calendary.calendar.application.CalendarView
import java.time.Instant
import java.util.UUID

data class CalendarResponse(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
	val items: List<CalendarItemResponse>,
)

fun CalendarView.toResponse(): CalendarResponse =
	CalendarResponse(
		workspaceId = workspaceId,
		start = start,
		end = end,
		items = items.map { it.toResponse() },
	)

package com.calendary.events.api.dto

import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.events.domain.Event
import com.calendary.events.domain.EventStatus
import java.time.Instant
import java.util.UUID

data class EventResponse(
	val id: UUID,
	val workspaceId: UUID,
	val title: String,
	val description: String,
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String,
	val visibility: CalendarVisibility,
	val status: EventStatus,
)

fun Event.toResponse(): EventResponse =
	EventResponse(
		id = id,
		workspaceId = workspace?.id ?: error("Event has no workspace."),
		title = title,
		description = description,
		startsAt = startsAt,
		endsAt = endsAt,
		timezone = timezone,
		visibility = visibility,
		status = status,
	)

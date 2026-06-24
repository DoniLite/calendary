package com.calendary.events.api.dto

import com.calendary.calendar.api.dto.CalendarColorResponse
import com.calendary.calendar.api.dto.toResponse
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.events.domain.Event
import com.calendary.events.domain.EventStatus
import com.calendary.users.api.dto.MemberSummaryResponse
import com.calendary.users.api.dto.toSummary
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
	val conferenceUrl: String?,
	val externalCalendarEventId: String?,
	val visibility: CalendarVisibility,
	val color: CalendarColorResponse,
	val status: EventStatus,
	val participants: List<MemberSummaryResponse>,
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
		conferenceUrl = conferenceUrl,
		externalCalendarEventId = externalCalendarEventId,
		visibility = visibility,
		color = colorPreset.toResponse(),
		status = status,
		participants = participants.mapNotNull { it.user }.map { it.toSummary() },
	)

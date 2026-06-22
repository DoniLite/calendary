package com.calendary.calendar.api.dto

import com.calendary.calendar.api.dto.CalendarColorResponse
import com.calendary.calendar.api.dto.toResponse
import com.calendary.calendar.application.CalendarItem
import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.calendar.domain.CalendarVisibility
import java.time.Instant
import java.util.UUID

data class CalendarItemResponse(
	val id: UUID,
	val title: String,
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String,
	val sourceType: CalendarBlockSourceType,
	val sourceId: UUID,
	val visibility: CalendarVisibility,
	val color: CalendarColorResponse,
	val busy: Boolean,
)

fun CalendarItem.toResponse(): CalendarItemResponse =
	CalendarItemResponse(
		id = id,
		title = title,
		startsAt = startsAt,
		endsAt = endsAt,
		timezone = timezone,
		sourceType = sourceType,
		sourceId = sourceId,
		visibility = visibility,
		color = colorPreset.toResponse(),
		busy = busy,
	)

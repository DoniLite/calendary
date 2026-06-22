package com.calendary.publiccalendar.api.dto

import com.calendary.calendar.api.dto.CalendarColorResponse
import com.calendary.calendar.api.dto.toResponse
import com.calendary.publiccalendar.application.PublicCalendarItem
import java.time.Instant

data class PublicCalendarItemResponse(
	val startsAt: Instant,
	val endsAt: Instant,
	val busy: Boolean,
	val public: Boolean,
	val title: String?,
	val sourceType: String?,
	val color: CalendarColorResponse?,
)

fun PublicCalendarItem.toResponse(): PublicCalendarItemResponse =
	PublicCalendarItemResponse(
		startsAt = startsAt,
		endsAt = endsAt,
		busy = busy,
		public = public,
		title = title,
		sourceType = sourceType,
		color = colorPreset?.toResponse(),
	)

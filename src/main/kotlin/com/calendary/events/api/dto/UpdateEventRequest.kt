package com.calendary.events.api.dto

import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.events.domain.EventStatus
import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class UpdateEventRequest(
	@field:NotBlank
	val title: String,
	val description: String = "",
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String = "UTC",
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val colorPreset: CalendarColorPreset = CalendarColorPreset.BLUE,
	val status: EventStatus = EventStatus.CONFIRMED,
)

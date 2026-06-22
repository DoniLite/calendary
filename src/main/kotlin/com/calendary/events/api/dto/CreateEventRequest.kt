package com.calendary.events.api.dto

import com.calendary.calendar.domain.CalendarVisibility
import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class CreateEventRequest(
	@field:NotBlank
	val title: String,
	val description: String = "",
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String = "UTC",
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
)

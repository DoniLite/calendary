package com.calendary.calendar.api.dto

import com.calendary.calendar.domain.CalendarColorPreset

data class CalendarColorResponse(
	val preset: CalendarColorPreset,
	val background: String,
	val foreground: String,
	val border: String,
)

fun CalendarColorPreset.toResponse(): CalendarColorResponse =
	CalendarColorResponse(
		preset = this,
		background = background,
		foreground = foreground,
		border = border,
	)

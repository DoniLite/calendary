package com.calendary.calendar.domain

enum class CalendarColorPreset(
	val background: String,
	val foreground: String,
	val border: String,
) {
	ORANGE("#ffedd5", "#9a3412", "#fdba74"),
	BLUE("#dbeafe", "#1e3a8a", "#93c5fd"),
	GREEN("#dcfce7", "#166534", "#86efac"),
	ROSE("#ffe4e6", "#9f1239", "#fda4af"),
	VIOLET("#ede9fe", "#5b21b6", "#c4b5fd"),
	SLATE("#e2e8f0", "#1e293b", "#94a3b8"),
	AMBER("#fef3c7", "#92400e", "#fcd34d"),
}

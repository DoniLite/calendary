package com.calendary.conferencing.application

import java.time.Instant
import java.util.UUID

interface ConferenceService {
	fun createMeeting(command: CreateConferenceCommand): ConferenceResult?
}

data class CreateConferenceCommand(
	val requestId: UUID,
	val title: String,
	val description: String,
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String,
	val attendeeEmail: String,
)

data class ConferenceResult(
	val url: String,
	val externalCalendarEventId: String?,
)

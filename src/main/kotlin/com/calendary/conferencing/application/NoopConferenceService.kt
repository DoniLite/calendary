package com.calendary.conferencing.application

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Service

@Service
@ConditionalOnProperty(prefix = "app.google.calendar", name = ["enabled"], havingValue = "false", matchIfMissing = true)
class NoopConferenceService : ConferenceService {
	override fun createMeeting(command: CreateConferenceCommand): ConferenceResult? = null
}

package com.calendary.events.infra

import com.calendary.events.domain.EventParticipant
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface EventParticipantRepository : JpaRepository<EventParticipant, UUID> {
	fun findByUserId(userId: UUID): List<EventParticipant>
}

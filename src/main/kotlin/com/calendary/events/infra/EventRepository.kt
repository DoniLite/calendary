package com.calendary.events.infra

import com.calendary.events.domain.Event
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface EventRepository : JpaRepository<Event, UUID> {
	fun findFirstByIdAndWorkspaceId(id: UUID, workspaceId: UUID): Optional<Event>
}

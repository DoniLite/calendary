package com.calendary.calendar.infra

import com.calendary.calendar.domain.CalendarBlock
import com.calendary.calendar.domain.CalendarBlockSourceType
import java.time.Instant
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface CalendarBlockRepository : JpaRepository<CalendarBlock, UUID> {
	fun findByWorkspaceIdAndStartsAtLessThanAndEndsAtGreaterThanOrderByStartsAtAsc(
		workspaceId: UUID,
		endsBefore: Instant,
		startsAfter: Instant,
	): List<CalendarBlock>

	fun findBySourceTypeAndSourceId(sourceType: CalendarBlockSourceType, sourceId: UUID): Optional<CalendarBlock>

	fun existsByWorkspaceIdAndStartsAtLessThanAndEndsAtGreaterThanAndBusyIsTrue(
		workspaceId: UUID,
		endsBefore: Instant,
		startsAfter: Instant,
	): Boolean
}

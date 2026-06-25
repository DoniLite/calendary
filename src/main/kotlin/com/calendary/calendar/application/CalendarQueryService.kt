package com.calendary.calendar.application

import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.calendar.infra.CalendarBlockRepository
import com.calendary.resources.application.ResourceAccessService
import com.calendary.resources.domain.ResourceType
import com.calendary.workspaces.application.WorkspaceAccessService
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class CalendarQueryService(
	private val calendarBlocks: CalendarBlockRepository,
	private val workspaceAccess: WorkspaceAccessService,
	private val resourceAccess: ResourceAccessService,
) {
	@Transactional(readOnly = true)
	fun getCalendar(command: CalendarQuery): CalendarView {
		require(command.end.isAfter(command.start)) { "Calendar end must be after start." }
		workspaceAccess.requireRead(command.workspaceId, command.userId)
		val isOwner = workspaceAccess.isOwner(command.workspaceId, command.userId)
		val blocks = calendarBlocks
			.findByWorkspaceIdAndStartsAtLessThanAndEndsAtGreaterThanOrderByStartsAtAsc(
				workspaceId = command.workspaceId,
				endsBefore = command.end,
				startsAfter = command.start,
			)
			.filter { isOwner || resourceAccess.isVisibleToCollaborator(ResourceType.valueOf(it.sourceType.name), it.sourceId, command.userId) }
			.map {
				CalendarItem(
					id = it.id,
					title = it.title,
					startsAt = it.startsAt,
					endsAt = it.endsAt,
					timezone = it.timezone,
					sourceType = it.sourceType,
					sourceId = it.sourceId,
					visibility = it.visibility,
					colorPreset = it.colorPreset,
					busy = it.busy,
				)
			}

		return CalendarView(
			workspaceId = command.workspaceId,
			start = command.start,
			end = command.end,
			items = blocks,
		)
	}
}

data class CalendarQuery(
	val workspaceId: UUID,
	val userId: UUID,
	val start: Instant,
	val end: Instant,
)

data class CalendarView(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
	val items: List<CalendarItem>,
)

data class CalendarItem(
	val id: UUID,
	val title: String,
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String,
	val sourceType: CalendarBlockSourceType,
	val sourceId: UUID,
	val visibility: CalendarVisibility,
	val colorPreset: CalendarColorPreset,
	val busy: Boolean,
)

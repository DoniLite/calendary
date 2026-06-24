package com.calendary.publiccalendar.application

import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.calendar.infra.CalendarBlockRepository
import com.calendary.workspaces.infra.WorkspaceRepository
import java.time.Duration
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PublicCalendarService(
	private val workspaces: WorkspaceRepository,
	private val calendarBlocks: CalendarBlockRepository,
) {
	@Transactional(readOnly = true)
	fun getPublicCalendar(query: PublicCalendarQuery): PublicCalendarView {
		require(query.end.isAfter(query.start)) { "Calendar end must be after start." }
		workspaces.findById(query.workspaceId)
			.orElseThrow { IllegalArgumentException("Workspace not found.") }

		val items = calendarBlocks
			.findByWorkspaceIdAndStartsAtLessThanAndEndsAtGreaterThanOrderByStartsAtAsc(
				workspaceId = query.workspaceId,
				endsBefore = query.end,
				startsAfter = query.start,
			)
			.filter { it.busy }
			.map {
				val public = it.visibility == CalendarVisibility.PUBLIC
				PublicCalendarItem(
					startsAt = it.startsAt,
					endsAt = it.endsAt,
					busy = true,
					public = public,
					sourceId = if (public) it.sourceId else null,
					title = if (public) it.title else null,
					sourceType = if (public) it.sourceType.name else null,
					colorPreset = if (public) it.colorPreset else null,
				)
			}

		return PublicCalendarView(
			workspaceId = query.workspaceId,
			start = query.start,
			end = query.end,
			items = items,
		)
	}

	@Transactional(readOnly = true)
	fun getPublicCalendarItem(query: PublicCalendarItemQuery): PublicCalendarItem {
		workspaces.findById(query.workspaceId)
			.orElseThrow { IllegalArgumentException("Workspace not found.") }

		val block = calendarBlocks
			.findBySourceTypeAndSourceIdAndWorkspaceId(query.sourceType, query.sourceId, query.workspaceId)
			.orElseThrow { IllegalArgumentException("Public calendar item not found.") }

		require(block.visibility == CalendarVisibility.PUBLIC) { "Calendar item is not public." }

		return PublicCalendarItem(
			startsAt = block.startsAt,
			endsAt = block.endsAt,
			busy = block.busy,
			public = true,
			sourceId = block.sourceId,
			title = block.title,
			sourceType = block.sourceType.name,
			colorPreset = block.colorPreset,
		)
	}

	@Transactional(readOnly = true)
	fun getAvailability(query: PublicAvailabilityQuery): PublicAvailabilityView {
		require(query.end.isAfter(query.start)) { "Availability end must be after start." }
		require(query.slotMinutes in 5..240) { "Slot minutes must be between 5 and 240." }
		workspaces.findById(query.workspaceId)
			.orElseThrow { IllegalArgumentException("Workspace not found.") }

		val busyBlocks = calendarBlocks
			.findByWorkspaceIdAndStartsAtLessThanAndEndsAtGreaterThanOrderByStartsAtAsc(
				workspaceId = query.workspaceId,
				endsBefore = query.end,
				startsAfter = query.start,
			)
			.filter { it.busy }

		val slotDuration = Duration.ofMinutes(query.slotMinutes.toLong())
		val slots = generateSequence(query.start) { previous -> previous.plus(slotDuration) }
			.takeWhile { slotStart -> slotStart.plus(slotDuration) <= query.end }
			.map { slotStart ->
				val slotEnd = slotStart.plus(slotDuration)
				PublicAvailabilitySlot(
					startsAt = slotStart,
					endsAt = slotEnd,
					available = busyBlocks.none { block -> block.startsAt < slotEnd && block.endsAt > slotStart },
				)
			}
			.filter { it.available }
			.toList()

		return PublicAvailabilityView(
			workspaceId = query.workspaceId,
			start = query.start,
			end = query.end,
			slotMinutes = query.slotMinutes,
			slots = slots,
		)
	}
}

data class PublicCalendarQuery(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
)

data class PublicCalendarItemQuery(
	val workspaceId: UUID,
	val sourceType: CalendarBlockSourceType,
	val sourceId: UUID,
)

data class PublicCalendarView(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
	val items: List<PublicCalendarItem>,
)

data class PublicCalendarItem(
	val startsAt: Instant,
	val endsAt: Instant,
	val busy: Boolean,
	val public: Boolean,
	val sourceId: UUID?,
	val title: String?,
	val sourceType: String?,
	val colorPreset: CalendarColorPreset?,
)

data class PublicAvailabilityQuery(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
	val slotMinutes: Int = 30,
)

data class PublicAvailabilityView(
	val workspaceId: UUID,
	val start: Instant,
	val end: Instant,
	val slotMinutes: Int,
	val slots: List<PublicAvailabilitySlot>,
)

data class PublicAvailabilitySlot(
	val startsAt: Instant,
	val endsAt: Instant,
	val available: Boolean,
)

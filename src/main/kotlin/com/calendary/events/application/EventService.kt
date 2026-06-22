package com.calendary.events.application

import com.calendary.calendar.domain.CalendarBlock
import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.calendar.infra.CalendarBlockRepository
import com.calendary.events.domain.Event
import com.calendary.events.domain.EventStatus
import com.calendary.events.infra.EventRepository
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.application.WorkspaceAccessService
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class EventService(
	private val events: EventRepository,
	private val calendarBlocks: CalendarBlockRepository,
	private val users: UserAccountRepository,
	private val workspaceAccess: WorkspaceAccessService,
) {
	@Transactional
	fun create(command: CreateEventCommand): Event {
		require(command.title.isNotBlank()) { "Event title is required." }
		require(command.endsAt.isAfter(command.startsAt)) { "Event end must be after start." }

		val workspace = workspaceAccess.requireWrite(command.workspaceId, command.userId)
		val creator = users.findById(command.userId)
			.orElseThrow { IllegalArgumentException("User not found.") }
		val event = events.save(
			Event(
				workspace = workspace,
				createdBy = creator,
				title = command.title.trim(),
				description = command.description,
				startsAt = command.startsAt,
				endsAt = command.endsAt,
				timezone = command.timezone.ifBlank { "UTC" },
				visibility = command.visibility,
				status = EventStatus.CONFIRMED,
			),
		)
		calendarBlocks.save(
			CalendarBlock(
				workspace = workspace,
				title = event.title,
				startsAt = event.startsAt,
				endsAt = event.endsAt,
				timezone = event.timezone,
				sourceType = CalendarBlockSourceType.EVENT,
				sourceId = event.id,
				visibility = event.visibility,
				busy = true,
			),
		)
		return event
	}

	@Transactional(readOnly = true)
	fun get(workspaceId: UUID, eventId: UUID, userId: UUID): Event {
		workspaceAccess.requireRead(workspaceId, userId)
		return events.findByIdAndWorkspaceId(eventId, workspaceId)
			.orElseThrow { IllegalArgumentException("Event not found.") }
	}

	@Transactional
	fun update(command: UpdateEventCommand): Event {
		require(command.title.isNotBlank()) { "Event title is required." }
		require(command.endsAt.isAfter(command.startsAt)) { "Event end must be after start." }
		workspaceAccess.requireWrite(command.workspaceId, command.userId)
		val event = events.findByIdAndWorkspaceId(command.eventId, command.workspaceId)
			.orElseThrow { IllegalArgumentException("Event not found.") }
		event.title = command.title.trim()
		event.description = command.description
		event.startsAt = command.startsAt
		event.endsAt = command.endsAt
		event.timezone = command.timezone.ifBlank { "UTC" }
		event.visibility = command.visibility
		event.status = command.status

		val block = calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.EVENT, event.id)
			.orElseThrow { IllegalStateException("Event calendar block not found.") }
		block.title = event.title
		block.startsAt = event.startsAt
		block.endsAt = event.endsAt
		block.timezone = event.timezone
		block.visibility = event.visibility
		block.busy = event.status != EventStatus.CANCELLED

		return event
	}

	@Transactional
	fun delete(workspaceId: UUID, eventId: UUID, userId: UUID) {
		workspaceAccess.requireWrite(workspaceId, userId)
		val event = events.findByIdAndWorkspaceId(eventId, workspaceId)
			.orElseThrow { IllegalArgumentException("Event not found.") }
		calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.EVENT, event.id)
			.ifPresent { calendarBlocks.delete(it) }
		events.delete(event)
	}
}

data class CreateEventCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val title: String,
	val description: String = "",
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String = "UTC",
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
)

data class UpdateEventCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val eventId: UUID,
	val title: String,
	val description: String = "",
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String = "UTC",
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val status: EventStatus = EventStatus.CONFIRMED,
)

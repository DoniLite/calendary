package com.calendary.events.application

import com.calendary.calendar.domain.CalendarBlock
import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.calendar.infra.CalendarBlockRepository
import com.calendary.events.domain.Event
import com.calendary.events.domain.EventParticipant
import com.calendary.events.domain.EventStatus
import com.calendary.events.infra.EventRepository
import com.calendary.notifications.application.CreateNotificationCommand
import com.calendary.notifications.application.NotificationService
import com.calendary.notifications.domain.NotificationType
import com.calendary.resources.application.ResourceAccessService
import com.calendary.resources.domain.ResourceType
import com.calendary.users.domain.UserAccount
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.application.WorkspaceAccessService
import java.time.Instant
import java.util.UUID
import org.hibernate.Hibernate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class EventService(
	private val events: EventRepository,
	private val calendarBlocks: CalendarBlockRepository,
	private val users: UserAccountRepository,
	private val workspaceAccess: WorkspaceAccessService,
	private val resourceAccess: ResourceAccessService,
	private val notifications: NotificationService,
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
				conferenceUrl = command.conferenceUrl,
				externalCalendarEventId = command.externalCalendarEventId,
				visibility = command.visibility,
				colorPreset = command.colorPreset,
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
				colorPreset = event.colorPreset,
				busy = true,
			),
		)
		syncParticipants(event, command.participantEmails, creator)
		initializeParticipants(event)
		return event
	}

	@Transactional(readOnly = true)
	fun get(workspaceId: UUID, eventId: UUID, userId: UUID): Event {
		workspaceAccess.requireRead(workspaceId, userId)
		val event = events.findFirstByIdAndWorkspaceId(eventId, workspaceId)
			.orElseThrow { IllegalArgumentException("Event not found.") }
		if (!workspaceAccess.isOwner(workspaceId, userId) && !resourceAccess.isVisibleToCollaborator(ResourceType.EVENT, event.id, userId)) {
			throw IllegalArgumentException("Event not found.")
		}
		initializeParticipants(event)
		return event
	}

	@Transactional
	fun update(command: UpdateEventCommand): Event {
		require(command.title.isNotBlank()) { "Event title is required." }
		require(command.endsAt.isAfter(command.startsAt)) { "Event end must be after start." }
		val event = events.findFirstByIdAndWorkspaceId(command.eventId, command.workspaceId)
			.orElseThrow { IllegalArgumentException("Event not found.") }
		resourceAccess.requireWrite(ResourceType.EVENT, event.id, command.userId)
		val actor = users.findById(command.userId)
			.orElseThrow { IllegalArgumentException("User not found.") }
		event.title = command.title.trim()
		event.description = command.description
		event.startsAt = command.startsAt
		event.endsAt = command.endsAt
		event.timezone = command.timezone.ifBlank { "UTC" }
		event.visibility = command.visibility
		event.colorPreset = command.colorPreset
		event.status = command.status

		val block = calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.EVENT, event.id)
			.orElseThrow { IllegalStateException("Event calendar block not found.") }
		block.title = event.title
		block.startsAt = event.startsAt
		block.endsAt = event.endsAt
		block.timezone = event.timezone
		block.visibility = event.visibility
		block.colorPreset = event.colorPreset
		block.busy = event.status != EventStatus.CANCELLED

		syncParticipants(event, command.participantEmails, actor)
		initializeParticipants(event)
		return event
	}

	private fun initializeParticipants(event: Event) {
		Hibernate.initialize(event.participants)
		event.participants.forEach { Hibernate.initialize(it.user) }
	}

	private fun syncParticipants(event: Event, participantEmails: List<String>, actor: UserAccount) {
		val resolved = participantEmails
			.map { it.trim() }
			.filter { it.isNotBlank() }
			.distinctBy { it.lowercase() }
			.map { email ->
				users.findByEmailIgnoreCase(email)
					.orElseThrow { IllegalArgumentException("Participant not found: $email") }
			}
		val previousUserIds = event.participants.mapNotNull { it.user?.id }.toSet()
		val newParticipants = resolved.filterNot { previousUserIds.contains(it.id) }

		event.participants.clear()
		resolved.forEach { user -> event.participants.add(EventParticipant(event = event, user = user)) }

		newParticipants.forEach { user ->
			notifications.notify(
				CreateNotificationCommand(
					recipientId = user.id,
					type = NotificationType.EVENT_PARTICIPANT_ADDED,
					title = "You were added to an event",
					body = "${actor.email} added you as a participant on \"${event.title}\".",
					resourceType = ResourceType.EVENT.name,
					resourceId = event.id,
					actionUrl = "/events/${event.id}",
				),
			)
		}
	}

	@Transactional
	fun delete(workspaceId: UUID, eventId: UUID, userId: UUID) {
		val event = events.findFirstByIdAndWorkspaceId(eventId, workspaceId)
			.orElseThrow { IllegalArgumentException("Event not found.") }
		resourceAccess.requireWrite(ResourceType.EVENT, event.id, userId)
		calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.EVENT, event.id)
			.ifPresent { calendarBlocks.delete(it) }
		events.delete(event)
	}
}

data class CreateEventCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val title: String,
	val startsAt: Instant,
	val endsAt: Instant,
	val description: String = "",
	val timezone: String = "UTC",
	val conferenceUrl: String? = null,
	val externalCalendarEventId: String? = null,
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val colorPreset: CalendarColorPreset = CalendarColorPreset.BLUE,
	val participantEmails: List<String> = emptyList(),
)

data class UpdateEventCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val eventId: UUID,
	val title: String,
	val startsAt: Instant,
	val endsAt: Instant,
	val description: String = "",
	val timezone: String = "UTC",
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val colorPreset: CalendarColorPreset = CalendarColorPreset.BLUE,
	val status: EventStatus = EventStatus.CONFIRMED,
	val participantEmails: List<String> = emptyList(),
)

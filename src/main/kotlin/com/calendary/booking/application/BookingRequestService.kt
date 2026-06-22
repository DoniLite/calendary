package com.calendary.booking.application

import com.calendary.booking.domain.BookingRequest
import com.calendary.booking.domain.BookingRequestStatus
import com.calendary.booking.infra.BookingRequestRepository
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.calendar.infra.CalendarBlockRepository
import com.calendary.events.application.CreateEventCommand
import com.calendary.events.application.EventService
import com.calendary.mail.application.MailService
import com.calendary.mail.application.SendMailCommand
import com.calendary.notifications.application.CreateNotificationCommand
import com.calendary.notifications.application.NotificationService
import com.calendary.notifications.domain.NotificationType
import com.calendary.workspaces.infra.WorkspaceRepository
import java.time.Instant
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class BookingRequestService(
	private val bookingRequests: BookingRequestRepository,
	private val workspaces: WorkspaceRepository,
	private val calendarBlocks: CalendarBlockRepository,
	private val notifications: NotificationService,
	private val events: EventService,
	private val mail: MailService,
) {
	@Transactional
	fun create(command: CreateBookingRequestCommand): BookingRequest {
		require(command.requesterName.isNotBlank()) { "Requester name is required." }
		require(command.requesterEmail.isNotBlank()) { "Requester email is required." }
		require(command.endsAt.isAfter(command.startsAt)) { "Booking request end must be after start." }

		val workspace = workspaces.findById(command.workspaceId)
			.orElseThrow { IllegalArgumentException("Workspace not found.") }
		val busy = calendarBlocks.existsByWorkspaceIdAndStartsAtLessThanAndEndsAtGreaterThanAndBusyIsTrue(
			workspaceId = command.workspaceId,
			endsBefore = command.endsAt,
			startsAfter = command.startsAt,
		)
		check(!busy) { "Requested time is not available." }

		val bookingRequest = bookingRequests.save(
			BookingRequest(
				workspace = workspace,
				requesterName = command.requesterName.trim(),
				requesterEmail = command.requesterEmail.trim().lowercase(),
				message = command.message,
				startsAt = command.startsAt,
				endsAt = command.endsAt,
				timezone = command.timezone.ifBlank { "UTC" },
				status = BookingRequestStatus.PENDING,
			),
		)

		val owner = workspace.owner ?: error("Workspace has no owner.")
		notifications.notify(
			CreateNotificationCommand(
				recipientId = owner.id,
				type = NotificationType.BOOKING_REQUESTED,
				title = "New booking request",
				body = "${bookingRequest.requesterName} requested a meeting.",
				resourceType = "booking_request",
				resourceId = bookingRequest.id,
			),
		)
		mail.send(
			SendMailCommand(
				to = owner.email,
				subject = "New Calendary booking request",
				body = "${bookingRequest.requesterName} requested a meeting from ${bookingRequest.startsAt} to ${bookingRequest.endsAt}.",
			),
		)

		return bookingRequest
	}

	@Transactional(readOnly = true)
	fun listForWorkspace(workspaceId: UUID): List<BookingRequest> =
		bookingRequests.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)

	@Transactional
	fun accept(command: DecideBookingRequestCommand): BookingRequest {
		val bookingRequest = bookingRequests.findByIdAndWorkspaceId(command.bookingRequestId, command.workspaceId)
			.orElseThrow { IllegalArgumentException("Booking request not found.") }
		check(bookingRequest.status == BookingRequestStatus.PENDING) { "Booking request is not pending." }
		val busy = calendarBlocks.existsByWorkspaceIdAndStartsAtLessThanAndEndsAtGreaterThanAndBusyIsTrue(
			workspaceId = command.workspaceId,
			endsBefore = bookingRequest.endsAt,
			startsAfter = bookingRequest.startsAt,
		)
		check(!busy) { "Requested time is not available." }

		events.create(
			CreateEventCommand(
				workspaceId = command.workspaceId,
				userId = command.decidedByUserId,
				title = "Meeting with ${bookingRequest.requesterName}",
				description = bookingRequest.message,
				startsAt = bookingRequest.startsAt,
				endsAt = bookingRequest.endsAt,
				timezone = bookingRequest.timezone,
				visibility = CalendarVisibility.PRIVATE,
			),
		)
		bookingRequest.status = BookingRequestStatus.ACCEPTED
		notifyOwner(bookingRequest, NotificationType.BOOKING_ACCEPTED, "Booking request accepted")
		mail.send(
			SendMailCommand(
				to = bookingRequest.requesterEmail,
				subject = "Your Calendary booking request was accepted",
				body = "Your meeting request from ${bookingRequest.startsAt} to ${bookingRequest.endsAt} was accepted.",
			),
		)
		return bookingRequest
	}

	@Transactional
	fun reject(command: DecideBookingRequestCommand): BookingRequest {
		val bookingRequest = bookingRequests.findByIdAndWorkspaceId(command.bookingRequestId, command.workspaceId)
			.orElseThrow { IllegalArgumentException("Booking request not found.") }
		check(bookingRequest.status == BookingRequestStatus.PENDING) { "Booking request is not pending." }
		bookingRequest.status = BookingRequestStatus.REJECTED
		notifyOwner(bookingRequest, NotificationType.BOOKING_REJECTED, "Booking request rejected")
		mail.send(
			SendMailCommand(
				to = bookingRequest.requesterEmail,
				subject = "Your Calendary booking request was rejected",
				body = "Your meeting request from ${bookingRequest.startsAt} to ${bookingRequest.endsAt} was rejected.",
			),
		)
		return bookingRequest
	}

	private fun notifyOwner(bookingRequest: BookingRequest, type: NotificationType, title: String) {
		val workspace = bookingRequest.workspace ?: error("Booking request has no workspace.")
		val owner = workspace.owner ?: error("Workspace has no owner.")
		notifications.notify(
			CreateNotificationCommand(
				recipientId = owner.id,
				type = type,
				title = title,
				body = "${bookingRequest.requesterName}'s request is now ${bookingRequest.status.name.lowercase()}.",
				resourceType = "booking_request",
				resourceId = bookingRequest.id,
			),
		)
	}
}

data class CreateBookingRequestCommand(
	val workspaceId: UUID,
	val requesterName: String,
	val requesterEmail: String,
	val message: String = "",
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String = "UTC",
)

data class DecideBookingRequestCommand(
	val workspaceId: UUID,
	val bookingRequestId: UUID,
	val decidedByUserId: UUID,
)

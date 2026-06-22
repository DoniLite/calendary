package com.calendary.booking.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.workspaces.domain.Workspace
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "booking_requests")
open class BookingRequest(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workspace_id", nullable = false)
	open var workspace: Workspace? = null,

	@Column(name = "requester_name", nullable = false)
	open var requesterName: String = "",

	@Column(name = "requester_email", nullable = false)
	open var requesterEmail: String = "",

	@Column(nullable = false)
	open var message: String = "",

	@Column(name = "starts_at", nullable = false)
	open var startsAt: Instant = Instant.now(),

	@Column(name = "ends_at", nullable = false)
	open var endsAt: Instant = Instant.now(),

	@Column(nullable = false)
	open var timezone: String = "UTC",

	@Column(name = "conference_url")
	open var conferenceUrl: String? = null,

	@Column(name = "external_calendar_event_id")
	open var externalCalendarEventId: String? = null,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var status: BookingRequestStatus = BookingRequestStatus.PENDING,
) : AuditableEntity()

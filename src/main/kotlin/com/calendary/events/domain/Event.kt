package com.calendary.events.domain

import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.common.persistence.AuditableEntity
import com.calendary.users.domain.UserAccount
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
@Table(name = "events")
open class Event(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workspace_id", nullable = false)
	open var workspace: Workspace? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "created_by_id", nullable = false)
	open var createdBy: UserAccount? = null,

	@Column(nullable = false)
	open var title: String = "",

	@Column(nullable = false)
	open var description: String = "",

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
	open var visibility: CalendarVisibility = CalendarVisibility.PRIVATE,

	@Enumerated(EnumType.STRING)
	@Column(name = "color_preset", nullable = false)
	open var colorPreset: CalendarColorPreset = CalendarColorPreset.BLUE,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var status: EventStatus = EventStatus.CONFIRMED,
) : AuditableEntity()

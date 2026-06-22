package com.calendary.calendar.domain

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
import java.util.UUID

@Entity
@Table(name = "calendar_blocks")
open class CalendarBlock(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workspace_id", nullable = false)
	open var workspace: Workspace? = null,

	@Column(nullable = false)
	open var title: String = "",

	@Column(name = "starts_at", nullable = false)
	open var startsAt: Instant = Instant.now(),

	@Column(name = "ends_at", nullable = false)
	open var endsAt: Instant = Instant.now(),

	@Column(nullable = false)
	open var timezone: String = "UTC",

	@Enumerated(EnumType.STRING)
	@Column(name = "source_type", nullable = false)
	open var sourceType: CalendarBlockSourceType = CalendarBlockSourceType.EVENT,

	@Column(name = "source_id", nullable = false)
	open var sourceId: UUID = UUID.randomUUID(),

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var visibility: CalendarVisibility = CalendarVisibility.PRIVATE,

	@Column(nullable = false)
	open var busy: Boolean = true,
) : AuditableEntity()

package com.calendary.events.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.users.domain.UserAccount
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "event_participants")
open class EventParticipant(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "event_id", nullable = false)
	open var event: Event? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	open var user: UserAccount? = null,
) : AuditableEntity()

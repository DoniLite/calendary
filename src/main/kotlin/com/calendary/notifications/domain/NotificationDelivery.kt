package com.calendary.notifications.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.users.domain.UserAccount
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "notification_deliveries")
open class NotificationDelivery(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "notification_id", nullable = false)
	open var notification: Notification? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "recipient_id", nullable = false)
	open var recipient: UserAccount? = null,

	@Column(name = "read_at")
	open var readAt: Instant? = null,
) : AuditableEntity()

package com.calendary.notifications.domain

import com.calendary.common.persistence.AuditableEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "notifications")
open class Notification(
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var type: NotificationType = NotificationType.RESOURCE_UPDATED,

	@Column(nullable = false)
	open var title: String = "",

	@Column(nullable = false)
	open var body: String = "",

	@Column(name = "resource_type")
	open var resourceType: String? = null,

	@Column(name = "resource_id")
	open var resourceId: UUID? = null,

	@Column(name = "action_url")
	open var actionUrl: String? = null,
) : AuditableEntity()

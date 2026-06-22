package com.calendary.notifications.api.dto

import com.calendary.notifications.application.NotificationPayload
import com.calendary.notifications.domain.NotificationType
import java.time.Instant
import java.util.UUID

data class NotificationResponse(
	val id: UUID,
	val notificationId: UUID,
	val type: NotificationType,
	val title: String,
	val body: String,
	val resourceType: String?,
	val resourceId: UUID?,
	val actionUrl: String?,
	val readAt: Instant?,
	val createdAt: Instant,
)

fun NotificationPayload.toResponse(): NotificationResponse =
	NotificationResponse(
		id = id,
		notificationId = notificationId,
		type = type,
		title = title,
		body = body,
		resourceType = resourceType,
		resourceId = resourceId,
		actionUrl = actionUrl,
		readAt = readAt,
		createdAt = createdAt,
	)

package com.calendary.notifications.application

import com.calendary.notifications.domain.Notification
import com.calendary.notifications.domain.NotificationDelivery
import com.calendary.notifications.domain.NotificationType
import com.calendary.notifications.infra.NotificationDeliveryRepository
import com.calendary.notifications.infra.NotificationRepository
import com.calendary.users.infra.UserAccountRepository
import java.time.Clock
import java.time.Instant
import java.util.UUID
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class NotificationService(
	private val notifications: NotificationRepository,
	private val deliveries: NotificationDeliveryRepository,
	private val users: UserAccountRepository,
	private val messaging: SimpMessagingTemplate,
	private val clock: Clock,
) {
	@Transactional
	fun notify(command: CreateNotificationCommand): NotificationDelivery {
		val recipient = users.findById(command.recipientId)
			.orElseThrow { IllegalArgumentException("Notification recipient not found.") }
		val notification = notifications.save(
			Notification(
				type = command.type,
				title = command.title,
				body = command.body,
				resourceType = command.resourceType,
				resourceId = command.resourceId,
				actionUrl = command.actionUrl,
			),
		)
		val delivery = deliveries.save(
			NotificationDelivery(
				notification = notification,
				recipient = recipient,
			),
		)
		messaging.convertAndSend(
			"/topic/users/${recipient.id}/notifications",
			delivery.toPayload(deliveries.countByRecipientIdAndReadAtIsNull(recipient.id)),
		)
		return delivery
	}

	@Transactional(readOnly = true)
	fun listForUser(userId: UUID): NotificationList {
		val items = deliveries.findByRecipientIdOrderByCreatedAtDesc(userId).map { it.toPayload() }
		return NotificationList(
			items = items,
			unreadCount = deliveries.countByRecipientIdAndReadAtIsNull(userId),
		)
	}

	@Transactional
	fun markAsRead(deliveryId: UUID, userId: UUID): NotificationPayload {
		val delivery = deliveries.findByIdAndRecipientId(deliveryId, userId)
			.orElseThrow { IllegalArgumentException("Notification not found.") }
		if (delivery.readAt == null) {
			delivery.readAt = Instant.now(clock)
		}
		return delivery.toPayload(unreadCount = deliveries.countByRecipientIdAndReadAtIsNull(userId))
	}

	@Transactional
	fun markAllAsRead(userId: UUID): NotificationList {
		deliveries.markAllAsRead(userId)
		return listForUser(userId)
	}

	private fun NotificationDelivery.toPayload(unreadCount: Long? = null): NotificationPayload {
		val notification = notification ?: error("Notification delivery has no notification.")
		return NotificationPayload(
			id = id,
			notificationId = notification.id,
			type = notification.type,
			title = notification.title,
			body = notification.body,
			resourceType = notification.resourceType,
			resourceId = notification.resourceId,
			actionUrl = notification.actionUrl,
			readAt = readAt,
			createdAt = createdAt,
			unreadCount = unreadCount,
		)
	}
}

data class CreateNotificationCommand(
	val recipientId: UUID,
	val type: NotificationType,
	val title: String,
	val body: String,
	val resourceType: String? = null,
	val resourceId: UUID? = null,
	val actionUrl: String? = null,
)

data class NotificationList(
	val items: List<NotificationPayload>,
	val unreadCount: Long,
)

data class NotificationPayload(
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
	val unreadCount: Long? = null,
)

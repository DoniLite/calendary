package com.calendary.notifications.infra

import com.calendary.notifications.domain.NotificationDelivery
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query

interface NotificationDeliveryRepository : JpaRepository<NotificationDelivery, UUID> {
	@EntityGraph(attributePaths = ["notification"])
	fun findByRecipientIdOrderByCreatedAtDesc(recipientId: UUID): List<NotificationDelivery>

	@EntityGraph(attributePaths = ["notification"])
	fun findByIdAndRecipientId(id: UUID, recipientId: UUID): Optional<NotificationDelivery>

	fun countByRecipientIdAndReadAtIsNull(recipientId: UUID): Long

	@Modifying
	@Query("update NotificationDelivery delivery set delivery.readAt = current_timestamp where delivery.recipient.id = :recipientId and delivery.readAt is null")
	fun markAllAsRead(recipientId: UUID): Int
}

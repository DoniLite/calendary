package com.calendary.notifications.infra

import com.calendary.notifications.domain.Notification
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface NotificationRepository : JpaRepository<Notification, UUID> {
	fun deleteByResourceId(resourceId: UUID)

	fun deleteByResourceIdIn(resourceIds: Collection<UUID>)
}

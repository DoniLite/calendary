package com.calendary.notifications.infra

import com.calendary.notifications.domain.Notification
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface NotificationRepository : JpaRepository<Notification, UUID>

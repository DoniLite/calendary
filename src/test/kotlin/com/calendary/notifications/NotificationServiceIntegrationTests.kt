package com.calendary.notifications

import com.calendary.notifications.application.CreateNotificationCommand
import com.calendary.notifications.application.NotificationService
import com.calendary.notifications.domain.NotificationType
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.transaction.annotation.Transactional

class NotificationServiceIntegrationTests(
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val notifications: NotificationService,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `creates notification delivery for user`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		val delivery = notifications.notify(
			CreateNotificationCommand(
				recipientId = superAdmin.id,
				type = NotificationType.RESOURCE_UPDATED,
				title = "Resource updated",
				body = "A shared resource changed.",
			),
		)

		assertEquals(superAdmin.id, delivery.recipient?.id)
		assertEquals(NotificationType.RESOURCE_UPDATED, delivery.notification?.type)
		assertNull(delivery.readAt)
		assertEquals(1, notifications.listForUser(superAdmin.id).unreadCount)
	}

	@Test
	@Transactional
	fun `marks one notification as read`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val delivery = notifications.notify(
			CreateNotificationCommand(
				recipientId = superAdmin.id,
				type = NotificationType.RESOURCE_UPDATED,
				title = "Resource updated",
				body = "A shared resource changed.",
			),
		)

		val readNotification = notifications.markAsRead(delivery.id, superAdmin.id)

		assertNotNull(readNotification.readAt)
		assertEquals(0, notifications.listForUser(superAdmin.id).unreadCount)
	}
}

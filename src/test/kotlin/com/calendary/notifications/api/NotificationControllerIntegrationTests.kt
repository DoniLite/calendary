package com.calendary.notifications.api

import com.calendary.notifications.application.CreateNotificationCommand
import com.calendary.notifications.application.NotificationService
import com.calendary.notifications.domain.NotificationType
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch as mvcPatch
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class NotificationControllerIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val notifications: NotificationService,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `lists current user notifications`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		notifications.notify(
			CreateNotificationCommand(
				recipientId = superAdmin.id,
				type = NotificationType.RESOURCE_UPDATED,
				title = "Resource updated",
				body = "A shared resource changed.",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(mvcGet("/api/notifications").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.unreadCount").value(1))
			.andExpect(jsonPath("$.items[0].title").value("Resource updated"))
	}

	@Test
	@Transactional
	fun `marks notification as read over http`() {
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
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(mvcPatch("/api/notifications/${delivery.id}/read").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.readAt").exists())
	}

	@Test
	@Transactional
	fun `requires session to list notifications`() {
		mockMvc.get("/api/notifications")
			.andExpect {
				status { isUnauthorized() }
				jsonPath("$.code") { value("unauthorized") }
			}
	}

	private fun loginAs(email: String, password: String): MockHttpSession {
		val result = mockMvc.post("/api/auth/login") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "email": "$email",
				  "password": "$password"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isOk() }
			}
			.andReturn()

		return result.request.session as MockHttpSession
	}
}

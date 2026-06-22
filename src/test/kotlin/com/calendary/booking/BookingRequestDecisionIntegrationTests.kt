package com.calendary.booking

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceRepository
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

class BookingRequestDecisionIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `accepts booking request and creates calendar event`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val bookingRequestId = createBookingRequest(workspaceId)

		mockMvc.perform(mvcPatch("/api/workspaces/$workspaceId/booking-requests/$bookingRequestId/accept").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("ACCEPTED"))

		mockMvc.perform(
			mvcGet("/api/workspaces/$workspaceId/calendar")
				.session(session)
				.param("start", "2026-07-01T00:00:00Z")
				.param("end", "2026-07-02T00:00:00Z"),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.items[0].title").value("Meeting with Ada Lovelace"))
			.andExpect(jsonPath("$.items[0].sourceType").value("EVENT"))
	}

	@Test
	@Transactional
	fun `rejects booking request without creating calendar event`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val bookingRequestId = createBookingRequest(workspaceId)

		mockMvc.perform(mvcPatch("/api/workspaces/$workspaceId/booking-requests/$bookingRequestId/reject").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("REJECTED"))

		mockMvc.perform(
			mvcGet("/api/workspaces/$workspaceId/calendar")
				.session(session)
				.param("start", "2026-07-01T00:00:00Z")
				.param("end", "2026-07-02T00:00:00Z"),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(0))
	}

	@Test
	@Transactional
	fun `cannot decide booking request twice`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val bookingRequestId = createBookingRequest(workspaceId)

		mockMvc.perform(mvcPatch("/api/workspaces/$workspaceId/booking-requests/$bookingRequestId/reject").session(session))
			.andExpect(status().isOk)

		mockMvc.perform(mvcPatch("/api/workspaces/$workspaceId/booking-requests/$bookingRequestId/accept").session(session))
			.andExpect(status().isConflict)
			.andExpect(jsonPath("$.code").value("conflict"))
	}

	private fun createBookingRequest(workspaceId: java.util.UUID): String {
		val result = mockMvc.post("/public/workspaces/$workspaceId/booking-requests") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "requesterName": "Ada Lovelace",
				  "requesterEmail": "ada@example.com",
				  "message": "Let's talk.",
				  "startsAt": "2026-07-01T14:00:00Z",
				  "endsAt": "2026-07-01T15:00:00Z",
				  "timezone": "Europe/Paris"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isCreated() }
			}
			.andReturn()

		return com.jayway.jsonpath.JsonPath.read(result.response.contentAsString, "$.id")
	}

	private fun bootstrapWorkspace(): java.util.UUID {
		val user = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		return workspaces.findFirstByOwnerIdAndType(user.id, WorkspaceType.PERSONAL).orElseThrow().id
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

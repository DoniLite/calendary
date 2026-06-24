package com.calendary.publiccalendar

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceRepository
import com.jayway.jsonpath.JsonPath
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class PublicCalendarIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `public calendar masks private occupations and shows public occupations`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val privateEventId = createEvent(workspaceId, session, "Private focus", "PRIVATE", "2026-07-01T09:00:00Z", "2026-07-01T10:00:00Z")
		val publicEventId = createEvent(workspaceId, session, "Public workshop", "PUBLIC", "2026-07-01T11:00:00Z", "2026-07-01T12:00:00Z")

		mockMvc.get("/public/workspaces/$workspaceId/calendar") {
			param("start", "2026-07-01T00:00:00Z")
			param("end", "2026-07-02T00:00:00Z")
		}
			.andExpect {
				status { isOk() }
				jsonPath("$.items.length()") { value(2) }
				jsonPath("$.items[0].public") { value(false) }
				jsonPath("$.items[0].title") { doesNotExist() }
				jsonPath("$.items[0].sourceId") { doesNotExist() }
				jsonPath("$.items[1].public") { value(true) }
				jsonPath("$.items[1].sourceId") { value(publicEventId) }
				jsonPath("$.items[1].title") { value("Public workshop") }
			}

		mockMvc.get("/public/workspaces/$workspaceId/calendar/EVENT/$publicEventId")
			.andExpect {
				status { isOk() }
				jsonPath("$.public") { value(true) }
				jsonPath("$.sourceId") { value(publicEventId) }
				jsonPath("$.title") { value("Public workshop") }
			}

		mockMvc.get("/public/workspaces/$workspaceId/calendar/EVENT/$privateEventId")
			.andExpect {
				status { isBadRequest() }
				jsonPath("$.code") { value("bad_request") }
			}
	}

	@Test
	@Transactional
	fun `creates booking request on free slot and notifies owner`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.post("/public/workspaces/$workspaceId/booking-requests") {
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
				jsonPath("$.requesterEmail") { value("ada@example.com") }
				jsonPath("$.status") { value("PENDING") }
			}

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/booking-requests").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].requesterName").value("Ada Lovelace"))

		mockMvc.perform(mvcGet("/api/notifications").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].type").value("BOOKING_REQUESTED"))
	}

	@Test
	@Transactional
	fun `returns public availability slots excluding busy periods`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		createEvent(workspaceId, session, "Busy slot", "PRIVATE", "2026-07-01T09:30:00Z", "2026-07-01T10:00:00Z")

		mockMvc.get("/public/workspaces/$workspaceId/availability") {
			param("start", "2026-07-01T09:00:00Z")
			param("end", "2026-07-01T11:00:00Z")
			param("slotMinutes", "30")
		}
			.andExpect {
				status { isOk() }
				jsonPath("$.slots.length()") { value(3) }
				jsonPath("$.slots[0].startsAt") { value("2026-07-01T09:00:00Z") }
				jsonPath("$.slots[1].startsAt") { value("2026-07-01T10:00:00Z") }
				jsonPath("$.slots[2].startsAt") { value("2026-07-01T10:30:00Z") }
			}
	}

	@Test
	@Transactional
	fun `rejects booking request on busy slot`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		createEvent(workspaceId, session, "Busy slot", "PRIVATE", "2026-07-01T14:00:00Z", "2026-07-01T15:00:00Z")

		mockMvc.post("/public/workspaces/$workspaceId/booking-requests") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "requesterName": "Ada Lovelace",
				  "requesterEmail": "ada@example.com",
				  "startsAt": "2026-07-01T14:30:00Z",
				  "endsAt": "2026-07-01T15:30:00Z"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isConflict() }
				jsonPath("$.code") { value("conflict") }
			}
	}

	private fun createEvent(
		workspaceId: java.util.UUID,
		session: MockHttpSession,
		title: String,
		visibility: String,
		startsAt: String,
		endsAt: String,
	): String {
		return mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/events")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "$title",
				  "startsAt": "$startsAt",
				  "endsAt": "$endsAt",
				  "visibility": "$visibility"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }
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

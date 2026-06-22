package com.calendary.calendar

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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class CalendarCoreIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `creates event and task then returns calendar feed`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/events")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Client meeting",
				  "description": "Kickoff",
				  "startsAt": "2026-07-01T09:00:00Z",
				  "endsAt": "2026-07-01T10:00:00Z",
				  "timezone": "Europe/Paris",
				  "visibility": "PRIVATE"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.title").value("Client meeting"))

		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Prepare deck",
				  "description": "Slides for kickoff",
				  "priority": "HIGH",
				  "plannedStart": "2026-07-01T11:00:00Z",
				  "plannedEnd": "2026-07-01T12:00:00Z",
				  "timezone": "Europe/Paris"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.title").value("Prepare deck"))

		mockMvc.perform(
			mvcGet("/api/workspaces/$workspaceId/calendar")
				.session(session)
				.param("start", "2026-07-01T00:00:00Z")
				.param("end", "2026-07-02T00:00:00Z"),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(2))
			.andExpect(jsonPath("$.items[0].sourceType").value("EVENT"))
			.andExpect(jsonPath("$.items[1].sourceType").value("TASK"))
	}

	@Test
	@Transactional
	fun `lists tasks for workspace`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Inbox task",
				  "priority": "MEDIUM"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].title").value("Inbox task"))
	}

	@Test
	@Transactional
	fun `requires session for calendar`() {
		val workspaceId = bootstrapWorkspace()

		mockMvc.get("/api/workspaces/$workspaceId/calendar") {
			param("start", "2026-07-01T00:00:00Z")
			param("end", "2026-07-02T00:00:00Z")
		}
			.andExpect {
				status { isUnauthorized() }
				jsonPath("$.code") { value("unauthorized") }
			}
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

package com.calendary.calendar

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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete as mvcDelete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch as mvcPatch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class CalendarMutationIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `updates and deletes event calendar block`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val eventId = createEvent(workspaceId, session)

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/events/$eventId")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Updated meeting",
				  "startsAt": "2026-07-01T10:00:00Z",
				  "endsAt": "2026-07-01T11:00:00Z",
				  "visibility": "PUBLIC",
				  "status": "CONFIRMED"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.title").value("Updated meeting"))

		mockMvc.perform(
			mvcGet("/api/workspaces/$workspaceId/calendar")
				.session(session)
				.param("start", "2026-07-01T00:00:00Z")
				.param("end", "2026-07-02T00:00:00Z"),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].title").value("Updated meeting"))
			.andExpect(jsonPath("$.items[0].visibility").value("PUBLIC"))

		mockMvc.perform(mvcDelete("/api/workspaces/$workspaceId/events/$eventId").session(session))
			.andExpect(status().isNoContent)

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
	fun `updates task planning and removes block when unplanned`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val taskId = createTask(workspaceId, session)

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/tasks/$taskId")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Updated task",
				  "status": "IN_PROGRESS",
				  "priority": "URGENT",
				  "plannedStart": "2026-07-01T13:00:00Z",
				  "plannedEnd": "2026-07-01T14:00:00Z"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("IN_PROGRESS"))

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/tasks/$taskId")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Updated task",
				  "status": "DONE",
				  "priority": "URGENT"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isOk)

		mockMvc.perform(
			mvcGet("/api/workspaces/$workspaceId/calendar")
				.session(session)
				.param("start", "2026-07-01T00:00:00Z")
				.param("end", "2026-07-02T00:00:00Z"),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(0))
	}

	private fun createEvent(workspaceId: java.util.UUID, session: MockHttpSession): String {
		val result = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/events")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Initial meeting",
				  "startsAt": "2026-07-01T09:00:00Z",
				  "endsAt": "2026-07-01T10:00:00Z"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andReturn()
		return JsonPath.read(result.response.contentAsString, "$.id")
	}

	private fun createTask(workspaceId: java.util.UUID, session: MockHttpSession): String {
		val result = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "title": "Initial task",
				  "plannedStart": "2026-07-01T11:00:00Z",
				  "plannedEnd": "2026-07-01T12:00:00Z"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andReturn()
		return JsonPath.read(result.response.contentAsString, "$.id")
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

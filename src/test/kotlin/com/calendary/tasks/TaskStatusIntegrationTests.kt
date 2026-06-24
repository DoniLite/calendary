package com.calendary.tasks

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceRepository
import com.jayway.jsonpath.JsonPath
import java.time.Duration
import java.time.Instant
import java.util.UUID
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch as mvcPatch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class TaskStatusIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `updates only the status and preserves description and calendar block`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val now = Instant.now()

		val taskId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "title": "Plan release",
					  "description": "Detailed release plan",
					  "status": "TODO",
					  "plannedStart": "${now.plus(Duration.ofMinutes(5))}",
					  "plannedEnd": "${now.plus(Duration.ofHours(1))}",
					  "timezone": "UTC"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/tasks/$taskId/status")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"status":"IN_PROGRESS"}"""),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("IN_PROGRESS"))
			.andExpect(jsonPath("$.description").value("Detailed release plan"))

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks/$taskId").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("IN_PROGRESS"))
			.andExpect(jsonPath("$.description").value("Detailed release plan"))

		mockMvc.perform(
			mvcGet("/api/workspaces/$workspaceId/calendar")
				.session(session)
				.param("start", now.toString())
				.param("end", now.plus(Duration.ofHours(2)).toString()),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(1))
			.andExpect(jsonPath("$.items[0].busy").value(true))
	}

	private fun bootstrapWorkspace(): UUID {
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
			.andExpect { status { isOk() } }
			.andReturn()

		return result.request.session as MockHttpSession
	}
}

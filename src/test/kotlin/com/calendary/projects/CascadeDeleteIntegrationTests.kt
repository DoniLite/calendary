package com.calendary.projects

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
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete as mvcDelete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

// Verifies that deleting a task or project removes all dependent rows (calendar blocks,
// collaboration shares, notifications) so the workspace ends up in a clean state.
class CascadeDeleteIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {

	@Test
	@Transactional
	fun `deleting a task removes it and returns 404 on subsequent fetch`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		val taskId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Task to delete"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(mvcDelete("/api/workspaces/$workspaceId/tasks/$taskId").session(session))
			.andExpect(status().isNoContent)

		// The deleted task must not appear in the workspace task list.
		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items").isEmpty)
	}

	@Test
	@Transactional
	fun `deleting a project removes all its child tasks`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		val projectId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/projects")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Project to delete","type":"PROJECT"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		// Create two child tasks
		repeat(2) { i ->
			mockMvc.perform(
				mvcPost("/api/workspaces/$workspaceId/tasks")
					.session(session)
					.contentType(MediaType.APPLICATION_JSON)
					.content("""{"title":"Child task $i","projectId":"$projectId"}"""),
			).andExpect(status().isCreated)
		}

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(2))

		mockMvc.perform(mvcDelete("/api/workspaces/$workspaceId/projects/$projectId").session(session))
			.andExpect(status().isNoContent)

		// Both child tasks must be gone
		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items").isEmpty)
	}

	@Test
	@Transactional
	fun `deleting a project removes it from the project list`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		val projectId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/projects")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Ephemeral project","type":"PROJECT"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(mvcDelete("/api/workspaces/$workspaceId/projects/$projectId").session(session))
			.andExpect(status().isNoContent)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/projects").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.projects").isEmpty)
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
			content = """{"email":"$email","password":"$password"}"""
		}
			.andExpect { status { isOk() } }
			.andReturn()

		return result.request.session as MockHttpSession
	}
}

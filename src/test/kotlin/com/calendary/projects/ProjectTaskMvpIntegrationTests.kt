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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class ProjectTaskMvpIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `creates project epic and task hierarchy`() {
		val workspaceId = bootstrapWorkspace()
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		val projectId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/projects")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "title": "Calendary MVP",
					  "description": "Backend delivery",
					  "type": "PROJECT",
					  "status": "ACTIVE",
					  "visibility": "PRIVATE"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.title").value("Calendary MVP"))
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		val epicId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/projects")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "title": "Planning module",
					  "type": "EPIC",
					  "parentProjectId": "$projectId"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.parentProjectId").value(projectId))
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "title": "Implement project views",
					  "projectId": "$projectId",
					  "epicId": "$epicId",
					  "estimateMinutes": 180,
					  "priority": "HIGH"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.projectId").value(projectId))
			.andExpect(jsonPath("$.epicId").value(epicId))
			.andExpect(jsonPath("$.estimateMinutes").value(180))

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/projects").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.projects.length()").value(2))
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
			.andExpect { status { isOk() } }
			.andReturn()

		return result.request.session as MockHttpSession
	}
}

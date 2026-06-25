package com.calendary.collaboration

import com.calendary.onboarding.application.AcceptInvitationCommand
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceRepository
import com.jayway.jsonpath.JsonPath
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch as mvcPatch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class CollaborationMvpIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `rejects collaboration proposal and records decision`() {
		val workspaceId = bootstrapOwnerAndCollaborator()
		val ownerSession = loginAs("owner@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("assistant@calendary.dev", "collaborator-password")

		val taskId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Task to reject"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		val shareId = mockMvc.perform(
			mvcPost("/api/collaborations")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "resourceType": "TASK",
					  "resourceId": "$taskId",
					  "recipientEmail": "assistant@calendary.dev",
					  "accessLevel": "READ",
					  "message": "Have a look?"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.status").value("PENDING"))
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(mvcPatch("/api/collaborations/$shareId/reject").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("REJECTED"))

		// After rejection the task must not appear in the collaborator's view.
		mockMvc.perform(
			org.springframework.test.web.servlet.request.MockMvcRequestBuilders
				.get("/api/workspaces/$workspaceId/tasks")
				.session(collaboratorSession),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items").isEmpty)
	}

	@Test
	@Transactional
	fun `proposes and accepts collaboration on task`() {
		val workspaceId = bootstrapOwnerAndCollaborator()
		val ownerSession = loginAs("owner@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("assistant@calendary.dev", "collaborator-password")

		val taskId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Shared task"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		val shareId = mockMvc.perform(
			mvcPost("/api/collaborations")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "resourceType": "TASK",
					  "resourceId": "$taskId",
					  "recipientEmail": "assistant@calendary.dev",
					  "accessLevel": "WRITE",
					  "message": "Let's work on this together"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.status").value("PENDING"))
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(mvcPatch("/api/collaborations/$shareId/accept").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("ACCEPTED"))
			.andExpect(jsonPath("$.accessLevel").value("WRITE"))
	}

	private fun bootstrapOwnerAndCollaborator(): java.util.UUID {
		val owner = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val invitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "assistant@calendary.dev",
				invitedById = owner.id,
				accessLevel = WorkspaceAccessLevel.READ,
			),
		)
		onboarding.acceptInvitation(
			AcceptInvitationCommand(
				rawToken = invitation.rawToken,
				password = "collaborator-password",
				workspaceName = "Assistant workspace",
			),
		)
		return workspaces.findFirstByOwnerIdAndType(owner.id, WorkspaceType.PERSONAL).orElseThrow().id
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

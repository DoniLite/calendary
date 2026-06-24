package com.calendary.tasks

import com.calendary.onboarding.application.AcceptInvitationCommand
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceRepository
import com.jayway.jsonpath.JsonPath
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

class TaskAssigneeIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `assigns a collaborator to a task on create and notifies them`() {
		val workspaceId = bootstrapOwnerAndCollaborator()
		val ownerSession = loginAs("owner@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("assistant@calendary.dev", "collaborator-password")

		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Assigned task","assigneeEmails":["assistant@calendary.dev"]}"""),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.assignees[0].email").value("assistant@calendary.dev"))

		mockMvc.perform(mvcGet("/api/notifications").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.unreadCount").value(1))
			.andExpect(jsonPath("$.items[0].type").value("TASK_ASSIGNED"))
	}

	@Test
	@Transactional
	fun `reassigning a task only notifies newly added assignees`() {
		val workspaceId = bootstrapOwnerAndCollaborator()
		val ownerSession = loginAs("owner@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("assistant@calendary.dev", "collaborator-password")

		val taskId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Solo task"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/tasks/$taskId")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Solo task","assigneeEmails":["assistant@calendary.dev"]}"""),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.assignees[0].email").value("assistant@calendary.dev"))

		mockMvc.perform(mvcGet("/api/notifications").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.unreadCount").value(1))

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/tasks/$taskId")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Solo task","assigneeEmails":["assistant@calendary.dev"]}"""),
		)
			.andExpect(status().isOk)

		mockMvc.perform(mvcGet("/api/notifications").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.unreadCount").value(1))
	}

	@Test
	fun `get endpoint with assignees does not fail outside the originating transaction`() {
		val workspaceId = bootstrapOwnerAndCollaborator(ownerEmail = "lazyload-owner@calendary.dev", collaboratorEmail = "lazyload-assistant@calendary.dev")
		val ownerSession = loginAs("lazyload-owner@calendary.dev", "very-secret-password")

		val taskId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Lazy load check","assigneeEmails":["lazyload-assistant@calendary.dev"]}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		// No @Transactional on this test method: the GET below runs in its own
		// fresh transaction, separate from the one that created the task above,
		// reproducing the real production request lifecycle (regression guard
		// for the Task.assignees LazyInitializationException).
		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks/$taskId").session(ownerSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.assignees[0].email").value("lazyload-assistant@calendary.dev"))

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(ownerSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].assignees[0].email").value("lazyload-assistant@calendary.dev"))
	}

	private fun bootstrapOwnerAndCollaborator(ownerEmail: String = "owner@calendary.dev", collaboratorEmail: String = "assistant@calendary.dev"): UUID {
		val owner = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = ownerEmail,
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val invitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = collaboratorEmail,
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

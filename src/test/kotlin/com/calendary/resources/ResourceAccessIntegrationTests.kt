package com.calendary.resources

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
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch as mvcPatch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

// Regression coverage for a critical access-control bug: an invited collaborator (a plain
// WorkspaceMembership row) used to see every project/task/event in the owner's workspace, with
// no per-resource check. Visibility for a non-owner member must now follow explicit
// ResourceShare grants only, cascading from a shared Project/Epic down to its tasks.
class ResourceAccessIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `collaborator sees nothing in the owner's workspace until something is explicitly shared`() {
		val workspaceId = bootstrapOwnerAndCollaborator()
		val ownerSession = loginAs("rbac-owner@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("rbac-assistant@calendary.dev", "collaborator-password")

		val projectId = createProject(workspaceId, ownerSession)
		createTask(workspaceId, ownerSession, projectId)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/projects").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.projects").isEmpty)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items").isEmpty)
	}

	@Test
	@Transactional
	fun `sharing a project cascades visibility to its tasks without sharing them individually`() {
		val workspaceId = bootstrapOwnerAndCollaborator(ownerEmail = "rbac-owner2@calendary.dev", collaboratorEmail = "rbac-assistant2@calendary.dev")
		val ownerSession = loginAs("rbac-owner2@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("rbac-assistant2@calendary.dev", "collaborator-password")

		val projectId = createProject(workspaceId, ownerSession)
		val taskId = createTask(workspaceId, ownerSession, projectId)

		val shareId = mockMvc.perform(
			mvcPost("/api/collaborations")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"resourceType":"PROJECT","resourceId":"$projectId","recipientEmail":"rbac-assistant2@calendary.dev","accessLevel":"READ","message":"take a look"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(mvcPatch("/api/collaborations/$shareId/accept").session(collaboratorSession))
			.andExpect(status().isOk)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/projects").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.projects[0].id").value(projectId))

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].id").value(taskId))

		// Write access was never granted (only READ), so editing must still be rejected.
		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/tasks/$taskId")
				.session(collaboratorSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Edited by a read-only collaborator","status":"DONE"}"""),
		)
			.andExpect(status().isForbidden)
	}

	@Test
	@Transactional
	fun `sharing an epic cascades visibility to tasks nested under it`() {
		val workspaceId = bootstrapOwnerAndCollaborator(ownerEmail = "rbac-owner4@calendary.dev", collaboratorEmail = "rbac-assistant4@calendary.dev")
		val ownerSession = loginAs("rbac-owner4@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("rbac-assistant4@calendary.dev", "collaborator-password")

		val projectId = createProject(workspaceId, ownerSession)
		val epicId = createEpic(workspaceId, ownerSession, projectId)
		val taskId = createTaskUnderEpic(workspaceId, ownerSession, epicId)

		val shareId = mockMvc.perform(
			mvcPost("/api/collaborations")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"resourceType":"PROJECT","resourceId":"$epicId","recipientEmail":"rbac-assistant4@calendary.dev","accessLevel":"READ","message":"epic share"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(mvcPatch("/api/collaborations/$shareId/accept").session(collaboratorSession))
			.andExpect(status().isOk)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].id").value(taskId))
	}

	@Test
	@Transactional
	fun `a task inside a project can be directly shared without sharing the project`() {
		val workspaceId = bootstrapOwnerAndCollaborator(ownerEmail = "rbac-owner5@calendary.dev", collaboratorEmail = "rbac-assistant5@calendary.dev")
		val ownerSession = loginAs("rbac-owner5@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("rbac-assistant5@calendary.dev", "collaborator-password")

		val projectId = createProject(workspaceId, ownerSession)
		val taskId = createTask(workspaceId, ownerSession, projectId)

		val shareId = mockMvc.perform(
			mvcPost("/api/collaborations")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"resourceType":"TASK","resourceId":"$taskId","recipientEmail":"rbac-assistant5@calendary.dev","accessLevel":"WRITE","message":"direct task share"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		mockMvc.perform(mvcPatch("/api/collaborations/$shareId/accept").session(collaboratorSession))
			.andExpect(status().isOk)

		// Task is visible directly — project share is not required.
		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].id").value(taskId))

		// Project itself remains hidden — only the task was shared.
		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/projects").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.projects").isEmpty)
	}

	@Test
	@Transactional
	fun `the workspace owner still sees every resource regardless of sharing`() {
		val workspaceId = bootstrapOwnerAndCollaborator(ownerEmail = "rbac-owner3@calendary.dev", collaboratorEmail = "rbac-assistant3@calendary.dev")
		val ownerSession = loginAs("rbac-owner3@calendary.dev", "very-secret-password")

		createProject(workspaceId, ownerSession)
		createTask(workspaceId, ownerSession, null)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/projects").session(ownerSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.projects.length()").value(1))

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/tasks").session(ownerSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(1))
	}

	private fun createProject(workspaceId: UUID, session: MockHttpSession, type: String = "PROJECT"): String =
		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/projects")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Owner-only project","type":"$type"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

	private fun createEpic(workspaceId: UUID, session: MockHttpSession, parentProjectId: String): String =
		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/projects")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Owner-only epic","type":"EPIC","parentProjectId":"$parentProjectId"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

	private fun createTaskUnderEpic(workspaceId: UUID, session: MockHttpSession, epicId: String): String =
		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"title":"Owner-only task","epicId":"$epicId"}"""),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

	private fun createTask(workspaceId: UUID, session: MockHttpSession, projectId: String?): String {
		val body = if (projectId != null) """{"title":"Owner-only task","projectId":"$projectId"}""" else """{"title":"Owner-only task"}"""
		return mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/tasks")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }
	}

	private fun bootstrapOwnerAndCollaborator(ownerEmail: String = "rbac-owner@calendary.dev", collaboratorEmail: String = "rbac-assistant@calendary.dev"): UUID {
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
				accessLevel = WorkspaceAccessLevel.WRITE,
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

package com.calendary.workspaces

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.AcceptInvitationCommand
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceAccessLevel
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

class WorkspaceControllerIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `lists current user workspaces`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(mvcGet("/api/me/workspaces").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].name").value("Owner workspace"))
			.andExpect(jsonPath("$.items[0].publicSlug").value("owner-workspace"))
			.andExpect(jsonPath("$.items[0].defaultTimezone").value("Europe/Paris"))
			.andExpect(jsonPath("$.items[0].accessLevel").value("OWNER"))
	}

	@Test
	@Transactional
	fun `updates workspace public settings and resolves public profile`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val workspaceId = com.jayway.jsonpath.JsonPath.read<String>(
			mockMvc.perform(mvcGet("/api/me/workspaces").session(session))
				.andExpect(status().isOk)
				.andReturn()
				.response
				.contentAsString,
			"$.items[0].id",
		)

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/settings")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "name": "Doni Studio",
					  "publicSlug": "doni-studio",
					  "defaultTimezone": "Africa/Abidjan"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.name").value("Doni Studio"))
			.andExpect(jsonPath("$.publicSlug").value("doni-studio"))
			.andExpect(jsonPath("$.defaultTimezone").value("Africa/Abidjan"))

		mockMvc.get("/public/profiles/doni-studio")
			.andExpect {
				status { isOk() }
				jsonPath("$.id") { value(workspaceId) }
				jsonPath("$.name") { value("Doni Studio") }
				jsonPath("$.defaultTimezone") { value("Africa/Abidjan") }
			}
	}

	@Test
	@Transactional
	fun `rejects invalid timezone with a clean 400 instead of a 500`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val workspaceId = com.jayway.jsonpath.JsonPath.read<String>(
			mockMvc.perform(mvcGet("/api/me/workspaces").session(session))
				.andExpect(status().isOk)
				.andReturn()
				.response
				.contentAsString,
			"$.items[0].id",
		)

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/settings")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "name": "Owner workspace",
					  "publicSlug": "owner-workspace",
					  "defaultTimezone": "Not/A_Real_Zone"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isBadRequest)
			.andExpect(jsonPath("$.code").value("bad_request"))
	}

	@Test
	@Transactional
	fun `updates workspace theme`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val workspaceId = com.jayway.jsonpath.JsonPath.read<String>(
			mockMvc.perform(mvcGet("/api/me/workspaces").session(session))
				.andExpect(status().isOk)
				.andReturn()
				.response
				.contentAsString,
			"$.items[0].id",
		)

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/theme")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{ "theme": "ember-dark" }"""),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.theme").value("ember-dark"))

		mockMvc.perform(
			mvcPatch("/api/workspaces/$workspaceId/theme")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{ "theme": "not-a-real-theme" }"""),
		)
			.andExpect(status().isBadRequest)
	}

	@Test
	@Transactional
	fun `forbids collaborator from updating owner workspace public settings`() {
		val owner = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val ownerSession = loginAs("owner@calendary.dev", "very-secret-password")
		val ownerWorkspaceId = com.jayway.jsonpath.JsonPath.read<String>(
			mockMvc.perform(mvcGet("/api/me/workspaces").session(ownerSession))
				.andExpect(status().isOk)
				.andReturn()
				.response
				.contentAsString,
			"$.items[0].id",
		)
		val invitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "collab@calendary.dev",
				invitedById = owner.id,
				accessLevel = WorkspaceAccessLevel.WRITE,
			),
		)
		onboarding.acceptInvitation(
			AcceptInvitationCommand(
				rawToken = invitation.rawToken,
				password = "collab-secret-password",
				workspaceName = "Collab workspace",
			),
		)
		val collaboratorSession = loginAs("collab@calendary.dev", "collab-secret-password")

		mockMvc.perform(
			mvcPatch("/api/workspaces/$ownerWorkspaceId/settings")
				.session(collaboratorSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "name": "Hijacked workspace",
					  "publicSlug": "hijacked-workspace",
					  "defaultTimezone": "UTC"
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isForbidden)
	}

	@Test
	@Transactional
	fun `lists workspace members for assignee and participant pickers`() {
		val owner = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val invitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "collab@calendary.dev",
				invitedById = owner.id,
				accessLevel = WorkspaceAccessLevel.READ,
			),
		)
		onboarding.acceptInvitation(
			AcceptInvitationCommand(
				rawToken = invitation.rawToken,
				password = "collab-secret-password",
				workspaceName = "Collab workspace",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")
		val workspaceId = com.jayway.jsonpath.JsonPath.read<String>(
			mockMvc.perform(mvcGet("/api/me/workspaces").session(session))
				.andExpect(status().isOk)
				.andReturn()
				.response
				.contentAsString,
			"$.items[0].id",
		)

		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/members").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items.length()").value(2))
			.andExpect(jsonPath("$.items[*].email").value(org.hamcrest.Matchers.containsInAnyOrder("owner@calendary.dev", "collab@calendary.dev")))
	}

	@Test
	@Transactional
	fun `requires session to list workspaces`() {
		mockMvc.get("/api/me/workspaces")
			.andExpect {
				status { isUnauthorized() }
			}
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

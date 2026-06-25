package com.calendary.onboarding.api

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import org.hamcrest.Matchers.blankOrNullString
import org.hamcrest.Matchers.not
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class OnboardingControllerIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `creates super admin over http`() {
		mockMvc.post("/api/onboarding/super-admin") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "email": "owner@calendary.dev",
				  "password": "very-secret-password",
				  "workspaceName": "Owner workspace"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isCreated() }
				jsonPath("$.email") { value("owner@calendary.dev") }
				jsonPath("$.role") { value("SUPER_ADMIN") }
				jsonPath("$.status") { value("ACTIVE") }
			}
	}

	@Test
	@Transactional
	fun `returns conflict when super admin already exists over http`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		mockMvc.post("/api/onboarding/super-admin") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "email": "second@calendary.dev",
				  "password": "another-secret-password"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isConflict() }
				jsonPath("$.code") { value("conflict") }
			}
	}

	@Test
	@Transactional
	fun `creates invitation over http and returns raw token once`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(
			mvcPost("/api/onboarding/invitations")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "email": "assistant@calendary.dev",
				  "accessLevel": "WRITE",
				  "expiresInDays": 7
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.email").value("assistant@calendary.dev"))
			.andExpect(jsonPath("$.accessLevel").value("WRITE"))
			.andExpect(jsonPath("$.token").value(not(blankOrNullString())))
	}

	@Test
	@Transactional
	fun `returns unauthorized when creating invitation without session`() {
		mockMvc.post("/api/onboarding/invitations") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "email": "assistant@calendary.dev",
				  "accessLevel": "WRITE"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isUnauthorized() }
				jsonPath("$.code") { value("unauthorized") }
			}
	}

	@Test
	@Transactional
	fun `returns forbidden when collaborator creates invitation`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val invitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "assistant@calendary.dev",
				invitedById = superAdmin.id,
				accessLevel = WorkspaceAccessLevel.READ,
			),
		)
		onboarding.acceptInvitation(
			com.calendary.onboarding.application.AcceptInvitationCommand(
				rawToken = invitation.rawToken,
				password = "collaborator-password",
			),
		)
		val collaboratorSession = loginAs("assistant@calendary.dev", "collaborator-password")

		mockMvc.perform(
			mvcPost("/api/onboarding/invitations")
				.session(collaboratorSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "email": "another@calendary.dev",
				  "accessLevel": "READ"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isForbidden)
			.andExpect(jsonPath("$.code").value("forbidden"))
	}

	@Test
	@Transactional
	fun `accepts invitation over http`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val invitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "assistant@calendary.dev",
				invitedById = superAdmin.id,
				accessLevel = WorkspaceAccessLevel.READ,
			),
		)

		mockMvc.post("/api/onboarding/invitations/accept") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "token": "${invitation.rawToken}",
				  "password": "collaborator-password",
				  "workspaceName": "Assistant workspace"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isCreated() }
				jsonPath("$.email") { value("assistant@calendary.dev") }
				jsonPath("$.role") { value("COLLABORATOR") }
				jsonPath("$.status") { value("ACTIVE") }
			}
	}

	@Test
	@Transactional
	fun `returns bad request for invalid invitation token over http`() {
		mockMvc.post("/api/onboarding/invitations/accept") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "token": "invalid-token",
				  "password": "collaborator-password"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isBadRequest() }
				jsonPath("$.code") { value("bad_request") }
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

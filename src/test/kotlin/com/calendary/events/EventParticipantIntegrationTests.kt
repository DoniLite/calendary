package com.calendary.events

import com.calendary.onboarding.application.AcceptInvitationCommand
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.workspaces.domain.WorkspaceAccessLevel
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
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class EventParticipantIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val workspaces: WorkspaceRepository,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `adds a collaborator as event participant on create and notifies them`() {
		val workspaceId = bootstrapOwnerAndCollaborator()
		val ownerSession = loginAs("owner@calendary.dev", "very-secret-password")
		val collaboratorSession = loginAs("assistant@calendary.dev", "collaborator-password")

		val now = Instant.now()
		mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/events")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "title": "Planning sync",
					  "startsAt": "${now.plus(Duration.ofMinutes(5))}",
					  "endsAt": "${now.plus(Duration.ofHours(1))}",
					  "participantEmails": ["assistant@calendary.dev"]
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andExpect(jsonPath("$.participants[0].email").value("assistant@calendary.dev"))

		mockMvc.perform(mvcGet("/api/notifications").session(collaboratorSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.unreadCount").value(1))
			.andExpect(jsonPath("$.items[0].type").value("EVENT_PARTICIPANT_ADDED"))
	}

	@Test
	fun `get endpoint with participants does not fail outside the originating transaction`() {
		val workspaceId = bootstrapOwnerAndCollaborator(ownerEmail = "lazyload-owner-evt@calendary.dev", collaboratorEmail = "lazyload-assistant-evt@calendary.dev")
		val ownerSession = loginAs("lazyload-owner-evt@calendary.dev", "very-secret-password")
		val now = Instant.now()

		val eventId = mockMvc.perform(
			mvcPost("/api/workspaces/$workspaceId/events")
				.session(ownerSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
					{
					  "title": "Lazy load check",
					  "startsAt": "${now.plus(Duration.ofMinutes(5))}",
					  "endsAt": "${now.plus(Duration.ofHours(1))}",
					  "participantEmails": ["lazyload-assistant-evt@calendary.dev"]
					}
					""".trimIndent(),
				),
		)
			.andExpect(status().isCreated)
			.andReturn()
			.response
			.contentAsString
			.let { JsonPath.read<String>(it, "$.id") }

		// No @Transactional on this test method: the GET below runs in its own
		// fresh transaction, separate from the one that created the event above,
		// reproducing the real production request lifecycle (regression guard
		// for the Event.participants LazyInitializationException).
		mockMvc.perform(mvcGet("/api/workspaces/$workspaceId/events/$eventId").session(ownerSession))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.participants[0].email").value("lazyload-assistant-evt@calendary.dev"))
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

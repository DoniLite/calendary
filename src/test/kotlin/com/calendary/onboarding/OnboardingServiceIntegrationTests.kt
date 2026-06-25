package com.calendary.onboarding

import com.calendary.invitations.infra.InvitationRepository
import com.calendary.invitations.domain.InvitationStatus
import com.calendary.notifications.application.NotificationService
import com.calendary.onboarding.application.AcceptInvitationCommand
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InvitationTokenHasher
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.users.domain.UserRole
import com.calendary.users.domain.UserStatus
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.infra.WorkspaceMembershipRepository
import com.calendary.workspaces.infra.WorkspaceRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.transaction.annotation.Transactional

class OnboardingServiceIntegrationTests(
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val users: UserAccountRepository,
	@Autowired private val workspaces: WorkspaceRepository,
	@Autowired private val memberships: WorkspaceMembershipRepository,
	@Autowired private val invitations: InvitationRepository,
	@Autowired private val tokenHasher: InvitationTokenHasher,
	@Autowired private val passwordEncoder: PasswordEncoder,
	@Autowired private val notifications: NotificationService,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `bootstraps one super admin with a personal workspace`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = " Owner@Calendary.dev ",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)

		assertEquals("owner@calendary.dev", superAdmin.email)
		assertEquals(UserRole.SUPER_ADMIN, superAdmin.role)
		assertEquals(UserStatus.ACTIVE, superAdmin.status)
		assertTrue(passwordEncoder.matches("very-secret-password", superAdmin.passwordHash))
		assertNotEquals("very-secret-password", superAdmin.passwordHash)
		assertEquals(1, workspaces.countByOwnerId(superAdmin.id))
		assertEquals(1, memberships.countByUserId(superAdmin.id))
	}

	@Test
	@Transactional
	fun `does not allow multiple super admins`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		assertThrows<IllegalStateException> {
			onboarding.bootstrapSuperAdmin(
				BootstrapSuperAdminCommand(
					email = "second@calendary.dev",
					password = "another-secret-password",
				),
			)
		}
	}

	@Test
	@Transactional
	fun `super admin can invite collaborator with hashed token`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		val createdInvitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = " Assistant@Calendary.dev ",
				invitedById = superAdmin.id,
				accessLevel = WorkspaceAccessLevel.WRITE,
			),
		)

		val invitation = createdInvitation.invitation
		assertEquals("assistant@calendary.dev", invitation.email)
		assertEquals(WorkspaceAccessLevel.WRITE, invitation.accessLevel)
		assertFalse(invitation.tokenHash.contains(createdInvitation.rawToken))
		assertEquals(tokenHasher.hash(createdInvitation.rawToken), invitation.tokenHash)
		assertTrue(invitations.findByTokenHash(invitation.tokenHash).isPresent)
		assertEquals(1, notifications.listForUser(superAdmin.id).unreadCount)
	}

	@Test
	@Transactional
	fun `collaborator email must not already exist when invited`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val owner = users.findByEmailIgnoreCase("owner@calendary.dev").orElseThrow()

		assertThrows<IllegalStateException> {
			onboarding.inviteCollaborator(
				InviteCollaboratorCommand(
					email = "OWNER@CALENDARY.DEV",
					invitedById = owner.id,
				),
			)
		}
	}

	@Test
	@Transactional
	fun `collaborator accepts invitation and receives personal and shared workspaces`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Admin workspace",
			),
		)
		val createdInvitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "assistant@calendary.dev",
				invitedById = superAdmin.id,
				accessLevel = WorkspaceAccessLevel.WRITE,
			),
		)

		val collaborator = onboarding.acceptInvitation(
			AcceptInvitationCommand(
				rawToken = createdInvitation.rawToken,
				password = "collaborator-password",
				workspaceName = "Assistant workspace",
			),
		)

		assertEquals("assistant@calendary.dev", collaborator.email)
		assertEquals(UserRole.COLLABORATOR, collaborator.role)
		assertEquals(UserStatus.ACTIVE, collaborator.status)
		assertTrue(passwordEncoder.matches("collaborator-password", collaborator.passwordHash))
		assertEquals(1, workspaces.countByOwnerId(collaborator.id))
		assertEquals(2, memberships.countByUserId(collaborator.id))

		val acceptedInvitation = invitations.findByTokenHash(tokenHasher.hash(createdInvitation.rawToken)).orElseThrow()
		assertEquals(InvitationStatus.ACCEPTED, acceptedInvitation.status)
		assertTrue(acceptedInvitation.acceptedAt != null)
		assertEquals(2, notifications.listForUser(superAdmin.id).unreadCount)
	}

	@Test
	@Transactional
	fun `cannot accept invitation with invalid token`() {
		assertThrows<IllegalArgumentException> {
			onboarding.acceptInvitation(
				AcceptInvitationCommand(
					rawToken = "not-a-real-token",
					password = "collaborator-password",
				),
			)
		}
	}

	@Test
	@Transactional
	fun `cannot accept expired invitation`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val createdInvitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "assistant@calendary.dev",
				invitedById = superAdmin.id,
				expiresIn = java.time.Duration.ofSeconds(-1),
			),
		)

		assertThrows<IllegalStateException> {
			onboarding.acceptInvitation(
				AcceptInvitationCommand(
					rawToken = createdInvitation.rawToken,
					password = "collaborator-password",
				),
			)
		}
	}

	@Test
	@Transactional
	fun `cannot reuse accepted invitation`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val createdInvitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "assistant@calendary.dev",
				invitedById = superAdmin.id,
			),
		)
		onboarding.acceptInvitation(
			AcceptInvitationCommand(
				rawToken = createdInvitation.rawToken,
				password = "collaborator-password",
			),
		)

		assertThrows<IllegalStateException> {
			onboarding.acceptInvitation(
				AcceptInvitationCommand(
					rawToken = createdInvitation.rawToken,
					password = "another-password",
				),
			)
		}
	}
}

package com.calendary.users

import com.calendary.onboarding.application.AcceptInvitationCommand
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InvitationTokenHasher
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.users.application.AccountSecurityService
import com.calendary.users.application.ChangePasswordCommand
import com.calendary.users.application.RequestEmailChangeCommand
import com.calendary.users.application.ResetPasswordCommand
import com.calendary.users.domain.UserStatus
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.transaction.annotation.Transactional

class AccountSecurityServiceIntegrationTests(
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val accountSecurity: AccountSecurityService,
	@Autowired private val users: UserAccountRepository,
	@Autowired private val passwordEncoder: PasswordEncoder,
	@Autowired private val tokenHasher: InvitationTokenHasher,
) : PostgresIntegrationTest() {

	// ── changePassword ────────────────────────────────────────────────────────

	@Test
	@Transactional
	fun `user changes initial password and becomes active`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		accountSecurity.changePassword(
			ChangePasswordCommand(
				userId = superAdmin.id,
				currentPassword = "very-secret-password",
				newPassword = "new-secure-password",
			),
		)

		val updatedUser = users.findById(superAdmin.id).orElseThrow()
		assertEquals(UserStatus.ACTIVE, updatedUser.status)
		assertTrue(passwordEncoder.matches("new-secure-password", updatedUser.passwordHash))
	}

	@Test
	@Transactional
	fun `cannot change password with invalid current password`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		assertThrows<IllegalStateException> {
			accountSecurity.changePassword(
				ChangePasswordCommand(
					userId = superAdmin.id,
					currentPassword = "wrong-password",
					newPassword = "new-secure-password",
				),
			)
		}
	}

	@Test
	@Transactional
	fun `new password must be strong enough`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		assertThrows<IllegalArgumentException> {
			accountSecurity.changePassword(
				ChangePasswordCommand(
					userId = superAdmin.id,
					currentPassword = "very-secret-password",
					newPassword = "short",
				),
			)
		}
	}

	@Test
	@Transactional
	fun `new password must be different from current password`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		assertThrows<IllegalArgumentException> {
			accountSecurity.changePassword(
				ChangePasswordCommand(
					userId = superAdmin.id,
					currentPassword = "very-secret-password",
					newPassword = "very-secret-password",
				),
			)
		}
	}

	@Test
	@Transactional
	fun `disabled user cannot change password`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val disabledUser = users.findById(superAdmin.id).orElseThrow()
		disabledUser.status = UserStatus.DISABLED

		assertThrows<IllegalStateException> {
			accountSecurity.changePassword(
				ChangePasswordCommand(
					userId = superAdmin.id,
					currentPassword = "very-secret-password",
					newPassword = "new-secure-password",
				),
			)
		}
	}

	// ── requestPasswordReset ──────────────────────────────────────────────────

	@Test
	@Transactional
	fun `password reset stores hashed token and future expiry`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		accountSecurity.requestPasswordReset("owner@calendary.dev")

		val updated = users.findById(superAdmin.id).orElseThrow()
		assertNotNull(updated.passwordResetToken)
		assertNotNull(updated.passwordResetExpiresAt)
		assertTrue(updated.passwordResetExpiresAt!!.isAfter(Instant.now()))
	}

	@Test
	@Transactional
	fun `password reset for unknown email is silent`() {
		// Must not throw — no user enumeration.
		accountSecurity.requestPasswordReset("nobody@calendary.dev")
	}

	@Test
	@Transactional
	fun `password reset for disabled user is silent and stores no token`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		users.findById(superAdmin.id).orElseThrow().status = UserStatus.DISABLED

		accountSecurity.requestPasswordReset("owner@calendary.dev")

		assertNull(users.findById(superAdmin.id).orElseThrow().passwordResetToken)
	}

	// ── resetPassword ─────────────────────────────────────────────────────────

	@Test
	@Transactional
	fun `resets password with valid token and clears reset fields`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val rawToken = "known-test-reset-token-abc"
		val dbUser = users.findById(superAdmin.id).orElseThrow()
		dbUser.passwordResetToken = tokenHasher.hash(rawToken)
		dbUser.passwordResetExpiresAt = Instant.now().plus(1, ChronoUnit.HOURS)

		accountSecurity.resetPassword(ResetPasswordCommand(rawToken = rawToken, newPassword = "brand-new-secure-password"))

		val updated = users.findById(superAdmin.id).orElseThrow()
		assertTrue(passwordEncoder.matches("brand-new-secure-password", updated.passwordHash))
		assertEquals(UserStatus.ACTIVE, updated.status)
		assertNull(updated.passwordResetToken)
		assertNull(updated.passwordResetExpiresAt)
	}

	@Test
	@Transactional
	fun `reset password with invalid token throws`() {
		assertThrows<IllegalArgumentException> {
			accountSecurity.resetPassword(ResetPasswordCommand(rawToken = "no-such-token", newPassword = "brand-new-secure-password"))
		}
	}

	@Test
	@Transactional
	fun `reset password with expired token throws`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val rawToken = "known-test-expired-token-xyz"
		val dbUser = users.findById(superAdmin.id).orElseThrow()
		dbUser.passwordResetToken = tokenHasher.hash(rawToken)
		dbUser.passwordResetExpiresAt = Instant.now().minus(1, ChronoUnit.HOURS)

		assertThrows<IllegalStateException> {
			accountSecurity.resetPassword(ResetPasswordCommand(rawToken = rawToken, newPassword = "brand-new-secure-password"))
		}
	}

	// ── requestEmailChange ────────────────────────────────────────────────────

	@Test
	@Transactional
	fun `email change request stores pending email and verification token`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		accountSecurity.requestEmailChange(
			RequestEmailChangeCommand(
				userId = superAdmin.id,
				currentEmail = "owner@calendary.dev",
				newEmail = "new-address@calendary.dev",
			),
		)

		val updated = users.findById(superAdmin.id).orElseThrow()
		assertEquals("new-address@calendary.dev", updated.pendingEmail)
		assertNotNull(updated.emailVerificationToken)
		assertTrue(updated.emailVerificationExpiresAt!!.isAfter(Instant.now()))
	}

	@Test
	@Transactional
	fun `cannot request email change to same current email`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		assertThrows<IllegalArgumentException> {
			accountSecurity.requestEmailChange(
				RequestEmailChangeCommand(
					userId = superAdmin.id,
					currentEmail = "owner@calendary.dev",
					newEmail = "owner@calendary.dev",
				),
			)
		}
	}

	@Test
	@Transactional
	fun `cannot request email change to an email already registered`() {
		val owner = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val invitation = onboarding.inviteCollaborator(
			InviteCollaboratorCommand(
				email = "taken@calendary.dev",
				invitedById = owner.id,
				accessLevel = WorkspaceAccessLevel.READ,
			),
		)
		onboarding.acceptInvitation(
			AcceptInvitationCommand(
				rawToken = invitation.rawToken,
				password = "collaborator-password",
				workspaceName = "Collaborator workspace",
			),
		)

		assertThrows<IllegalArgumentException> {
			accountSecurity.requestEmailChange(
				RequestEmailChangeCommand(
					userId = owner.id,
					currentEmail = "owner@calendary.dev",
					newEmail = "taken@calendary.dev",
				),
			)
		}
	}

	// ── verifyEmailChange ─────────────────────────────────────────────────────

	@Test
	@Transactional
	fun `verifies email change applies new address and clears pending state`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val rawToken = "known-test-email-verify-token-abc"
		val dbUser = users.findById(superAdmin.id).orElseThrow()
		dbUser.pendingEmail = "confirmed-new@calendary.dev"
		dbUser.emailVerificationToken = tokenHasher.hash(rawToken)
		dbUser.emailVerificationExpiresAt = Instant.now().plus(1, ChronoUnit.HOURS)

		accountSecurity.verifyEmailChange(rawToken)

		val updated = users.findById(superAdmin.id).orElseThrow()
		assertEquals("confirmed-new@calendary.dev", updated.email)
		assertNull(updated.pendingEmail)
		assertNull(updated.emailVerificationToken)
		assertNull(updated.emailVerificationExpiresAt)
	}

	@Test
	@Transactional
	fun `verify email with invalid token throws`() {
		assertThrows<IllegalArgumentException> {
			accountSecurity.verifyEmailChange("no-such-verification-token")
		}
	}

	@Test
	@Transactional
	fun `verify email with expired token throws`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val rawToken = "known-test-expired-verify-token-xyz"
		val dbUser = users.findById(superAdmin.id).orElseThrow()
		dbUser.pendingEmail = "new@calendary.dev"
		dbUser.emailVerificationToken = tokenHasher.hash(rawToken)
		dbUser.emailVerificationExpiresAt = Instant.now().minus(1, ChronoUnit.HOURS)

		assertThrows<IllegalStateException> {
			accountSecurity.verifyEmailChange(rawToken)
		}
	}
}

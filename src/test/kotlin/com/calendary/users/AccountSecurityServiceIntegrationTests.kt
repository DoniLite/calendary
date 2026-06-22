package com.calendary.users

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.users.application.AccountSecurityService
import com.calendary.users.application.ChangePasswordCommand
import com.calendary.users.domain.UserStatus
import com.calendary.users.infra.UserAccountRepository
import kotlin.test.Test
import kotlin.test.assertEquals
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
) : PostgresIntegrationTest() {
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
}

package com.calendary.users.application

import com.calendary.users.domain.UserStatus
import com.calendary.users.infra.UserAccountRepository
import java.util.UUID
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AccountSecurityService(
	private val users: UserAccountRepository,
	private val passwordEncoder: PasswordEncoder,
) {
	@Transactional
	fun changePassword(command: ChangePasswordCommand) {
		require(command.newPassword.length >= 12) { "New password must contain at least 12 characters." }

		val user = users.findById(command.userId)
			.orElseThrow { IllegalArgumentException("User not found.") }
		check(passwordEncoder.matches(command.currentPassword, user.passwordHash)) { "Current password is invalid." }

		user.passwordHash = passwordEncoder.encode(command.newPassword) ?: error("Password encoder returned null.")
		user.status = UserStatus.ACTIVE
	}
}

data class ChangePasswordCommand(
	val userId: UUID,
	val currentPassword: String,
	val newPassword: String,
)

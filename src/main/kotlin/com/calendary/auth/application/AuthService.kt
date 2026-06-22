package com.calendary.auth.application

import com.calendary.common.api.InvalidCredentialsException
import com.calendary.users.domain.UserAccount
import com.calendary.users.domain.UserStatus
import com.calendary.users.infra.UserAccountRepository
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AuthService(
	private val users: UserAccountRepository,
	private val passwordEncoder: PasswordEncoder,
) {
	@Transactional(readOnly = true)
	fun authenticate(command: LoginCommand): UserAccount {
		val email = command.email.trim().lowercase()
		val user = users.findByEmailIgnoreCase(email)
			.orElseThrow { InvalidCredentialsException() }

		check(user.status != UserStatus.DISABLED) { "User account is disabled." }
		if (!passwordEncoder.matches(command.password, user.passwordHash)) {
			throw InvalidCredentialsException()
		}

		return user
	}
}

data class LoginCommand(
	val email: String,
	val password: String,
)

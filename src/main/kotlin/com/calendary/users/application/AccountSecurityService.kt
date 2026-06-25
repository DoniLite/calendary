package com.calendary.users.application

import com.calendary.mail.application.MailService
import com.calendary.mail.application.SendMailCommand
import com.calendary.mail.config.MailProperties
import com.calendary.onboarding.application.InvitationTokenHasher
import com.calendary.users.domain.UserStatus
import com.calendary.users.infra.UserAccountRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class AccountSecurityService(
	private val users: UserAccountRepository,
	private val passwordEncoder: PasswordEncoder,
	private val tokenHasher: InvitationTokenHasher,
	private val mail: MailService,
	private val mailProperties: MailProperties,
) {
	@Transactional
	fun changePassword(command: ChangePasswordCommand) {
		require(command.newPassword.length >= 12) { "New password must contain at least 12 characters." }

		val user = users.findById(command.userId)
			.orElseThrow { IllegalArgumentException("User not found.") }
		check(user.status != UserStatus.DISABLED) { "User account is disabled." }
		check(passwordEncoder.matches(command.currentPassword, user.passwordHash)) { "Current password is invalid." }
		require(command.currentPassword != command.newPassword) { "New password must be different from current password." }

		user.passwordHash = passwordEncoder.encode(command.newPassword) ?: error("Password encoder returned null.")
		user.status = UserStatus.ACTIVE
	}

	// Always returns without error even when email is unknown — no user enumeration.
	@Transactional
	fun requestPasswordReset(email: String) {
		val user = users.findByEmailIgnoreCase(email.trim()).orElse(null) ?: return
		if (user.status == UserStatus.DISABLED) return

		val rawToken = UUID.randomUUID().toString()
		user.passwordResetToken = tokenHasher.hash(rawToken)
		user.passwordResetExpiresAt = Instant.now().plus(24, ChronoUnit.HOURS)

		val resetUrl = "${mailProperties.publicBaseUrl}/reset-password?token=$rawToken"
		mail.send(
			SendMailCommand(
				to = user.email,
				subject = "Reset your Calendary password",
				body = "A password reset was requested for your Calendary account.\n\nThis link expires in 24 hours. If you did not request a reset, ignore this email.",
				actionLabel = "Reset password",
				actionUrl = resetUrl,
			),
		)
	}

	@Transactional
	fun resetPassword(command: ResetPasswordCommand) {
		require(command.newPassword.length >= 12) { "Password must be at least 12 characters." }
		val hashedToken = tokenHasher.hash(command.rawToken)
		val user = users.findByPasswordResetToken(hashedToken)
			.orElseThrow { IllegalArgumentException("Invalid or expired reset link.") }
		check(user.passwordResetExpiresAt?.isAfter(Instant.now()) == true) { "Reset link has expired." }

		user.passwordHash = passwordEncoder.encode(command.newPassword) ?: error("Password encoder returned null.")
		user.passwordResetToken = null
		user.passwordResetExpiresAt = null
		user.status = UserStatus.ACTIVE
	}
}

data class ChangePasswordCommand(
	val userId: UUID,
	val currentPassword: String,
	val newPassword: String,
)

data class ResetPasswordCommand(
	val rawToken: String,
	val newPassword: String,
)

package com.calendary.users.domain

import com.calendary.common.persistence.AuditableEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "users")
open class UserAccount(
	@Column(nullable = false, unique = true)
	open var email: String = "",

	@Column(name = "password_hash", nullable = false)
	open var passwordHash: String = "",

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var status: UserStatus = UserStatus.PASSWORD_CHANGE_REQUIRED,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var role: UserRole = UserRole.COLLABORATOR,

	@Column(name = "password_reset_token")
	open var passwordResetToken: String? = null,

	@Column(name = "password_reset_expires_at")
	open var passwordResetExpiresAt: Instant? = null,

	@Column(name = "pending_email")
	open var pendingEmail: String? = null,

	@Column(name = "email_verification_token")
	open var emailVerificationToken: String? = null,

	@Column(name = "email_verification_expires_at")
	open var emailVerificationExpiresAt: Instant? = null,
) : AuditableEntity()

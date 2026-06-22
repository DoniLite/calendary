package com.calendary.users.domain

import com.calendary.common.persistence.AuditableEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table

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
) : AuditableEntity()

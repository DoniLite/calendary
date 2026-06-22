package com.calendary.auth.api.dto

import com.calendary.users.domain.UserAccount
import com.calendary.users.domain.UserStatus
import java.util.UUID

data class AuthenticatedUserResponse(
	val id: UUID,
	val email: String,
	val role: String,
	val status: String,
	val passwordChangeRequired: Boolean,
)

fun UserAccount.toAuthenticatedResponse(): AuthenticatedUserResponse =
	AuthenticatedUserResponse(
		id = id,
		email = email,
		role = role.name,
		status = status.name,
		passwordChangeRequired = status == UserStatus.PASSWORD_CHANGE_REQUIRED,
	)

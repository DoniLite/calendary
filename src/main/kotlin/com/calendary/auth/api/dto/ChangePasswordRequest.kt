package com.calendary.auth.api.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ChangePasswordRequest(
	@field:NotBlank
	val currentPassword: String,

	@field:Size(min = 12)
	val newPassword: String,
)

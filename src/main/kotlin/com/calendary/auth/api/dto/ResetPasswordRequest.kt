package com.calendary.auth.api.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class ResetPasswordRequest(
	@field:NotBlank val token: String,
	@field:Size(min = 12) val newPassword: String,
)

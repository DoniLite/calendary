package com.calendary.auth.api.dto

import jakarta.validation.constraints.NotBlank

data class VerifyEmailChangeRequest(
	@field:NotBlank val token: String,
)

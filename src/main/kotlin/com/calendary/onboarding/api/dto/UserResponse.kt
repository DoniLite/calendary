package com.calendary.onboarding.api.dto

import java.util.UUID

data class UserResponse(
    val id: UUID,
    val email: String,
    val role: String,
    val status: String,
)
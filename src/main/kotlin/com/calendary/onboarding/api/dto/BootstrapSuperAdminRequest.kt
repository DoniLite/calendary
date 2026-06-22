package com.calendary.onboarding.api.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class BootstrapSuperAdminRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    @field:Size(min = 12)
    val password: String,

    val workspaceName: String = "Calendary",
)
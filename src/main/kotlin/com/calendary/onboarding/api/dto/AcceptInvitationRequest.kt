package com.calendary.onboarding.api.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class AcceptInvitationRequest(
    @field:NotBlank
    val token: String,

    @field:Size(min = 12)
    val password: String,

    val workspaceName: String = "",
)
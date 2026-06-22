package com.calendary.onboarding.api.dto

import com.calendary.workspaces.domain.WorkspaceAccessLevel
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank

data class InviteCollaboratorRequest(
    @field:Email
    @field:NotBlank
    val email: String,

    val accessLevel: WorkspaceAccessLevel = WorkspaceAccessLevel.READ,

    val expiresInDays: Long = 7,
)

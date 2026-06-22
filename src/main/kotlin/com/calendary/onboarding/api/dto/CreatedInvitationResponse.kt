package com.calendary.onboarding.api.dto

import com.calendary.workspaces.domain.WorkspaceAccessLevel
import java.util.UUID

data class CreatedInvitationResponse(
    val id: UUID,
    val email: String,
    val accessLevel: WorkspaceAccessLevel,
    val token: String,
    val expiresAt: String,
)
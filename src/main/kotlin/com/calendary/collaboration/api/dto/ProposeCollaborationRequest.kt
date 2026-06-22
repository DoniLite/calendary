package com.calendary.collaboration.api.dto

import com.calendary.resources.domain.ResourceType
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import java.util.UUID

data class ProposeCollaborationRequest(
	val resourceType: ResourceType,
	val resourceId: UUID,
	@field:Email
	@field:NotBlank
	val recipientEmail: String,
	val accessLevel: WorkspaceAccessLevel = WorkspaceAccessLevel.READ,
	val message: String = "",
)

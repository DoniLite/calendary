package com.calendary.workspaces.application

import com.calendary.common.api.ForbiddenException
import com.calendary.workspaces.domain.Workspace
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.infra.WorkspaceMembershipRepository
import com.calendary.workspaces.infra.WorkspaceRepository
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class WorkspaceAccessService(
    private val workspaces: WorkspaceRepository,
    private val memberships: WorkspaceMembershipRepository,
) {
    fun requireRead(workspaceId: UUID, userId: UUID): Workspace {
        val workspace = workspaces.findById(workspaceId)
            .orElseThrow { IllegalArgumentException("Workspace not found.") }
        memberships.findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseThrow { ForbiddenException("Workspace access denied.") }
        return workspace
    }

    fun requireWrite(workspaceId: UUID, userId: UUID): Workspace {
        val workspace = requireRead(workspaceId, userId)
        val membership = memberships.findByWorkspaceIdAndUserId(workspaceId, userId).orElseThrow()
        if (membership.accessLevel == WorkspaceAccessLevel.READ) {
            throw ForbiddenException("Workspace write access denied.")
        }
        return workspace
    }

    fun canRead(workspaceId: UUID, userId: UUID): Boolean =
        memberships.findByWorkspaceIdAndUserId(workspaceId, userId).isPresent

    fun canWrite(workspaceId: UUID, userId: UUID): Boolean =
        memberships.findByWorkspaceIdAndUserId(workspaceId, userId)
            .map { it.accessLevel != WorkspaceAccessLevel.READ }.isPresent

    // The owner sees every resource in their own workspace. Anyone else with a membership row
    // (an invited collaborator) only sees what's explicitly shared with them — see
    // ResourceAccessService.isVisibleToCollaborator.
    fun isOwner(workspaceId: UUID, userId: UUID): Boolean =
        memberships.findByWorkspaceIdAndUserId(workspaceId, userId)
            .map { it.accessLevel == WorkspaceAccessLevel.OWNER }.orElse(false)
}

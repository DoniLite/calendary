package com.calendary.workspaces.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.common.api.ForbiddenException
import com.calendary.workspaces.api.dto.PublicWorkspaceProfileResponse
import com.calendary.workspaces.api.dto.UpdateWorkspaceSettingsRequest
import com.calendary.workspaces.api.dto.WorkspaceListResponse
import com.calendary.workspaces.api.dto.WorkspaceResponse
import com.calendary.workspaces.api.dto.toPublicProfileResponse
import com.calendary.workspaces.api.dto.toResponse
import com.calendary.workspaces.application.WorkspaceAccessService
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceMembershipRepository
import com.calendary.workspaces.infra.WorkspaceRepository
import com.calendary.users.api.dto.MemberListResponse
import com.calendary.users.api.dto.toSummary
import com.calendary.users.domain.UserRole
import com.calendary.users.infra.UserAccountRepository
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import java.util.UUID
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class WorkspaceController(
	private val sessions: AuthSessionService,
	private val memberships: WorkspaceMembershipRepository,
	private val workspaces: WorkspaceRepository,
	private val workspaceAccess: WorkspaceAccessService,
) {
	@GetMapping("/me/workspaces")
	fun myWorkspaces(request: HttpServletRequest): WorkspaceListResponse {
		val currentUser = sessions.currentUser(request.getSession(false))
		return memberships.findByUserIdOrderByCreatedAtAsc(currentUser.id).toResponse()
	}

	@GetMapping("/workspaces")
	fun workspaces(request: HttpServletRequest): WorkspaceListResponse = myWorkspaces(request)

	@GetMapping("/workspaces/{workspaceId}/members")
	fun members(@PathVariable workspaceId: UUID, request: HttpServletRequest): MemberListResponse {
		val currentUser = sessions.currentUser(request.getSession(false))
		workspaceAccess.requireRead(workspaceId, currentUser.id)
		return MemberListResponse(
			items = memberships.findByWorkspaceIdOrderByCreatedAtAsc(workspaceId).mapNotNull { it.user?.toSummary() },
		)
	}

	@PatchMapping("/workspaces/{workspaceId}/settings")
	fun updateSettings(
		@PathVariable workspaceId: UUID,
		@Valid @RequestBody request: UpdateWorkspaceSettingsRequest,
		httpRequest: HttpServletRequest,
	): WorkspaceResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		val workspace = workspaceAccess.requireWrite(workspaceId, currentUser.id)
		val membership = memberships.findByWorkspaceIdAndUserId(workspace.id, currentUser.id).orElseThrow()
		if (membership.accessLevel != WorkspaceAccessLevel.OWNER) {
			throw ForbiddenException("Only the workspace owner can update public settings.")
		}
		val slug = request.publicSlug.trim().lowercase()
		require(!workspaces.existsByPublicSlugIgnoreCaseAndIdNot(slug, workspace.id)) { "Public slug is already in use." }
		workspace.name = request.name.trim()
		workspace.publicSlug = slug
		workspace.defaultTimezone = request.defaultTimezone.trim()
		return membership.toResponse()
	}
}

@RestController
@RequestMapping("/public/profiles")
class PublicWorkspaceProfileController(
	private val workspaces: WorkspaceRepository,
	private val users: UserAccountRepository,
) {
	@GetMapping("/default")
	fun defaultProfile(): PublicWorkspaceProfileResponse {
		val superAdmin = users.findByRole(UserRole.SUPER_ADMIN)
			.orElseThrow { IllegalArgumentException("No super admin is configured yet.") }
		return workspaces.findFirstByOwnerIdAndType(superAdmin.id, WorkspaceType.PERSONAL)
			.orElseThrow { IllegalArgumentException("Super admin workspace not found.") }
			.toPublicProfileResponse()
	}

	@GetMapping("/{publicSlug}")
	fun profile(@PathVariable publicSlug: String): PublicWorkspaceProfileResponse =
		workspaces.findByPublicSlugIgnoreCase(publicSlug)
			.orElseThrow { IllegalArgumentException("Public workspace profile not found.") }
			.toPublicProfileResponse()
}

package com.calendary.workspaces.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.common.api.ForbiddenException
import com.calendary.storage.application.ObjectStorageService
import com.calendary.storage.application.UploadObjectCommand
import com.calendary.workspaces.api.dto.PublicWorkspaceProfileResponse
import com.calendary.workspaces.api.dto.UpdateWorkspaceSettingsRequest
import com.calendary.workspaces.api.dto.UpdateWorkspaceThemeRequest
import com.calendary.workspaces.api.dto.WorkspaceListResponse
import com.calendary.workspaces.api.dto.WorkspaceResponse
import com.calendary.workspaces.api.dto.toPublicProfileResponse
import com.calendary.workspaces.api.dto.toResponse
import com.calendary.workspaces.api.dto.validWorkspaceThemes
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
import java.net.URI
import java.time.DateTimeException
import java.time.ZoneId
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api")
class WorkspaceController(
	private val sessions: AuthSessionService,
	private val memberships: WorkspaceMembershipRepository,
	private val workspaces: WorkspaceRepository,
	private val workspaceAccess: WorkspaceAccessService,
	private val storage: ObjectStorageService,
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
	@Transactional
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
		val timezone = request.defaultTimezone.trim()
		try {
			ZoneId.of(timezone)
		} catch (cause: DateTimeException) {
			throw IllegalArgumentException("'$timezone' is not a valid timezone.", cause)
		}
		workspace.name = request.name.trim()
		workspace.publicSlug = slug
		workspace.defaultTimezone = timezone
		return membership.toResponse()
	}

	@PatchMapping("/workspaces/{workspaceId}/theme")
	@Transactional
	fun updateTheme(
		@PathVariable workspaceId: UUID,
		@Valid @RequestBody request: UpdateWorkspaceThemeRequest,
		httpRequest: HttpServletRequest,
	): WorkspaceResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		val workspace = workspaceAccess.requireWrite(workspaceId, currentUser.id)
		val membership = memberships.findByWorkspaceIdAndUserId(workspace.id, currentUser.id).orElseThrow()
		require(request.theme in validWorkspaceThemes) { "'${request.theme}' is not a known theme." }
		workspace.theme = request.theme
		return membership.toResponse()
	}

	@PostMapping("/workspaces/{workspaceId}/icon")
	@Transactional
	@ResponseStatus(HttpStatus.CREATED)
	fun uploadIcon(
		@PathVariable workspaceId: UUID,
		@RequestParam("file") file: MultipartFile,
		httpRequest: HttpServletRequest,
	): WorkspaceResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		val workspace = workspaceAccess.requireWrite(workspaceId, currentUser.id)
		val membership = memberships.findByWorkspaceIdAndUserId(workspace.id, currentUser.id).orElseThrow()
		val contentType = file.contentType ?: ""
		require(contentType in allowedIconContentTypes) { "Workspace icon must be a PNG, JPEG, GIF, or WebP image." }
		require(!file.isEmpty) { "Workspace icon file is empty." }
		val key = "workspaces/${workspace.id}/icon/${UUID.randomUUID()}-${sanitizeFilename(file.originalFilename ?: "icon")}"
		val stored = storage.upload(UploadObjectCommand(key = key, contentType = contentType, bytes = file.bytes))
		workspace.iconStorageKey = stored.key
		return membership.toResponse()
	}

	@GetMapping("/workspaces/{workspaceId}/icon")
	fun icon(@PathVariable workspaceId: UUID, httpRequest: HttpServletRequest): ResponseEntity<Void> {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		workspaceAccess.requireRead(workspaceId, currentUser.id)
		val workspace = workspaces.findById(workspaceId).orElseThrow { IllegalArgumentException("Workspace not found.") }
		val key = workspace.iconStorageKey ?: return ResponseEntity.notFound().build()
		return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(storage.inlineUrl(key))).build()
	}

	companion object {
		private val allowedIconContentTypes = setOf("image/png", "image/jpeg", "image/gif", "image/webp")

		private fun sanitizeFilename(filename: String): String =
			filename.trim().replace(Regex("[^A-Za-z0-9._-]"), "_").take(180)
	}
}

@RestController
@RequestMapping("/public/profiles")
class PublicWorkspaceProfileController(
	private val workspaces: WorkspaceRepository,
	private val users: UserAccountRepository,
	private val storage: ObjectStorageService,
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

	@GetMapping("/{publicSlug}/icon")
	fun icon(@PathVariable publicSlug: String): ResponseEntity<Void> {
		val workspace = workspaces.findByPublicSlugIgnoreCase(publicSlug)
			.orElseThrow { IllegalArgumentException("Public workspace profile not found.") }
		val key = workspace.iconStorageKey ?: return ResponseEntity.notFound().build()
		return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(storage.inlineUrl(key))).build()
	}
}

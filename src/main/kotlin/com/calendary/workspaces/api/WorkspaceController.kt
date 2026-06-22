package com.calendary.workspaces.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.workspaces.api.dto.WorkspaceListResponse
import com.calendary.workspaces.api.dto.toResponse
import com.calendary.workspaces.infra.WorkspaceMembershipRepository
import jakarta.servlet.http.HttpServletRequest
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api")
class WorkspaceController(
	private val sessions: AuthSessionService,
	private val memberships: WorkspaceMembershipRepository,
) {
	@GetMapping("/me/workspaces")
	fun myWorkspaces(request: HttpServletRequest): WorkspaceListResponse {
		val currentUser = sessions.currentUser(request.getSession(false))
		return memberships.findByUserIdOrderByCreatedAtAsc(currentUser.id).toResponse()
	}

	@GetMapping("/workspaces")
	fun workspaces(request: HttpServletRequest): WorkspaceListResponse = myWorkspaces(request)
}

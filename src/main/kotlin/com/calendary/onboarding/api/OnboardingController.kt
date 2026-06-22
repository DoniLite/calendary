package com.calendary.onboarding.api

import com.calendary.auth.application.AuthSessionService
import com.calendary.invitations.domain.Invitation
import com.calendary.onboarding.api.dto.AcceptInvitationRequest
import com.calendary.onboarding.api.dto.BootstrapSuperAdminRequest
import com.calendary.onboarding.api.dto.CreatedInvitationResponse
import com.calendary.onboarding.api.dto.InviteCollaboratorRequest
import com.calendary.onboarding.api.dto.UserResponse
import com.calendary.onboarding.application.AcceptInvitationCommand
import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InviteCollaboratorCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.users.domain.UserAccount
import com.calendary.users.domain.UserRole
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import java.time.Duration
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/onboarding")
class OnboardingController(
    private val onboarding: OnboardingService,
    private val sessions: AuthSessionService,
) {
    @PostMapping("/super-admin")
    @ResponseStatus(HttpStatus.CREATED)
    fun bootstrapSuperAdmin(@Valid @RequestBody request: BootstrapSuperAdminRequest): UserResponse {
        val user = onboarding.bootstrapSuperAdmin(
            BootstrapSuperAdminCommand(
                email = request.email,
                password = request.password,
                workspaceName = request.workspaceName,
            ),
        )
        return user.toResponse()
    }

    @PostMapping("/invitations")
    @ResponseStatus(HttpStatus.CREATED)
    fun inviteCollaborator(
        @Valid @RequestBody request: InviteCollaboratorRequest,
        httpRequest: HttpServletRequest,
    ): CreatedInvitationResponse {
        val currentUser = sessions.requireRole(httpRequest.getSession(false), UserRole.SUPER_ADMIN)
        val createdInvitation = onboarding.inviteCollaborator(
            InviteCollaboratorCommand(
                email = request.email,
                invitedById = currentUser.id,
                accessLevel = request.accessLevel,
                expiresIn = Duration.ofDays(request.expiresInDays),
            ),
        )
        return createdInvitation.invitation.toResponse(createdInvitation.rawToken)
    }

    @PostMapping("/invitations/accept")
    @ResponseStatus(HttpStatus.CREATED)
    fun acceptInvitation(@Valid @RequestBody request: AcceptInvitationRequest): UserResponse {
        val user = onboarding.acceptInvitation(
            AcceptInvitationCommand(
                rawToken = request.token,
                password = request.password,
                workspaceName = request.workspaceName,
            ),
        )
        return user.toResponse()
    }

    private fun UserAccount.toResponse(): UserResponse =
        UserResponse(
            id = id,
            email = email,
            role = role.name,
            status = status.name,
        )

    private fun Invitation.toResponse(rawToken: String): CreatedInvitationResponse =
        CreatedInvitationResponse(
            id = id,
            email = email,
            accessLevel = accessLevel,
            token = rawToken,
            expiresAt = expiresAt.toString(),
        )
}









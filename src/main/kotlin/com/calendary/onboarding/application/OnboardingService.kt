package com.calendary.onboarding.application

import com.calendary.invitations.domain.Invitation
import com.calendary.invitations.domain.InvitationStatus
import com.calendary.invitations.infra.InvitationRepository
import com.calendary.mail.application.MailService
import com.calendary.mail.application.SendMailCommand
import com.calendary.mail.config.MailProperties
import com.calendary.notifications.application.CreateNotificationCommand
import com.calendary.notifications.application.NotificationService
import com.calendary.notifications.domain.NotificationType
import com.calendary.users.domain.UserAccount
import com.calendary.users.domain.UserRole
import com.calendary.users.domain.UserStatus
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.domain.Workspace
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import com.calendary.workspaces.domain.WorkspaceMembership
import com.calendary.workspaces.domain.WorkspaceType
import com.calendary.workspaces.infra.WorkspaceMembershipRepository
import com.calendary.workspaces.infra.WorkspaceRepository
import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.UUID
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class OnboardingService(
	private val users: UserAccountRepository,
	private val workspaces: WorkspaceRepository,
	private val memberships: WorkspaceMembershipRepository,
	private val invitations: InvitationRepository,
	private val passwordEncoder: PasswordEncoder,
	private val tokenHasher: InvitationTokenHasher,
	private val notifications: NotificationService,
	private val mail: MailService,
	private val mailProperties: MailProperties,
	private val clock: Clock,
) {
	@Transactional
	fun bootstrapSuperAdmin(command: BootstrapSuperAdminCommand): UserAccount {
		val email = command.email.normalizedEmail()
		require(email.isNotBlank()) { "Email is required." }
		require(command.password.length >= 12) { "Super admin password must contain at least 12 characters." }
		check(!users.existsByRole(UserRole.SUPER_ADMIN)) { "A super admin already exists." }
		check(!users.existsByEmailIgnoreCase(email)) { "A user with this email already exists." }

		val superAdmin = users.save(
			UserAccount(
				email = email,
				passwordHash = passwordEncoder.encode(command.password) ?: error("Password encoder returned null."),
				status = UserStatus.PASSWORD_CHANGE_REQUIRED,
				role = UserRole.SUPER_ADMIN,
			),
		)
		val workspace = workspaces.save(
			Workspace(
				name = command.workspaceName.ifBlank { "Calendary" },
				publicSlug = uniqueWorkspaceSlug(command.workspaceName.ifBlank { "Calendary" }),
				type = WorkspaceType.PERSONAL,
				owner = superAdmin,
			),
		)
		memberships.save(
			WorkspaceMembership(
				workspace = workspace,
				user = superAdmin,
				accessLevel = WorkspaceAccessLevel.OWNER,
			),
		)

		return superAdmin
	}

	@Transactional
	fun inviteCollaborator(command: InviteCollaboratorCommand): CreatedInvitation {
		val email = command.email.normalizedEmail()
		require(email.isNotBlank()) { "Email is required." }
		check(!users.existsByEmailIgnoreCase(email)) { "A user with this email already exists." }

		val inviter = users.findById(command.invitedById)
			.orElseThrow { IllegalArgumentException("Inviter not found.") }
		check(inviter.role == UserRole.SUPER_ADMIN) { "Only the super admin can invite collaborators." }

		val rawToken = UUID.randomUUID().toString()
		val invitation = invitations.save(
			Invitation(
				email = email,
				tokenHash = tokenHasher.hash(rawToken),
				invitedBy = inviter,
				accessLevel = command.accessLevel,
				expiresAt = Instant.now(clock).plus(command.expiresIn),
			),
		)
		notifications.notify(
			CreateNotificationCommand(
				recipientId = inviter.id,
				type = NotificationType.INVITATION_CREATED,
				title = "Invitation sent",
				body = "$email has been invited to Calendary.",
				resourceType = "invitation",
				resourceId = invitation.id,
			),
		)
		val acceptUrl = "${mailProperties.publicBaseUrl}/accept-invitation?token=$rawToken"
		mail.send(
			SendMailCommand(
				to = email,
				subject = "You have been invited to Calendary",
				body = """
					You have been invited to Calendary.

					Accept your invitation:
					$acceptUrl
				""".trimIndent(),
				actionLabel = "Accept invitation",
				actionUrl = acceptUrl,
			),
		)

		return CreatedInvitation(invitation = invitation, rawToken = rawToken)
	}

	@Transactional
	fun acceptInvitation(command: AcceptInvitationCommand): UserAccount {
		require(command.password.length >= 12) { "Collaborator password must contain at least 12 characters." }

		val tokenHash = tokenHasher.hash(command.rawToken)
		val invitation = invitations.findByTokenHash(tokenHash)
			.orElseThrow { IllegalArgumentException("Invitation not found.") }
		check(invitation.status == InvitationStatus.PENDING) { "Invitation is not pending." }
		check(invitation.expiresAt.isAfter(Instant.now(clock))) { "Invitation has expired." }
		check(!users.existsByEmailIgnoreCase(invitation.email)) { "A user with this email already exists." }

		val collaborator = users.save(
			UserAccount(
				email = invitation.email,
				passwordHash = passwordEncoder.encode(command.password) ?: error("Password encoder returned null."),
				status = UserStatus.PASSWORD_CHANGE_REQUIRED,
				role = UserRole.COLLABORATOR,
			),
		)
		val collaboratorWorkspace = workspaces.save(
			Workspace(
				name = command.workspaceName.ifBlank { "${collaborator.email} workspace" },
				publicSlug = uniqueWorkspaceSlug(command.workspaceName.ifBlank { "${collaborator.email} workspace" }),
				type = WorkspaceType.PERSONAL,
				owner = collaborator,
			),
		)
		memberships.save(
			WorkspaceMembership(
				workspace = collaboratorWorkspace,
				user = collaborator,
				accessLevel = WorkspaceAccessLevel.OWNER,
			),
		)

		val inviter = invitation.invitedBy ?: error("Invitation has no inviter.")
		val inviterWorkspace = workspaces.findFirstByOwnerIdAndType(inviter.id, WorkspaceType.PERSONAL)
			.orElseThrow { IllegalStateException("Inviter workspace not found.") }
		memberships.save(
			WorkspaceMembership(
				workspace = inviterWorkspace,
				user = collaborator,
				accessLevel = invitation.accessLevel,
			),
		)

		invitation.status = InvitationStatus.ACCEPTED
		invitation.acceptedAt = Instant.now(clock)
		notifications.notify(
			CreateNotificationCommand(
				recipientId = inviter.id,
				type = NotificationType.INVITATION_ACCEPTED,
				title = "Invitation accepted",
				body = "${collaborator.email} accepted your Calendary invitation.",
				resourceType = "invitation",
				resourceId = invitation.id,
			),
		)

		return collaborator
	}

	private fun String.normalizedEmail(): String = trim().lowercase()

	private fun uniqueWorkspaceSlug(name: String): String {
		val base = name.slugified().ifBlank { "workspace" }
		if (workspaces.findByPublicSlugIgnoreCase(base).isEmpty) {
			return base
		}
		return "$base-${UUID.randomUUID().toString().take(8)}"
	}

	private fun String.slugified(): String =
		lowercase()
			.replace(Regex("[^a-z0-9]+"), "-")
			.trim('-')
			.take(96)
}

data class BootstrapSuperAdminCommand(
	val email: String,
	val password: String,
	val workspaceName: String = "Calendary",
)

data class InviteCollaboratorCommand(
	val email: String,
	val invitedById: UUID,
	val accessLevel: WorkspaceAccessLevel = WorkspaceAccessLevel.READ,
	val expiresIn: Duration = Duration.ofDays(7),
)

data class AcceptInvitationCommand(
	val rawToken: String,
	val password: String,
	val workspaceName: String = "",
)

data class CreatedInvitation(
	val invitation: Invitation,
	val rawToken: String,
)

package com.calendary.invitations.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.users.domain.UserAccount
import com.calendary.workspaces.domain.WorkspaceAccessLevel
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "invitations")
open class Invitation(
	@Column(nullable = false)
	open var email: String = "",

	@Column(name = "token_hash", nullable = false, unique = true)
	open var tokenHash: String = "",

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "invited_by_id", nullable = false)
	open var invitedBy: UserAccount? = null,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var status: InvitationStatus = InvitationStatus.PENDING,

	@Enumerated(EnumType.STRING)
	@Column(name = "access_level", nullable = false)
	open var accessLevel: WorkspaceAccessLevel = WorkspaceAccessLevel.READ,

	@Column(name = "expires_at", nullable = false)
	open var expiresAt: Instant = Instant.now(),

	@Column(name = "accepted_at")
	open var acceptedAt: Instant? = null,
) : AuditableEntity()

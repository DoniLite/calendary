package com.calendary.workspaces.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.users.domain.UserAccount
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
	name = "workspace_memberships",
	uniqueConstraints = [
		UniqueConstraint(name = "uk_workspace_memberships_workspace_user", columnNames = ["workspace_id", "user_id"]),
	],
)
open class WorkspaceMembership(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workspace_id", nullable = false)
	open var workspace: Workspace? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	open var user: UserAccount? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "access_level", nullable = false)
	open var accessLevel: WorkspaceAccessLevel = WorkspaceAccessLevel.READ,
) : AuditableEntity()

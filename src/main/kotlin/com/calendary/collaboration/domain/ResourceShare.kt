package com.calendary.collaboration.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.resources.domain.ResourceType
import com.calendary.users.domain.UserAccount
import com.calendary.workspaces.domain.Workspace
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
@Table(name = "resource_shares")
open class ResourceShare(
	@Enumerated(EnumType.STRING)
	@Column(name = "resource_type", nullable = false)
	open var resourceType: ResourceType = ResourceType.TASK,

	@Column(name = "resource_id", nullable = false)
	open var resourceId: java.util.UUID = java.util.UUID.randomUUID(),

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "owner_workspace_id", nullable = false)
	open var ownerWorkspace: Workspace? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "requested_by_id", nullable = false)
	open var requestedBy: UserAccount? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "recipient_id", nullable = false)
	open var recipient: UserAccount? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "access_level", nullable = false)
	open var accessLevel: WorkspaceAccessLevel = WorkspaceAccessLevel.READ,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var status: ShareStatus = ShareStatus.PENDING,

	@Column(nullable = false)
	open var message: String = "",

	@Column(name = "decided_at")
	open var decidedAt: Instant? = null,
) : AuditableEntity()

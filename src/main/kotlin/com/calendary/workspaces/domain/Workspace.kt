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

@Entity
@Table(name = "workspaces")
open class Workspace(
	@Column(nullable = false)
	open var name: String = "",

	@Column(name = "public_slug", nullable = false)
	open var publicSlug: String = "",

	@Column(name = "default_timezone", nullable = false)
	open var defaultTimezone: String = "Europe/Paris",

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var type: WorkspaceType = WorkspaceType.PERSONAL,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "owner_id", nullable = false)
	open var owner: UserAccount? = null,
) : AuditableEntity()

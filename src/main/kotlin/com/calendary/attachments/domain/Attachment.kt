package com.calendary.attachments.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.resources.domain.ResourceType
import com.calendary.users.domain.UserAccount
import com.calendary.workspaces.domain.Workspace
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "attachments")
open class Attachment(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workspace_id", nullable = false)
	open var workspace: Workspace? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "uploaded_by_id", nullable = false)
	open var uploadedBy: UserAccount? = null,

	@Enumerated(EnumType.STRING)
	@Column(name = "resource_type", nullable = false)
	open var resourceType: ResourceType = ResourceType.TASK,

	@Column(name = "resource_id", nullable = false)
	open var resourceId: java.util.UUID = java.util.UUID.randomUUID(),

	@Column(name = "original_filename", nullable = false)
	open var originalFilename: String = "",

	@Column(name = "content_type", nullable = false)
	open var contentType: String = "",

	@Column(name = "size_bytes", nullable = false)
	open var sizeBytes: Long = 0,

	@Column(name = "storage_key", nullable = false)
	open var storageKey: String = "",

	@Column(name = "checksum_sha256")
	open var checksumSha256: String? = null,
) : AuditableEntity()

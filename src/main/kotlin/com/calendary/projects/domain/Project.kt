package com.calendary.projects.domain

import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.common.persistence.AuditableEntity
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
import java.time.Instant

@Entity
@Table(name = "projects")
open class Project(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workspace_id", nullable = false)
	open var workspace: Workspace? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "created_by_id", nullable = false)
	open var createdBy: UserAccount? = null,

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "parent_project_id")
	open var parentProject: Project? = null,

	@Column(nullable = false)
	open var title: String = "",

	@Column(nullable = false)
	open var description: String = "",

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var type: ProjectType = ProjectType.PROJECT,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var status: ProjectStatus = ProjectStatus.ACTIVE,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var visibility: CalendarVisibility = CalendarVisibility.PRIVATE,

	@Column(name = "starts_at")
	open var startsAt: Instant? = null,

	@Column(name = "due_at")
	open var dueAt: Instant? = null,
) : AuditableEntity()

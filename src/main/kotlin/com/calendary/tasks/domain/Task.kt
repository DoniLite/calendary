package com.calendary.tasks.domain

import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.common.persistence.AuditableEntity
import com.calendary.projects.domain.Project
import com.calendary.users.domain.UserAccount
import com.calendary.workspaces.domain.Workspace
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "tasks")
open class Task(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "workspace_id", nullable = false)
	open var workspace: Workspace? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "created_by_id", nullable = false)
	open var createdBy: UserAccount? = null,

	@Column(nullable = false)
	open var title: String = "",

	@Column(nullable = false)
	open var description: String = "",

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var status: TaskStatus = TaskStatus.TODO,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var priority: TaskPriority = TaskPriority.MEDIUM,

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	open var visibility: CalendarVisibility = CalendarVisibility.PRIVATE,

	@Enumerated(EnumType.STRING)
	@Column(name = "color_preset", nullable = false)
	open var colorPreset: CalendarColorPreset = CalendarColorPreset.GREEN,

	@Column(name = "due_at")
	open var dueAt: Instant? = null,

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "project_id")
	open var project: Project? = null,

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "epic_id")
	open var epic: Project? = null,

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "parent_task_id")
	open var parentTask: Task? = null,

	@Column(name = "estimate_minutes")
	open var estimateMinutes: Int? = null,

	@OneToMany(mappedBy = "task", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
	open var assignees: MutableList<TaskAssignee> = mutableListOf(),
) : AuditableEntity()

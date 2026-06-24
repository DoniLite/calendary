package com.calendary.tasks.domain

import com.calendary.common.persistence.AuditableEntity
import com.calendary.users.domain.UserAccount
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "task_assignees")
open class TaskAssignee(
	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "task_id", nullable = false)
	open var task: Task? = null,

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "user_id", nullable = false)
	open var user: UserAccount? = null,
) : AuditableEntity()

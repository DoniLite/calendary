package com.calendary.tasks.infra

import com.calendary.tasks.domain.TaskAssignee
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface TaskAssigneeRepository : JpaRepository<TaskAssignee, UUID> {
	fun findByUserId(userId: UUID): List<TaskAssignee>
}

package com.calendary.tasks.application

import com.calendary.calendar.domain.CalendarBlock
import com.calendary.calendar.domain.CalendarBlockSourceType
import com.calendary.calendar.domain.CalendarColorPreset
import com.calendary.calendar.domain.CalendarVisibility
import com.calendary.calendar.infra.CalendarBlockRepository
import com.calendary.notifications.application.CreateNotificationCommand
import com.calendary.notifications.application.NotificationService
import com.calendary.notifications.domain.NotificationType
import com.calendary.projects.domain.ProjectType
import com.calendary.projects.infra.ProjectRepository
import com.calendary.resources.domain.ResourceType
import com.calendary.tasks.domain.Task
import com.calendary.tasks.domain.TaskAssignee
import com.calendary.tasks.domain.TaskPriority
import com.calendary.tasks.domain.TaskStatus
import com.calendary.tasks.infra.TaskRepository
import com.calendary.users.domain.UserAccount
import com.calendary.users.infra.UserAccountRepository
import com.calendary.workspaces.application.WorkspaceAccessService
import java.time.Instant
import java.util.UUID
import org.hibernate.Hibernate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class TaskService(
	private val tasks: TaskRepository,
	private val calendarBlocks: CalendarBlockRepository,
	private val users: UserAccountRepository,
	private val projects: ProjectRepository,
	private val workspaceAccess: WorkspaceAccessService,
	private val notifications: NotificationService,
) {
	@Transactional
	fun create(command: CreateTaskCommand): TaskWithSchedule {
		require(command.title.isNotBlank()) { "Task title is required." }
		if (command.plannedStart != null || command.plannedEnd != null) {
			require(command.plannedStart != null && command.plannedEnd != null) { "Task planning requires start and end." }
			require(command.plannedEnd.isAfter(command.plannedStart)) { "Task planned end must be after start." }
		}

		val workspace = workspaceAccess.requireWrite(command.workspaceId, command.userId)
		val creator = users.findById(command.userId)
			.orElseThrow { IllegalArgumentException("User not found.") }
		val project = command.projectId?.let {
			projects.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Project not found.") }
				.also { found -> require(found.type == ProjectType.PROJECT) { "Task project must reference a project." } }
		}
		val epic = command.epicId?.let {
			projects.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Epic not found.") }
				.also { found -> require(found.type == ProjectType.EPIC) { "Task epic must reference an epic." } }
		}
		val parentTask = command.parentTaskId?.let {
			tasks.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Parent task not found.") }
		}
		val task = tasks.save(
			Task(
				workspace = workspace,
				createdBy = creator,
				title = command.title.trim(),
				description = command.description,
				status = command.status,
				priority = command.priority,
				visibility = command.visibility,
				colorPreset = command.colorPreset,
				dueAt = command.dueAt,
				project = project,
				epic = epic,
				parentTask = parentTask,
				estimateMinutes = command.estimateMinutes,
			),
		)
		if (command.plannedStart != null && command.plannedEnd != null) {
			calendarBlocks.save(
				CalendarBlock(
					workspace = workspace,
					title = task.title,
					startsAt = command.plannedStart,
					endsAt = command.plannedEnd,
					timezone = command.timezone.ifBlank { "UTC" },
					sourceType = CalendarBlockSourceType.TASK,
					sourceId = task.id,
					visibility = task.visibility,
					colorPreset = task.colorPreset,
					busy = true,
				),
			)
		}
		syncAssignees(task, command.assigneeEmails, creator)
		initializeAssignees(task)
		val block = if (command.plannedStart != null && command.plannedEnd != null) {
			calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.TASK, task.id).orElse(null)
		} else {
			null
		}
		return TaskWithSchedule(task, block)
	}

	@Transactional(readOnly = true)
	fun list(workspaceId: UUID, userId: UUID): List<TaskWithSchedule> {
		workspaceAccess.requireRead(workspaceId, userId)
		val found = tasks.findByWorkspaceIdOrderByCreatedAtDesc(workspaceId)
			.onEach { initializeAssignees(it) }
		val blocksBySourceId = calendarBlocks.findBySourceTypeAndSourceIdIn(CalendarBlockSourceType.TASK, found.map { it.id })
			.associateBy { it.sourceId }
		return found.map { TaskWithSchedule(it, blocksBySourceId[it.id]) }
	}

	@Transactional(readOnly = true)
	fun get(workspaceId: UUID, taskId: UUID, userId: UUID): TaskWithSchedule {
		workspaceAccess.requireRead(workspaceId, userId)
		val task = tasks.findByIdAndWorkspaceId(taskId, workspaceId)
			.orElseThrow { IllegalArgumentException("Task not found.") }
			.also { initializeAssignees(it) }
		val block = calendarBlocks.findBySourceTypeAndSourceIdAndWorkspaceId(CalendarBlockSourceType.TASK, task.id, workspaceId).orElse(null)
		return TaskWithSchedule(task, block)
	}

	@Transactional
	fun update(command: UpdateTaskCommand): TaskWithSchedule {
		require(command.title.isNotBlank()) { "Task title is required." }
		if (command.plannedStart != null || command.plannedEnd != null) {
			require(command.plannedStart != null && command.plannedEnd != null) { "Task planning requires start and end." }
			require(command.plannedEnd.isAfter(command.plannedStart)) { "Task planned end must be after start." }
		}
		val workspace = workspaceAccess.requireWrite(command.workspaceId, command.userId)
		val actor = users.findById(command.userId)
			.orElseThrow { IllegalArgumentException("User not found.") }
		val task = tasks.findByIdAndWorkspaceId(command.taskId, command.workspaceId)
			.orElseThrow { IllegalArgumentException("Task not found.") }
		val project = command.projectId?.let {
			projects.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Project not found.") }
				.also { found -> require(found.type == ProjectType.PROJECT) { "Task project must reference a project." } }
		}
		val epic = command.epicId?.let {
			projects.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Epic not found.") }
				.also { found -> require(found.type == ProjectType.EPIC) { "Task epic must reference an epic." } }
		}
		val parentTask = command.parentTaskId?.let {
			tasks.findByIdAndWorkspaceId(it, command.workspaceId)
				.orElseThrow { IllegalArgumentException("Parent task not found.") }
				.also { found -> require(found.id != task.id) { "Task cannot be its own parent." } }
		}
		task.title = command.title.trim()
		task.description = command.description
		task.status = command.status
		task.priority = command.priority
		task.visibility = command.visibility
		task.colorPreset = command.colorPreset
		task.dueAt = command.dueAt
		task.project = project
		task.epic = epic
		task.parentTask = parentTask
		task.estimateMinutes = command.estimateMinutes

		val existingBlock = calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.TASK, task.id)
		val resultBlock = if (command.plannedStart != null && command.plannedEnd != null) {
			val block = existingBlock.orElseGet {
				CalendarBlock(
					workspace = workspace,
					sourceType = CalendarBlockSourceType.TASK,
					sourceId = task.id,
				)
			}
			block.title = task.title
			block.startsAt = command.plannedStart
			block.endsAt = command.plannedEnd
			block.timezone = command.timezone.ifBlank { "UTC" }
			block.visibility = task.visibility
			block.colorPreset = task.colorPreset
			block.busy = task.status != TaskStatus.DONE && task.status != TaskStatus.ARCHIVED
			if (existingBlock.isEmpty) {
				calendarBlocks.save(block)
			}
			block
		} else {
			existingBlock.ifPresent { calendarBlocks.delete(it) }
			null
		}
		syncAssignees(task, command.assigneeEmails, actor)
		initializeAssignees(task)
		return TaskWithSchedule(task, resultBlock)
	}

	@Transactional
	fun updateStatus(workspaceId: UUID, taskId: UUID, userId: UUID, status: TaskStatus): TaskWithSchedule {
		workspaceAccess.requireWrite(workspaceId, userId)
		val task = tasks.findByIdAndWorkspaceId(taskId, workspaceId)
			.orElseThrow { IllegalArgumentException("Task not found.") }
		task.status = status
		val block = calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.TASK, task.id)
			.map { it.also { found -> found.busy = status != TaskStatus.DONE && status != TaskStatus.ARCHIVED } }
			.orElse(null)
		initializeAssignees(task)
		return TaskWithSchedule(task, block)
	}

	private fun initializeAssignees(task: Task) {
		Hibernate.initialize(task.assignees)
		task.assignees.forEach { Hibernate.initialize(it.user) }
	}

	private fun syncAssignees(task: Task, assigneeEmails: List<String>, actor: UserAccount) {
		val resolved = assigneeEmails
			.map { it.trim() }
			.filter { it.isNotBlank() }
			.distinctBy { it.lowercase() }
			.map { email ->
				users.findByEmailIgnoreCase(email)
					.orElseThrow { IllegalArgumentException("Assignee not found: $email") }
			}
		val previousUserIds = task.assignees.mapNotNull { it.user?.id }.toSet()
		val newAssignees = resolved.filterNot { previousUserIds.contains(it.id) }

		task.assignees.clear()
		resolved.forEach { user -> task.assignees.add(TaskAssignee(task = task, user = user)) }

		newAssignees.forEach { user ->
			notifications.notify(
				CreateNotificationCommand(
					recipientId = user.id,
					type = NotificationType.TASK_ASSIGNED,
					title = "You were assigned to a task",
					body = "${actor.email} assigned you to \"${task.title}\".",
					resourceType = ResourceType.TASK.name,
					resourceId = task.id,
					actionUrl = "/tasks/${task.id}",
				),
			)
		}
	}

	@Transactional
	fun delete(workspaceId: UUID, taskId: UUID, userId: UUID) {
		workspaceAccess.requireWrite(workspaceId, userId)
		val task = tasks.findByIdAndWorkspaceId(taskId, workspaceId)
			.orElseThrow { IllegalArgumentException("Task not found.") }
		calendarBlocks.findBySourceTypeAndSourceId(CalendarBlockSourceType.TASK, task.id)
			.ifPresent { calendarBlocks.delete(it) }
		tasks.delete(task)
	}
}

data class TaskWithSchedule(
	val task: Task,
	val block: CalendarBlock?,
)

data class CreateTaskCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val title: String,
	val description: String = "",
	val status: TaskStatus = TaskStatus.TODO,
	val priority: TaskPriority = TaskPriority.MEDIUM,
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val colorPreset: CalendarColorPreset = CalendarColorPreset.GREEN,
	val dueAt: Instant? = null,
	val projectId: UUID? = null,
	val epicId: UUID? = null,
	val parentTaskId: UUID? = null,
	val estimateMinutes: Int? = null,
	val plannedStart: Instant? = null,
	val plannedEnd: Instant? = null,
	val timezone: String = "UTC",
	val assigneeEmails: List<String> = emptyList(),
)

data class UpdateTaskCommand(
	val workspaceId: UUID,
	val userId: UUID,
	val taskId: UUID,
	val title: String,
	val description: String = "",
	val status: TaskStatus = TaskStatus.TODO,
	val priority: TaskPriority = TaskPriority.MEDIUM,
	val visibility: CalendarVisibility = CalendarVisibility.PRIVATE,
	val colorPreset: CalendarColorPreset = CalendarColorPreset.GREEN,
	val dueAt: Instant? = null,
	val projectId: UUID? = null,
	val epicId: UUID? = null,
	val parentTaskId: UUID? = null,
	val estimateMinutes: Int? = null,
	val plannedStart: Instant? = null,
	val plannedEnd: Instant? = null,
	val timezone: String = "UTC",
	val assigneeEmails: List<String> = emptyList(),
)

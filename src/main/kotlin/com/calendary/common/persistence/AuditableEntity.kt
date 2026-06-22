package com.calendary.common.persistence

import jakarta.persistence.Column
import jakarta.persistence.Id
import jakarta.persistence.MappedSuperclass
import jakarta.persistence.PrePersist
import jakarta.persistence.PreUpdate
import java.time.Instant
import java.util.UUID

@MappedSuperclass
abstract class AuditableEntity(
	@Id
	@Column(nullable = false, updatable = false)
	open var id: UUID = UUID.randomUUID(),
) {
	@Column(name = "created_at", nullable = false, updatable = false)
	open lateinit var createdAt: Instant

	@Column(name = "updated_at", nullable = false)
	open lateinit var updatedAt: Instant

	@PrePersist
	fun prePersist() {
		val now = Instant.now()
		createdAt = now
		updatedAt = now
	}

	@PreUpdate
	fun preUpdate() {
		updatedAt = Instant.now()
	}
}

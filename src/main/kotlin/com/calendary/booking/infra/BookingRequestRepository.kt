package com.calendary.booking.infra

import com.calendary.booking.domain.BookingRequest
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface BookingRequestRepository : JpaRepository<BookingRequest, UUID> {
	fun findByWorkspaceIdOrderByCreatedAtDesc(workspaceId: UUID): List<BookingRequest>

	fun findByIdAndWorkspaceId(id: UUID, workspaceId: UUID): Optional<BookingRequest>
}

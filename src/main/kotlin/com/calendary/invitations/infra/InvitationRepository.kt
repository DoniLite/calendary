package com.calendary.invitations.infra

import com.calendary.invitations.domain.Invitation
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface InvitationRepository : JpaRepository<Invitation, UUID> {
	fun findByTokenHash(tokenHash: String): Optional<Invitation>
}

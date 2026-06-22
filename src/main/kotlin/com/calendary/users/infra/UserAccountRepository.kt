package com.calendary.users.infra

import com.calendary.users.domain.UserAccount
import com.calendary.users.domain.UserRole
import java.util.Optional
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface UserAccountRepository : JpaRepository<UserAccount, UUID> {
	fun existsByEmailIgnoreCase(email: String): Boolean

	fun existsByRole(role: UserRole): Boolean

	fun findByEmailIgnoreCase(email: String): Optional<UserAccount>
}

package com.calendary.auth.application

import com.calendary.common.api.ForbiddenException
import com.calendary.common.api.UnauthorizedException
import com.calendary.users.domain.UserAccount
import com.calendary.users.domain.UserRole
import com.calendary.users.infra.UserAccountRepository
import jakarta.servlet.http.HttpSession
import java.util.UUID
import org.springframework.stereotype.Service

@Service
class AuthSessionService(
	private val users: UserAccountRepository,
) {
	fun signIn(session: HttpSession, user: UserAccount) {
		session.setAttribute(USER_ID_SESSION_KEY, user.id.toString())
	}

	fun signOut(session: HttpSession) {
		session.invalidate()
	}

	fun currentUser(session: HttpSession?): UserAccount {
		val rawUserId = session?.getAttribute(USER_ID_SESSION_KEY) as? String
			?: throw UnauthorizedException()
		val userId = runCatching { UUID.fromString(rawUserId) }
			.getOrElse { throw UnauthorizedException("Invalid session.") }
		return users.findById(userId)
			.orElseThrow { UnauthorizedException("User not found for current session.") }
	}

	fun requireRole(session: HttpSession?, role: UserRole): UserAccount {
		val currentUser = currentUser(session)
		if (currentUser.role != role) {
			throw ForbiddenException("Required role: $role.")
		}
		return currentUser
	}

	companion object {
		private const val USER_ID_SESSION_KEY = "calendary.userId"
	}
}

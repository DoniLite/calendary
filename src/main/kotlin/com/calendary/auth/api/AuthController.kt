package com.calendary.auth.api

import com.calendary.auth.api.dto.AuthenticatedUserResponse
import com.calendary.auth.api.dto.ChangePasswordRequest
import com.calendary.auth.api.dto.LoginRequest
import com.calendary.auth.api.dto.toAuthenticatedResponse
import com.calendary.auth.application.AuthService
import com.calendary.auth.application.AuthSessionService
import com.calendary.auth.application.LoginCommand
import com.calendary.users.application.AccountSecurityService
import com.calendary.users.application.ChangePasswordCommand
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpSession
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/auth")
class AuthController(
	private val auth: AuthService,
	private val sessions: AuthSessionService,
	private val accountSecurity: AccountSecurityService,
) {
	@PostMapping("/login")
	fun login(
		@Valid @RequestBody request: LoginRequest,
		httpRequest: HttpServletRequest,
	): AuthenticatedUserResponse {
		val user = auth.authenticate(LoginCommand(email = request.email, password = request.password))
		sessions.signIn(httpRequest, user)
		return user.toAuthenticatedResponse()
	}

	@PostMapping("/logout")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	fun logout(session: HttpSession) {
		sessions.signOut(session)
	}

	@GetMapping("/me")
	fun me(request: HttpServletRequest): AuthenticatedUserResponse =
		sessions.currentUser(request.getSession(false)).toAuthenticatedResponse()

	@PatchMapping("/password")
	fun changePassword(
		@Valid @RequestBody request: ChangePasswordRequest,
		httpRequest: HttpServletRequest,
	): AuthenticatedUserResponse {
		val currentUser = sessions.currentUser(httpRequest.getSession(false))
		accountSecurity.changePassword(
			ChangePasswordCommand(
				userId = currentUser.id,
				currentPassword = request.currentPassword,
				newPassword = request.newPassword,
			),
		)
		return sessions.currentUser(httpRequest.getSession(false)).toAuthenticatedResponse()
	}
}

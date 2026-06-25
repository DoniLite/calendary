package com.calendary.auth.api

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.InvitationTokenHasher
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import com.calendary.users.infra.UserAccountRepository
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch as mvcPatch
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post as mvcPost
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class AuthControllerIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
	@Autowired private val users: UserAccountRepository,
	@Autowired private val tokenHasher: InvitationTokenHasher,
) : PostgresIntegrationTest() {

	// ── existing auth tests ───────────────────────────────────────────────────

	@Test
	@Transactional
	fun `logs in and returns current user`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(mvcGet("/api/auth/me").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.email").value("owner@calendary.dev"))
			.andExpect(jsonPath("$.role").value("SUPER_ADMIN"))
			.andExpect(jsonPath("$.passwordChangeRequired").value(false))
	}

	@Test
	@Transactional
	fun `login rotates existing session id`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val existingSession = MockHttpSession()
		val initialSessionId = existingSession.id

		val result = mockMvc.perform(
			mvcPost("/api/auth/login")
				.session(existingSession)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "email": "owner@calendary.dev",
				  "password": "very-secret-password"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isOk)
			.andReturn()

		val authenticatedSession = result.request.session as MockHttpSession
		kotlin.test.assertNotEquals(initialSessionId, authenticatedSession.id)
	}

	@Test
	@Transactional
	fun `rejects invalid login`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)

		mockMvc.post("/api/auth/login") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "email": "owner@calendary.dev",
				  "password": "wrong-password"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isUnauthorized() }
				jsonPath("$.code") { value("invalid_credentials") }
			}
	}

	@Test
	@Transactional
	fun `requires session for current user`() {
		mockMvc.get("/api/auth/me")
			.andExpect {
				status { isUnauthorized() }
				jsonPath("$.code") { value("unauthorized") }
			}
	}

	@Test
	@Transactional
	fun `changes password and activates user`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(
			mvcPatch("/api/auth/password")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content(
					"""
				{
				  "currentPassword": "very-secret-password",
				  "newPassword": "new-secure-password"
				}
					""".trimIndent(),
				),
		)
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.status").value("ACTIVE"))
			.andExpect(jsonPath("$.passwordChangeRequired").value(false))

		mockMvc.post("/api/auth/login") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "email": "owner@calendary.dev",
				  "password": "new-secure-password"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isOk() }
				jsonPath("$.status") { value("ACTIVE") }
			}
	}

	@Test
	@Transactional
	fun `logout invalidates session`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(mvcPost("/api/auth/logout").session(session))
			.andExpect(status().isNoContent)

		mockMvc.perform(mvcGet("/api/auth/me").session(session))
			.andExpect(status().isUnauthorized)
	}

	// ── forgot-password / reset-password ──────────────────────────────────────

	@Test
	@Transactional
	fun `forgot password returns 204 for any email without revealing user existence`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(email = "owner@calendary.dev", password = "very-secret-password"),
		)

		// Known email
		mockMvc.perform(
			mvcPost("/api/auth/forgot-password")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"email":"owner@calendary.dev"}"""),
		).andExpect(status().isNoContent)

		// Unknown email — must also return 204, not 404
		mockMvc.perform(
			mvcPost("/api/auth/forgot-password")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"email":"nobody@calendary.dev"}"""),
		).andExpect(status().isNoContent)
	}

	@Test
	@Transactional
	fun `reset password with valid token returns 204 and allows login with new password`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(email = "owner@calendary.dev", password = "very-secret-password"),
		)
		val rawToken = "http-test-reset-token-abc123"
		val dbUser = users.findById(superAdmin.id).orElseThrow()
		dbUser.passwordResetToken = tokenHasher.hash(rawToken)
		dbUser.passwordResetExpiresAt = Instant.now().plus(1, ChronoUnit.HOURS)

		mockMvc.perform(
			mvcPost("/api/auth/reset-password")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"token":"$rawToken","newPassword":"reset-brand-new-password"}"""),
		).andExpect(status().isNoContent)

		mockMvc.post("/api/auth/login") {
			contentType = MediaType.APPLICATION_JSON
			content = """{"email":"owner@calendary.dev","password":"reset-brand-new-password"}"""
		}.andExpect { status { isOk() } }
	}

	// ── change-email / verify-email ───────────────────────────────────────────

	@Test
	@Transactional
	fun `change email requires authenticated session`() {
		mockMvc.perform(
			mvcPatch("/api/auth/email")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"newEmail":"new@calendary.dev"}"""),
		).andExpect(status().isUnauthorized)
	}

	@Test
	@Transactional
	fun `change email stores pending email for authenticated user`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(email = "owner@calendary.dev", password = "very-secret-password"),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(
			mvcPatch("/api/auth/email")
				.session(session)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"newEmail":"new-owner@calendary.dev"}"""),
		).andExpect(status().isNoContent)
	}

	@Test
	@Transactional
	fun `verify email with valid token applies the pending address`() {
		val superAdmin = onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(email = "owner@calendary.dev", password = "very-secret-password"),
		)
		val rawToken = "http-test-email-verify-token-xyz789"
		val dbUser = users.findById(superAdmin.id).orElseThrow()
		dbUser.pendingEmail = "verified-new@calendary.dev"
		dbUser.emailVerificationToken = tokenHasher.hash(rawToken)
		dbUser.emailVerificationExpiresAt = Instant.now().plus(1, ChronoUnit.HOURS)

		// verify-email is public — no session required
		mockMvc.perform(
			mvcPost("/api/auth/verify-email")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""{"token":"$rawToken"}"""),
		).andExpect(status().isNoContent)

		// New email works for login
		mockMvc.post("/api/auth/login") {
			contentType = MediaType.APPLICATION_JSON
			content = """{"email":"verified-new@calendary.dev","password":"very-secret-password"}"""
		}.andExpect { status { isOk() } }
	}

	// ── helpers ───────────────────────────────────────────────────────────────

	private fun loginAs(email: String, password: String): MockHttpSession {
		val result = mockMvc.post("/api/auth/login") {
			contentType = MediaType.APPLICATION_JSON
			content = """
				{
				  "email": "$email",
				  "password": "$password"
				}
			""".trimIndent()
		}
			.andExpect {
				status { isOk() }
			}
			.andReturn()

		return result.request.session as MockHttpSession
	}
}

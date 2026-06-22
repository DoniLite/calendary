package com.calendary.auth.api

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
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
) : PostgresIntegrationTest() {
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
			.andExpect(jsonPath("$.passwordChangeRequired").value(true))
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

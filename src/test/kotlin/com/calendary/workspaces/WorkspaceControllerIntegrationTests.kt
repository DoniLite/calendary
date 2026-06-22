package com.calendary.workspaces

import com.calendary.onboarding.application.BootstrapSuperAdminCommand
import com.calendary.onboarding.application.OnboardingService
import com.calendary.support.PostgresIntegrationTest
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.MediaType
import org.springframework.mock.web.MockHttpSession
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get as mvcGet
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.transaction.annotation.Transactional

class WorkspaceControllerIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
	@Autowired private val onboarding: OnboardingService,
) : PostgresIntegrationTest() {
	@Test
	@Transactional
	fun `lists current user workspaces`() {
		onboarding.bootstrapSuperAdmin(
			BootstrapSuperAdminCommand(
				email = "owner@calendary.dev",
				password = "very-secret-password",
				workspaceName = "Owner workspace",
			),
		)
		val session = loginAs("owner@calendary.dev", "very-secret-password")

		mockMvc.perform(mvcGet("/api/me/workspaces").session(session))
			.andExpect(status().isOk)
			.andExpect(jsonPath("$.items[0].name").value("Owner workspace"))
			.andExpect(jsonPath("$.items[0].accessLevel").value("OWNER"))
	}

	@Test
	@Transactional
	fun `requires session to list workspaces`() {
		mockMvc.get("/api/me/workspaces")
			.andExpect {
				status { isUnauthorized() }
			}
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

package com.calendary.docs

import com.calendary.support.PostgresIntegrationTest
import kotlin.test.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

class OpenApiIntegrationTests(
	@Autowired private val mockMvc: MockMvc,
) : PostgresIntegrationTest() {
	@Test
	fun `exposes openapi document`() {
		mockMvc.get("/v3/api-docs")
			.andExpect {
				status { isOk() }
				jsonPath("$.info.title") { value("Calendary API") }
				jsonPath("$.components.securitySchemes.sessionCookie.type") { value("apiKey") }
				jsonPath("$.components.securitySchemes.sessionCookie.in") { value("cookie") }
				jsonPath("$.components.securitySchemes.sessionCookie.name") { value("JSESSIONID") }
				jsonPath("$.tags[?(@.name == 'Auth')]") { exists() }
				jsonPath("$.tags[?(@.name == 'Calendar')]") { exists() }
				jsonPath("$.tags[?(@.name == 'Public')]") { exists() }
				jsonPath("$.paths['/api/auth/login']") { exists() }
				jsonPath("$.paths['/api/auth/login'].post.security.length()") { value(0) }
				jsonPath("$.paths['/api/auth/login'].post.tags[0]") { value("Auth") }
				jsonPath("$.paths['/api/onboarding/super-admin']") { exists() }
				jsonPath("$.paths['/api/onboarding/super-admin'].post.security.length()") { value(0) }
				jsonPath("$.paths['/api/onboarding/super-admin'].post.tags[0]") { value("Onboarding") }
				jsonPath("$.paths['/api/notifications']") { exists() }
				jsonPath("$.paths['/api/notifications'].get.security[0].sessionCookie") { exists() }
				jsonPath("$.paths['/api/notifications'].get.tags[0]") { value("Notifications") }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/calendar']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/calendar'].get.security[0].sessionCookie") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/calendar'].get.tags[0]") { value("Calendar") }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/events']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/events/{id}']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/tasks']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/tasks/{id}']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/projects']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/projects/{id}']") { exists() }
				jsonPath("$.paths['/api/collaborations']") { exists() }
				jsonPath("$.paths['/api/collaborations'].post.tags[0]") { value("Collaborations") }
				jsonPath("$.paths['/api/collaborations/inbox']") { exists() }
				jsonPath("$.paths['/api/collaborations/{id}/accept']") { exists() }
				jsonPath("$.paths['/api/resources/{resourceType}/{resourceId}/attachments']") { exists() }
				jsonPath("$.paths['/api/resources/{resourceType}/{resourceId}/attachments'].post.tags[0]") { value("Attachments") }
				jsonPath("$.paths['/api/resources/{resourceType}/{resourceId}/attachments/{id}/download-url']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/booking-requests']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/booking-requests'].get.tags[0]") { value("Booking") }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/booking-requests/{id}/accept']") { exists() }
				jsonPath("$.paths['/api/workspaces/{workspaceId}/booking-requests/{id}/reject']") { exists() }
				jsonPath("$.paths['/public/workspaces/{workspaceId}/calendar']") { exists() }
				jsonPath("$.paths['/public/workspaces/{workspaceId}/calendar'].get.security.length()") { value(0) }
				jsonPath("$.paths['/public/workspaces/{workspaceId}/calendar'].get.tags[0]") { value("Public") }
				jsonPath("$.paths['/public/workspaces/{workspaceId}/availability']") { exists() }
				jsonPath("$.paths['/public/workspaces/{workspaceId}/booking-requests']") { exists() }
				jsonPath("$.paths['/api/me/workspaces']") { exists() }
			}
	}
}

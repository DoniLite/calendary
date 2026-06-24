package com.calendary.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import io.swagger.v3.oas.models.tags.Tag
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springdoc.core.customizers.OpenApiCustomizer

@Configuration
class OpenApiConfig {
	@Bean
	fun calendaryOpenApi(): OpenAPI =
		OpenAPI()
			.components(
				Components()
					.addSecuritySchemes(
						SESSION_COOKIE_SCHEME,
						SecurityScheme()
							.type(SecurityScheme.Type.APIKEY)
							.`in`(SecurityScheme.In.COOKIE)
							.name("JSESSIONID")
							.description("HTTP-only session cookie returned by /api/auth/login."),
					),
			)
			.tags(API_TAGS.map { (name, description) -> Tag().name(name).description(description) })
			.info(
				Info()
					.title("Calendary API")
					.version("0.1.0")
					.description(
						"""
						Personal calendar, task, project and collaboration server API.

						Authenticated endpoints use the JSESSIONID session cookie. Public endpoints are limited to login, onboarding bootstrap, invitation acceptance, Swagger/OpenAPI metadata and /public/** calendar/booking flows.
						""".trimIndent(),
					),
			)

	@Bean
	fun calendarySecurityOpenApiCustomizer(): OpenApiCustomizer =
		OpenApiCustomizer { openApi ->
			openApi.paths?.forEach { (path, pathItem) ->
				pathItem.readOperations().forEach { operation ->
					operation.tags = listOf(path.toApiTag())
					if (path.requiresSessionCookie()) {
						operation.addSecurityItem(SecurityRequirement().addList(SESSION_COOKIE_SCHEME))
					} else {
						operation.security = emptyList()
					}
				}
			}
		}

	private fun String.requiresSessionCookie(): Boolean =
		startsWith("/api/") && this !in PUBLIC_API_PATHS

	private fun String.toApiTag(): String =
		when {
			startsWith("/api/auth") -> "Auth"
			startsWith("/api/onboarding") -> "Onboarding"
			startsWith("/api/me") || this == "/api/workspaces" -> "Workspaces"
			contains("/calendar") && startsWith("/api/") -> "Calendar"
			contains("/events") -> "Events"
			contains("/tasks") -> "Tasks"
			contains("/projects") -> "Projects"
			contains("/booking-requests") && startsWith("/api/") -> "Booking"
			startsWith("/api/notifications") -> "Notifications"
			startsWith("/api/collaborations") -> "Collaborations"
			startsWith("/api/resources") -> "Attachments"
			startsWith("/public/") -> "Public"
			else -> "System"
		}

	companion object {
		private const val SESSION_COOKIE_SCHEME = "sessionCookie"

		private val API_TAGS = linkedMapOf(
			"Auth" to "Session login, logout and password management.",
			"Onboarding" to "First super admin bootstrap and collaborator invitation acceptance.",
			"Workspaces" to "Authenticated user workspace memberships and active workspace selection data.",
			"Calendar" to "Authenticated calendar feed for a workspace.",
			"Events" to "Workspace events and meeting blocks.",
			"Tasks" to "Workspace tasks and planned task blocks.",
			"Projects" to "Workspace projects and epics.",
			"Booking" to "Authenticated booking request review and decisions.",
			"Notifications" to "In-app notification inbox.",
			"Collaborations" to "Resource sharing proposals and confirmations.",
			"Attachments" to "Resource attachment metadata and download URLs.",
			"Public" to "Unauthenticated public calendar, availability and booking request flows.",
			"System" to "Miscellaneous API endpoints.",
		)

		private val PUBLIC_API_PATHS = setOf(
			"/api/auth/login",
			"/api/onboarding/super-admin",
			"/api/onboarding/invitations/accept",
		)
	}
}

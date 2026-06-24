package com.calendary.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig(
	@Value("\${app.web.allowed-origins}") private val allowedOrigins: String,
) {
	@Bean
	fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

	// The frontend calls this API directly from the browser (its own public origin), not through
	// a same-origin proxy, so the browser needs an explicit CORS allow-list to read the response.
	@Bean
	fun corsConfigurationSource(): CorsConfigurationSource {
		val configuration = CorsConfiguration()
		configuration.allowedOrigins = allowedOrigins.split(",").map(String::trim)
		configuration.allowedMethods = listOf("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
		configuration.allowedHeaders = listOf("Content-Type", "Accept")
		configuration.allowCredentials = true
		val source = UrlBasedCorsConfigurationSource()
		source.registerCorsConfiguration("/**", configuration)
		return source
	}

	@Bean
	fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
		http {
			csrf { disable() }
			cors { configurationSource = corsConfigurationSource() }
			authorizeHttpRequests {
				authorize("/api/auth/login", permitAll)
				authorize("/api/onboarding/super-admin", permitAll)
				authorize("/api/onboarding/invitations/accept", permitAll)
				authorize("/swagger-ui/**", permitAll)
				authorize("/v3/api-docs/**", permitAll)
				authorize(anyRequest, permitAll)
			}
		}
		return http.build()
	}
}

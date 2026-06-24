package com.calendary.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.annotation.web.invoke
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.security.web.SecurityFilterChain

@Configuration
@EnableWebSecurity
class SecurityConfig {
	@Bean
	fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

	@Bean
	fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
		http {
			csrf { disable() }
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

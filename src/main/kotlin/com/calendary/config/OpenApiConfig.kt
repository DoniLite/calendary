package com.calendary.config

import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class OpenApiConfig {
	@Bean
	fun calendaryOpenApi(): OpenAPI =
		OpenAPI()
			.info(
				Info()
					.title("Calendary API")
					.version("0.1.0")
					.description("Personal calendar, task, project and collaboration server API."),
			)
}

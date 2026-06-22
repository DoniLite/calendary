package com.calendary.support

import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.DynamicPropertyRegistry
import org.springframework.test.context.DynamicPropertySource
import org.testcontainers.containers.PostgreSQLContainer

@AutoConfigureMockMvc
@SpringBootTest(
	properties = [
		"spring.datasource.hikari.connection-timeout=1000",
	],
)
abstract class PostgresIntegrationTest {
	companion object {
		@JvmStatic
		val postgres: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:18-alpine").apply {
			start()
		}

		@JvmStatic
		@DynamicPropertySource
		fun registerDatasourceProperties(registry: DynamicPropertyRegistry) {
			registry.add("spring.datasource.url", postgres::getJdbcUrl)
			registry.add("spring.datasource.username", postgres::getUsername)
			registry.add("spring.datasource.password", postgres::getPassword)
		}
	}
}

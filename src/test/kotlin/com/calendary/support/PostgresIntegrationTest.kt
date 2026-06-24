package com.calendary.support

import org.junit.jupiter.api.AfterEach
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.jdbc.core.JdbcTemplate
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
	@Autowired
	private lateinit var jdbcTemplate: JdbcTemplate

	@AfterEach
	fun resetDatabaseState() {
		// Some tests intentionally skip @Transactional to reproduce production's
		// per-request transaction boundaries, which commits data for real. Truncate
		// from `users` (cascading to every dependent table) so that data can never
		// leak into a later test, regardless of which test class runs next.
		jdbcTemplate.execute("truncate table users cascade")
	}

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

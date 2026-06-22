package com.calendary

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication

@ConfigurationPropertiesScan
@SpringBootApplication
class CalendaryApplication

fun main(args: Array<String>) {
	runApplication<CalendaryApplication>(*args)
}

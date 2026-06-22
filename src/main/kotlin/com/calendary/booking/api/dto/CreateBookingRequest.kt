package com.calendary.booking.api.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import java.time.Instant

data class CreateBookingRequest(
	@field:NotBlank
	val requesterName: String,

	@field:Email
	@field:NotBlank
	val requesterEmail: String,

	val message: String = "",
	val startsAt: Instant,
	val endsAt: Instant,
	val timezone: String = "UTC",
)

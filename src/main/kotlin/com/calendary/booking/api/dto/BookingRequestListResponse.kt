package com.calendary.booking.api.dto

import com.calendary.booking.domain.BookingRequest

data class BookingRequestListResponse(
	val items: List<BookingRequestResponse>,
)

fun List<BookingRequest>.toResponse(): BookingRequestListResponse =
	BookingRequestListResponse(items = map { it.toResponse() })

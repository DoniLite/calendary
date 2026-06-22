package com.calendary.common.api

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice
class ApiExceptionHandler {
	@ExceptionHandler(IllegalArgumentException::class)
	fun handleBadRequest(error: IllegalArgumentException): ResponseEntity<ApiError> =
		ResponseEntity
			.status(HttpStatus.BAD_REQUEST)
			.body(ApiError(code = "bad_request", message = error.message ?: "Bad request."))

	@ExceptionHandler(IllegalStateException::class)
	fun handleConflict(error: IllegalStateException): ResponseEntity<ApiError> =
		ResponseEntity
			.status(HttpStatus.CONFLICT)
			.body(ApiError(code = "conflict", message = error.message ?: "Conflict."))

	@ExceptionHandler(UnauthorizedException::class)
	fun handleUnauthorized(error: UnauthorizedException): ResponseEntity<ApiError> =
		ResponseEntity
			.status(HttpStatus.UNAUTHORIZED)
			.body(ApiError(code = "unauthorized", message = error.message ?: "Authentication required."))

	@ExceptionHandler(InvalidCredentialsException::class)
	fun handleInvalidCredentials(error: InvalidCredentialsException): ResponseEntity<ApiError> =
		ResponseEntity
			.status(HttpStatus.UNAUTHORIZED)
			.body(ApiError(code = "invalid_credentials", message = error.message ?: "Invalid email or password."))

	@ExceptionHandler(ForbiddenException::class)
	fun handleForbidden(error: ForbiddenException): ResponseEntity<ApiError> =
		ResponseEntity
			.status(HttpStatus.FORBIDDEN)
			.body(ApiError(code = "forbidden", message = error.message ?: "Forbidden."))

	@ExceptionHandler(MethodArgumentNotValidException::class)
	fun handleValidation(error: MethodArgumentNotValidException): ResponseEntity<ApiError> {
		val message = error.bindingResult.fieldErrors.firstOrNull()?.defaultMessage ?: "Request validation failed."
		return ResponseEntity
			.status(HttpStatus.BAD_REQUEST)
			.body(ApiError(code = "validation_error", message = message))
	}
}

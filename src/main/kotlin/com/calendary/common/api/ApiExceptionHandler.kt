package com.calendary.common.api

import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.context.request.WebRequest

@RestControllerAdvice
class ApiExceptionHandler {
	private val log = LoggerFactory.getLogger(ApiExceptionHandler::class.java)

	@ExceptionHandler(IllegalArgumentException::class)
	fun handleBadRequest(error: IllegalArgumentException, request: WebRequest): ResponseEntity<ApiError> {
		log.warn("Bad request on {}: {}", request.describeRequest(), error.message)
		return ResponseEntity
			.status(HttpStatus.BAD_REQUEST)
			.body(ApiError(code = "bad_request", message = error.message ?: "Bad request."))
	}

	@ExceptionHandler(IllegalStateException::class)
	fun handleConflict(error: IllegalStateException, request: WebRequest): ResponseEntity<ApiError> {
		log.warn("Conflict on {}: {}", request.describeRequest(), error.message)
		return ResponseEntity
			.status(HttpStatus.CONFLICT)
			.body(ApiError(code = "conflict", message = error.message ?: "Conflict."))
	}

	@ExceptionHandler(UnauthorizedException::class)
	fun handleUnauthorized(error: UnauthorizedException, request: WebRequest): ResponseEntity<ApiError> {
		log.info("Unauthorized on {}: {}", request.describeRequest(), error.message)
		return ResponseEntity
			.status(HttpStatus.UNAUTHORIZED)
			.body(ApiError(code = "unauthorized", message = error.message ?: "Authentication required."))
	}

	@ExceptionHandler(InvalidCredentialsException::class)
	fun handleInvalidCredentials(error: InvalidCredentialsException, request: WebRequest): ResponseEntity<ApiError> {
		log.info("Invalid credentials on {}: {}", request.describeRequest(), error.message)
		return ResponseEntity
			.status(HttpStatus.UNAUTHORIZED)
			.body(ApiError(code = "invalid_credentials", message = error.message ?: "Invalid email or password."))
	}

	@ExceptionHandler(ForbiddenException::class)
	fun handleForbidden(error: ForbiddenException, request: WebRequest): ResponseEntity<ApiError> {
		log.warn("Forbidden on {}: {}", request.describeRequest(), error.message)
		return ResponseEntity
			.status(HttpStatus.FORBIDDEN)
			.body(ApiError(code = "forbidden", message = error.message ?: "Forbidden."))
	}

	@ExceptionHandler(MethodArgumentNotValidException::class)
	fun handleValidation(error: MethodArgumentNotValidException, request: WebRequest): ResponseEntity<ApiError> {
		val message = error.bindingResult.fieldErrors.firstOrNull()?.defaultMessage ?: "Request validation failed."
		log.warn("Validation error on {}: {}", request.describeRequest(), message)
		return ResponseEntity
			.status(HttpStatus.BAD_REQUEST)
			.body(ApiError(code = "validation_error", message = message))
	}

	@ExceptionHandler(Exception::class)
	fun handleUnexpected(error: Exception, request: WebRequest): ResponseEntity<ApiError> {
		log.error("Unhandled error on {}: {}", request.describeRequest(), error.message, error)
		return ResponseEntity
			.status(HttpStatus.INTERNAL_SERVER_ERROR)
			.body(ApiError(code = "internal_error", message = "Something went wrong. Please try again."))
	}
}

private fun WebRequest.describeRequest(): String = getDescription(false)

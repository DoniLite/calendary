package com.calendary.common.api

class UnauthorizedException(message: String = "Authentication required.") : RuntimeException(message)

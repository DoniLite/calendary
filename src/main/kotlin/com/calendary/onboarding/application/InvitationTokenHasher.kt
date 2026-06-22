package com.calendary.onboarding.application

import java.security.MessageDigest
import java.util.HexFormat
import org.springframework.stereotype.Component

@Component
class InvitationTokenHasher {
	fun hash(rawToken: String): String {
		val digest = MessageDigest.getInstance("SHA-256").digest(rawToken.toByteArray(Charsets.UTF_8))
		return HexFormat.of().formatHex(digest)
	}
}

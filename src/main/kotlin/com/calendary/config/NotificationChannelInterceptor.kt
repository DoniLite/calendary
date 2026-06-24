package com.calendary.config

import com.calendary.common.api.UnauthorizedException
import org.springframework.messaging.Message
import org.springframework.messaging.MessageChannel
import org.springframework.messaging.simp.stomp.StompCommand
import org.springframework.messaging.simp.stomp.StompHeaderAccessor
import org.springframework.messaging.support.ChannelInterceptor
import org.springframework.stereotype.Component

@Component
class NotificationChannelInterceptor : ChannelInterceptor {
	override fun preSend(message: Message<*>, channel: MessageChannel): Message<*> {
		val accessor = StompHeaderAccessor.wrap(message)
		when (accessor.command) {
			StompCommand.CONNECT -> sessionUserId(accessor)
			StompCommand.SUBSCRIBE -> {
				val userId = sessionUserId(accessor)
				val destination = accessor.destination
				val destinationUserId = destination
					?.takeIf { it.startsWith(TOPIC_PREFIX) && it.endsWith(TOPIC_SUFFIX) }
					?.removePrefix(TOPIC_PREFIX)
					?.removeSuffix(TOPIC_SUFFIX)
				if (destinationUserId != userId) {
					throw UnauthorizedException("Cannot subscribe to another user's notifications.")
				}
			}
			else -> Unit
		}
		return message
	}

	private fun sessionUserId(accessor: StompHeaderAccessor): String =
		accessor.sessionAttributes?.get(SESSION_USER_ID_KEY) as? String
			?: throw UnauthorizedException("WebSocket connection requires an authenticated session.")

	companion object {
		private const val SESSION_USER_ID_KEY = "calendary.userId"
		private const val TOPIC_PREFIX = "/topic/users/"
		private const val TOPIC_SUFFIX = "/notifications"
	}
}

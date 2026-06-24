package com.calendary.config

import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig(
	private val notificationChannelInterceptor: NotificationChannelInterceptor,
) : WebSocketMessageBrokerConfigurer {
	override fun configureMessageBroker(registry: MessageBrokerRegistry) {
		registry.enableSimpleBroker("/topic")
		registry.setApplicationDestinationPrefixes("/app")
	}

	override fun registerStompEndpoints(registry: StompEndpointRegistry) {
		registry.addEndpoint("/ws/notifications")
			.setAllowedOriginPatterns("*")
			.addInterceptors(HttpSessionHandshakeInterceptor())
	}

	override fun configureClientInboundChannel(registration: ChannelRegistration) {
		registration.interceptors(notificationChannelInterceptor)
	}
}

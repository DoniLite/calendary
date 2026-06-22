package com.calendary.notifications.api.dto

import com.calendary.notifications.application.NotificationList

data class NotificationListResponse(
	val unreadCount: Long,
	val items: List<NotificationResponse>,
)

fun NotificationList.toResponse(): NotificationListResponse =
	NotificationListResponse(
		unreadCount = unreadCount,
		items = items.map { it.toResponse() },
	)

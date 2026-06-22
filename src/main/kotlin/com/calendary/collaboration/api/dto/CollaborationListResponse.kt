package com.calendary.collaboration.api.dto

import com.calendary.collaboration.domain.ResourceShare

data class CollaborationListResponse(
	val collaborations: List<CollaborationResponse>,
)

fun List<ResourceShare>.toResponse(): CollaborationListResponse =
	CollaborationListResponse(map { it.toResponse() })

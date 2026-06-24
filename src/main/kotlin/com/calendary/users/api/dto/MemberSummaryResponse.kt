package com.calendary.users.api.dto

import com.calendary.users.domain.UserAccount
import java.util.UUID

data class MemberSummaryResponse(
	val id: UUID,
	val email: String,
)

fun UserAccount.toSummary(): MemberSummaryResponse = MemberSummaryResponse(id = id, email = email)
